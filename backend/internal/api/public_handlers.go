package api

import (
	"context"
	"database/sql"
	"errors"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"auto_delivery/backend/internal/security"
	"auto_delivery/backend/internal/storage"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
)

type redeemRequest struct {
	CardKey string `json:"cardKey"`
}

func (a *App) handleRedeem(c *gin.Context) {
	if !a.consumeRateLimit(c.Request.Context(), "public-redeem", a.clientIP(c), 20, 15*time.Minute) {
		jsonError(c, http.StatusTooManyRequests, "too many redemption attempts")
		return
	}
	var req redeemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		jsonError(c, http.StatusBadRequest, "invalid redeem request")
		return
	}
	result, err := a.redeemCardKey(c.Request.Context(), security.NormalizeCardKey(req.CardKey), a.clientIP(c), userAgent(c))
	if err != nil {
		if errors.Is(err, errPrepareRedemptionFiles) {
			jsonError(c, http.StatusInternalServerError, "failed to prepare redemption files")
			return
		}
		jsonError(c, http.StatusBadRequest, "card key is not redeemable")
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"receiptToken": result.receiptToken,
		"receiptPath":  "/receipt/" + result.receiptToken,
		"goodsType":    result.goodsType,
	})
}

func (a *App) handleReceipt(c *gin.Context) {
	receipt, err := a.getReceipt(c.Request.Context(), c.Param("token"))
	if err != nil {
		jsonError(c, http.StatusNotFound, "receipt not found")
		return
	}
	c.JSON(http.StatusOK, receipt)
}

func (a *App) handleReceiptStatus(c *gin.Context) {
	receipt, err := a.getReceipt(c.Request.Context(), c.Param("token"))
	if err != nil {
		jsonError(c, http.StatusNotFound, "receipt not found")
		return
	}
	c.JSON(http.StatusOK, gin.H{"kind": receipt.Kind, "downloaded": receipt.Downloaded})
}

func (a *App) handleDownload(c *gin.Context) {
	if !a.consumeRateLimit(c.Request.Context(), "public-download", a.clientIP(c), 30, 15*time.Minute) {
		jsonError(c, http.StatusTooManyRequests, "too many download attempts")
		return
	}
	claim, err := a.claimDownload(c.Request.Context(), c.Param("token"), a.clientIP(c), userAgent(c))
	if err != nil {
		if errors.Is(err, errAlreadyDownloaded) {
			c.Redirect(http.StatusFound, "/download/already-downloaded?receipt="+c.Param("token"))
			return
		}
		jsonError(c, http.StatusNotFound, "download not found")
		return
	}
	file, err := os.Open(claim.zipPath)
	if err != nil {
		_ = a.releaseDownloadClaim(c.Request.Context(), claim.redemptionID, claim.claimToken, a.clientIP(c), userAgent(c))
		jsonError(c, http.StatusInternalServerError, "download file is missing")
		return
	}
	defer file.Close()
	info, err := file.Stat()
	if err != nil {
		_ = a.releaseDownloadClaim(c.Request.Context(), claim.redemptionID, claim.claimToken, a.clientIP(c), userAgent(c))
		jsonError(c, http.StatusInternalServerError, "download file is missing")
		return
	}
	c.Header("Content-Type", "application/zip")
	c.Header("Content-Length", strconv.FormatInt(info.Size(), 10))
	c.Header("Content-Disposition", `attachment; filename="`+claim.filename+`"`)
	if _, err := io.Copy(c.Writer, file); err != nil {
		_ = a.releaseDownloadClaim(c.Request.Context(), claim.redemptionID, claim.claimToken, a.clientIP(c), userAgent(c))
		return
	}
	_ = a.completeDownloadClaim(c.Request.Context(), claim.redemptionID, claim.claimToken, a.clientIP(c), userAgent(c))
}

type redeemResult struct {
	receiptToken string
	goodsType    string
}

var errPrepareRedemptionFiles = errors.New("failed to prepare redemption files")

