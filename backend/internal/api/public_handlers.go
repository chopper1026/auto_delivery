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
	if !a.consumeRateLimit(c.Request.Context(), "public-redeem", clientIP(c), 20, 15*time.Minute) {
		jsonError(c, http.StatusTooManyRequests, "too many redemption attempts")
		return
	}
	var req redeemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		jsonError(c, http.StatusBadRequest, "invalid redeem request")
		return
	}
	result, err := a.redeemCardKey(c.Request.Context(), security.NormalizeCardKey(req.CardKey), clientIP(c), userAgent(c))
	if err != nil {
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
	if !a.consumeRateLimit(c.Request.Context(), "public-download", clientIP(c), 30, 15*time.Minute) {
		jsonError(c, http.StatusTooManyRequests, "too many download attempts")
		return
	}
	claim, err := a.claimDownload(c.Request.Context(), c.Param("token"), clientIP(c), userAgent(c))
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
		_ = a.releaseDownloadClaim(c.Request.Context(), claim.redemptionID, claim.claimToken, clientIP(c), userAgent(c))
		jsonError(c, http.StatusInternalServerError, "download file is missing")
		return
	}
	defer file.Close()
	info, err := file.Stat()
	if err != nil {
		_ = a.releaseDownloadClaim(c.Request.Context(), claim.redemptionID, claim.claimToken, clientIP(c), userAgent(c))
		jsonError(c, http.StatusInternalServerError, "download file is missing")
		return
	}
	c.Header("Content-Type", "application/zip")
	c.Header("Content-Length", strconv.FormatInt(info.Size(), 10))
	c.Header("Content-Disposition", `attachment; filename="`+claim.filename+`"`)
	if _, err := io.Copy(c.Writer, file); err != nil {
		_ = a.releaseDownloadClaim(c.Request.Context(), claim.redemptionID, claim.claimToken, clientIP(c), userAgent(c))
		return
	}
	_ = a.completeDownloadClaim(c.Request.Context(), claim.redemptionID, claim.claimToken, clientIP(c), userAgent(c))
}

type redeemResult struct {
	receiptToken string
	goodsType    string
}

func (a *App) redeemCardKey(ctx context.Context, cardKey string, ip string, ua string) (redeemResult, error) {
	if !security.IsCardKey(cardKey) {
		return redeemResult{}, errors.New("invalid card key")
	}
	keyHash := security.LookupHash(cardKey, a.cfg.SecretPepper)
	receiptToken, err := security.RandomToken()
	if err != nil {
		return redeemResult{}, err
	}
	receiptTokenHash := security.LookupHash(receiptToken, a.cfg.SecretPepper)

	tx, err := a.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return redeemResult{}, err
	}
	defer tx.Rollback(ctx)

	var cardID, goodsID, goodsType, goodsStatus, cardStatus, goodsName string
	var expiresAt sql.NullTime
	err = tx.QueryRow(ctx, `
		SELECT c.id::text, c.goods_id::text, c.goods_type::text, c.status::text, c.expires_at, g.status::text, g.name
		FROM card_keys c
		JOIN goods g ON g.id = c.goods_id
		WHERE c.key_hash = $1
		FOR UPDATE OF c
	`, keyHash).Scan(&cardID, &goodsID, &goodsType, &cardStatus, &expiresAt, &goodsStatus, &goodsName)
	if err != nil {
		return redeemResult{}, err
	}
	if expiresAt.Valid && expiresAt.Time.Before(time.Now()) && cardStatus == "ACTIVE" {
		_, _ = tx.Exec(ctx, `UPDATE card_keys SET status = 'EXPIRED' WHERE id = $1`, cardID)
		return redeemResult{}, errors.New("card key expired")
	}
	if cardStatus != "ACTIVE" || goodsStatus != "ACTIVE" {
		return redeemResult{}, errors.New("card key not redeemable")
	}

	var redemptionID string
	err = tx.QueryRow(ctx, `
		INSERT INTO redemptions (card_key_id, goods_id, receipt_token_hash, receipt_token_mask, ip_address, user_agent)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id::text
	`, cardID, goodsID, receiptTokenHash, security.MaskSecret(receiptToken), ip, ua).Scan(&redemptionID)
	if err != nil {
		return redeemResult{}, err
	}

	if goodsType == "FILE" {
		rows, err := tx.Query(ctx, `
			SELECT id::text, original_name, storage_path
			FROM goods_files
			WHERE reserved_by_card_key_id = $1 AND status = 'RESERVED'
			ORDER BY created_at ASC
		`, cardID)
		if err != nil {
			return redeemResult{}, err
		}
		type fileRef struct {
			id, originalName, path string
		}
		files := []fileRef{}
		for rows.Next() {
			var item fileRef
			if err := rows.Scan(&item.id, &item.originalName, &item.path); err != nil {
				rows.Close()
				return redeemResult{}, err
			}
			files = append(files, item)
		}
		rows.Close()
		if len(files) == 0 {
			return redeemResult{}, errors.New("reserved files not found")
		}
		zipPath := filepath.Join(a.cfg.StorageRoot, "zips", redemptionID+".zip")
		zipEntries := make([]storage.ZipEntry, 0, len(files))
		for _, file := range files {
			zipEntries = append(zipEntries, storage.ZipEntry{Path: file.path, EntryName: file.originalName})
		}
		size, err := storage.CreateZipFromFiles(zipEntries, zipPath)
		if err != nil {
			return redeemResult{}, err
		}
		for _, file := range files {
			if _, err := tx.Exec(ctx, `
				INSERT INTO redemption_files (redemption_id, goods_file_id, original_name)
				VALUES ($1, $2, $3)
			`, redemptionID, file.id, file.originalName); err != nil {
				return redeemResult{}, err
			}
		}
		_, err = tx.Exec(ctx, `
			UPDATE goods_files
			SET status = 'REDEEMED', redeemed_by_redemption_id = $1, redeemed_at = now()
			WHERE reserved_by_card_key_id = $2 AND status = 'RESERVED'
		`, redemptionID, cardID)
		if err != nil {
			return redeemResult{}, err
		}
		_, err = tx.Exec(ctx, `UPDATE redemptions SET zip_path = $1, zip_size_bytes = $2 WHERE id = $3`, zipPath, size, redemptionID)
		if err != nil {
			return redeemResult{}, err
		}
	}

	if _, err := tx.Exec(ctx, `UPDATE card_keys SET status = 'REDEEMED', redeemed_at = now() WHERE id = $1`, cardID); err != nil {
		return redeemResult{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return redeemResult{}, err
	}
	return redeemResult{receiptToken: receiptToken, goodsType: goodsType}, nil
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
	if count > 0 || state == "DOWNLOADED" || state == "IN_PROGRESS" {
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
		WHERE id = $3 AND download_state = 'AVAILABLE' AND download_count = 0
	`, security.LookupHash(claimToken, a.cfg.SecretPepper), time.Now().Add(a.cfg.DownloadClaimTTL), redemptionID)
	if err != nil {
		return downloadClaim{}, err
	}
	if tag.RowsAffected() == 0 {
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