func (a *App) redeemCardKey(ctx context.Context, cardKey string, ip string, ua string) (redeemResult, error) {
	if !security.IsCardKey(cardKey) {
		return redeemResult{}, errors.New("invalid card key")
	}
	receiptToken, err := security.RandomToken()
	if err != nil {
		return redeemResult{}, err
	}
	receiptTokenHash := security.LookupHash(receiptToken, a.cfg.SecretPepper)
	reserved, err := a.reserveRedemption(ctx, cardKey, receiptToken, receiptTokenHash, ip, ua)
	if err != nil {
		return redeemResult{}, err
	}
	if reserved.goodsType == "FILE" {
		if err := a.finalizeFileRedemption(ctx, reserved); err != nil {
			_ = a.failFileRedemption(ctx, reserved)
			return redeemResult{}, errPrepareRedemptionFiles
		}
	}
	return redeemResult{receiptToken: receiptToken, goodsType: reserved.goodsType}, nil
}

type reservedFile struct {
	id           string
	originalName string
	path         string
}

type reservedRedemption struct {
	redemptionID string
	cardID       string
	goodsType    string
	files        []reservedFile
}

func (a *App) reserveRedemption(ctx context.Context, cardKey string, receiptToken string, receiptTokenHash string, ip string, ua string) (reservedRedemption, error) {
	keyHash := security.LookupHash(cardKey, a.cfg.SecretPepper)

	tx, err := a.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return reservedRedemption{}, err
	}
	defer tx.Rollback(ctx)

	var cardID, goodsID, goodsType, goodsStatus, cardStatus string
	var expiresAt sql.NullTime
	err = tx.QueryRow(ctx, `
		SELECT c.id::text, c.goods_id::text, c.goods_type::text, c.status::text, c.expires_at, g.status::text
		FROM card_keys c
		JOIN goods g ON g.id = c.goods_id
		WHERE c.key_hash = $1
		FOR UPDATE OF c
	`, keyHash).Scan(&cardID, &goodsID, &goodsType, &cardStatus, &expiresAt, &goodsStatus)
	if err != nil {
		return reservedRedemption{}, err
	}
	if expiresAt.Valid && expiresAt.Time.Before(time.Now()) && cardStatus == "ACTIVE" {
		_, _ = tx.Exec(ctx, `UPDATE card_keys SET status = 'EXPIRED' WHERE id = $1`, cardID)
		return reservedRedemption{}, errors.New("card key expired")
	}
	if cardStatus != "ACTIVE" || goodsStatus != "ACTIVE" {
		return reservedRedemption{}, errors.New("card key not redeemable")
	}

	var redemptionID string
	err = tx.QueryRow(ctx, `
		INSERT INTO redemptions (card_key_id, goods_id, receipt_token_hash, receipt_token_mask, ip_address, user_agent)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id::text
	`, cardID, goodsID, receiptTokenHash, security.MaskSecret(receiptToken), ip, ua).Scan(&redemptionID)
	if err != nil {
		return reservedRedemption{}, err
	}

	reserved := reservedRedemption{redemptionID: redemptionID, cardID: cardID, goodsType: goodsType}
	if goodsType == "FILE" {
		rows, err := tx.Query(ctx, `
			SELECT id::text, original_name, storage_path
			FROM goods_files
			WHERE reserved_by_card_key_id = $1 AND status = 'RESERVED'
			ORDER BY created_at ASC
			FOR UPDATE
		`, cardID)
		if err != nil {
			return reservedRedemption{}, err
		}
		for rows.Next() {
			var item reservedFile
			if err := rows.Scan(&item.id, &item.originalName, &item.path); err != nil {
				rows.Close()
				return reservedRedemption{}, err
			}
			reserved.files = append(reserved.files, item)
		}
		rows.Close()
		if len(reserved.files) == 0 {
			return reservedRedemption{}, errors.New("reserved files not found")
		}
	}

	if _, err := tx.Exec(ctx, `UPDATE card_keys SET status = 'REDEEMED', redeemed_at = now() WHERE id = $1`, cardID); err != nil {
		return reservedRedemption{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return reservedRedemption{}, err
	}
	return reserved, nil
}

func (a *App) finalizeFileRedemption(ctx context.Context, reserved reservedRedemption) error {
	zipPath := filepath.Join(a.cfg.StorageRoot, "zips", reserved.redemptionID+".zip")
	zipEntries := make([]storage.ZipEntry, 0, len(reserved.files))
	for _, file := range reserved.files {
		zipEntries = append(zipEntries, storage.ZipEntry{Path: file.path, EntryName: file.originalName})
	}
	size, err := storage.CreateZipFromFiles(zipEntries, zipPath)
	if err != nil {
		storage.RemovePath(zipPath)
		return err
	}
	committed := false
	defer func() {
		if !committed {
			storage.RemovePath(zipPath)
		}
	}()

	tx, err := a.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	for _, file := range reserved.files {
		if _, err := tx.Exec(ctx, `
			INSERT INTO redemption_files (redemption_id, goods_file_id, original_name)
			VALUES ($1, $2, $3)
		`, reserved.redemptionID, file.id, file.originalName); err != nil {
			return err
		}
	}
	tag, err := tx.Exec(ctx, `
		UPDATE goods_files
		SET status = 'REDEEMED', redeemed_by_redemption_id = $1, redeemed_at = now()
		WHERE reserved_by_card_key_id = $2 AND status = 'RESERVED'
	`, reserved.redemptionID, reserved.cardID)
	if err != nil {
		return err
	}
	if int(tag.RowsAffected()) != len(reserved.files) {
		return errors.New("reserved file count changed")
	}
	if _, err := tx.Exec(ctx, `UPDATE redemptions SET zip_path = $1, zip_size_bytes = $2 WHERE id = $3`, zipPath, size, reserved.redemptionID); err != nil {
		return err
	}
	if err := tx.Commit(ctx); err != nil {
		return err
	}
	committed = true
	return nil
}

func (a *App) failFileRedemption(ctx context.Context, reserved reservedRedemption) error {
	_, err := a.db.Exec(ctx, `
		UPDATE redemptions
		SET download_state = 'AVAILABLE',
		    zip_path = NULL,
		    zip_size_bytes = NULL
		WHERE id = $1
	`, reserved.redemptionID)
	return err
}

func (a *App) getReceipt(ctx context.Context, token string) (Receipt, error) {
	var receipt Receipt
	err := a.db.QueryRow(ctx, `
		SELECT g.type::text, g.name, COALESCE(g.text_content, ''), COALESCE(g.note, ''), r.redeemed_at,
		       r.download_count > 0, c.file_quantity
		FROM redemptions r
		JOIN goods g ON g.id = r.goods_id
		JOIN card_keys c ON c.id = r.card_key_id
		WHERE r.receipt_token_hash = $1
	`, security.LookupHash(token, a.cfg.SecretPepper)).Scan(&receipt.Kind, &receipt.GoodsName, &receipt.TextContent, &receipt.GoodsNote, &receipt.RedeemedAt, &receipt.Downloaded, &receipt.FileQuantity)
	if err != nil {
		return Receipt{}, err
	}
	return receipt, nil
}

var errAlreadyDownloaded = errors.New("already downloaded")

type downloadClaim struct {
	redemptionID string
	claimToken   string
	zipPath      string
	filename     string
}

func (a *App) claimDownload(ctx context.Context, receiptToken string, ip string, ua string) (downloadClaim, error) {
	receiptHash := security.LookupHash(receiptToken, a.cfg.SecretPepper)
	var redemptionID, state, zipPath, goodsName string
	var count int
	err := a.db.QueryRow(ctx, `
		SELECT r.id::text, r.download_state::text, r.download_count, COALESCE(r.zip_path, ''), g.name
		FROM redemptions r
		JOIN goods g ON g.id = r.goods_id
		WHERE r.receipt_token_hash = $1
	`, receiptHash).Scan(&redemptionID, &state, &count, &zipPath, &goodsName)
	if err != nil {
		_, _ = a.db.Exec(ctx, `
			INSERT INTO download_logs (receipt_token_hash, ip_address, user_agent, result)
			VALUES ($1, $2, $3, 'NOT_FOUND')
		`, receiptHash, ip, ua)
		return downloadClaim{}, err
	}
	if zipPath == "" {
		_, _ = a.db.Exec(ctx, `
			INSERT INTO download_logs (redemption_id, receipt_token_hash, ip_address, user_agent, result)
			VALUES ($1, $2, $3, $4, 'ERROR')
		`, redemptionID, receiptHash, ip, ua)
		return downloadClaim{}, errors.New("download unavailable")
	}
	if count > 0 || state == "DOWNLOADED" {
		_, _ = a.db.Exec(ctx, `
			INSERT INTO download_logs (redemption_id, receipt_token_hash, ip_address, user_agent, result)
			VALUES ($1, $2, $3, $4, 'ALREADY_DOWNLOADED')
		`, redemptionID, receiptHash, ip, ua)
		return downloadClaim{}, errAlreadyDownloaded
	}
	claimToken, err := security.RandomToken()
	if err != nil {
		return downloadClaim{}, err
	}
	tag, err := a.db.Exec(ctx, `
		UPDATE redemptions
		SET download_state = 'IN_PROGRESS', download_claim_token_hash = $1, download_claim_expires_at = $2
		WHERE id = $3
		  AND download_count = 0
		  AND (
		    download_state = 'AVAILABLE'
		    OR (download_state = 'IN_PROGRESS' AND download_claim_expires_at < now())
		  )
	`, security.LookupHash(claimToken, a.cfg.SecretPepper), time.Now().Add(a.cfg.DownloadClaimTTL), redemptionID)
	if err != nil {
		return downloadClaim{}, err
	}
	if tag.RowsAffected() == 0 {
		_, _ = a.db.Exec(ctx, `
			INSERT INTO download_logs (redemption_id, receipt_token_hash, ip_address, user_agent, result)
			VALUES ($1, $2, $3, $4, 'ALREADY_DOWNLOADED')
		`, redemptionID, receiptHash, ip, ua)
		return downloadClaim{}, errAlreadyDownloaded
	}
	return downloadClaim{
		redemptionID: redemptionID,
		claimToken:   claimToken,
		zipPath:      zipPath,
		filename:     storage.SanitizeEntryName(goodsName) + ".zip",
	}, nil
}

func (a *App) completeDownloadClaim(ctx context.Context, redemptionID string, claimToken string, ip string, ua string) error {
	claimHash := security.LookupHash(claimToken, a.cfg.SecretPepper)
	tx, err := a.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	var receiptHash string
	if err := tx.QueryRow(ctx, `SELECT receipt_token_hash FROM redemptions WHERE id = $1`, redemptionID).Scan(&receiptHash); err != nil {
		return err
	}
	tag, err := tx.Exec(ctx, `
		UPDATE redemptions
		SET download_state = 'DOWNLOADED', download_count = download_count + 1,
		    download_claim_token_hash = NULL, download_claim_expires_at = NULL, first_downloaded_at = now()
		WHERE id = $1 AND download_state = 'IN_PROGRESS' AND download_claim_token_hash = $2 AND download_count = 0
	`, redemptionID, claimHash)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return errors.New("download claim not active")
	}
	_, err = tx.Exec(ctx, `
		INSERT INTO download_logs (redemption_id, receipt_token_hash, ip_address, user_agent, result)
		VALUES ($1, $2, $3, $4, 'SUCCESS')
	`, redemptionID, receiptHash, ip, ua)
	if err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (a *App) releaseDownloadClaim(ctx context.Context, redemptionID string, claimToken string, ip string, ua string) error {
	claimHash := security.LookupHash(claimToken, a.cfg.SecretPepper)
	tx, err := a.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	var receiptHash string
	if err := tx.QueryRow(ctx, `SELECT receipt_token_hash FROM redemptions WHERE id = $1`, redemptionID).Scan(&receiptHash); err != nil {
		return err
	}
	tag, err := tx.Exec(ctx, `
		UPDATE redemptions
		SET download_state = 'AVAILABLE', download_claim_token_hash = NULL, download_claim_expires_at = NULL
		WHERE id = $1 AND download_state = 'IN_PROGRESS' AND download_claim_token_hash = $2
	`, redemptionID, claimHash)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return errors.New("download claim not active")
	}
	_, err = tx.Exec(ctx, `
		INSERT INTO download_logs (redemption_id, receipt_token_hash, ip_address, user_agent, result)
		VALUES ($1, $2, $3, $4, 'ERROR')
	`, redemptionID, receiptHash, ip, ua)
	if err != nil {
		return err
	}
	return tx.Commit(ctx)
}
