package postgres

import (
	"context"
	"errors"
	"time"

	"auto_delivery/backend/internal/domain"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type DownloadsRepository struct {
	db *pgxpool.Pool
}

func NewDownloadsRepository(db *pgxpool.Pool) *DownloadsRepository {
	return &DownloadsRepository{db: db}
}

func (r *DownloadsRepository) GetReceipt(ctx context.Context, receiptHash string) (domain.Receipt, error) {
	var receipt domain.Receipt
	err := r.db.QueryRow(ctx, `
		SELECT g.type::text, g.name, COALESCE(g.text_content, ''), COALESCE(g.note, ''), r.redeemed_at,
		       r.download_count > 0, c.file_quantity
		FROM redemptions r
		JOIN goods g ON g.id = r.goods_id
		JOIN card_keys c ON c.id = r.card_key_id
		WHERE r.receipt_token_hash = $1
	`, receiptHash).Scan(&receipt.Kind, &receipt.GoodsName, &receipt.TextContent, &receipt.GoodsNote, &receipt.RedeemedAt, &receipt.Downloaded, &receipt.FileQuantity)
	if err != nil {
		return domain.Receipt{}, err
	}
	return receipt, nil
}

func (r *DownloadsRepository) ClaimDownload(ctx context.Context, receiptHash string, claimHash string, claimExpiresAt time.Time, ip string, ua string) (domain.DownloadClaim, error) {
	var redemptionID, state, zipPath, goodsName string
	var count int
	err := r.db.QueryRow(ctx, `
		SELECT r.id::text, r.download_state::text, r.download_count, COALESCE(r.zip_path, ''), g.name
		FROM redemptions r
		JOIN goods g ON g.id = r.goods_id
		WHERE r.receipt_token_hash = $1
	`, receiptHash).Scan(&redemptionID, &state, &count, &zipPath, &goodsName)
	if err != nil {
		_, _ = r.db.Exec(ctx, `
			INSERT INTO download_logs (receipt_token_hash, ip_address, user_agent, result)
			VALUES ($1, $2, $3, 'NOT_FOUND')
		`, receiptHash, ip, ua)
		return domain.DownloadClaim{}, err
	}
	if zipPath == "" {
		_, _ = r.db.Exec(ctx, `
			INSERT INTO download_logs (redemption_id, receipt_token_hash, ip_address, user_agent, result)
			VALUES ($1, $2, $3, $4, 'ERROR')
		`, redemptionID, receiptHash, ip, ua)
		return domain.DownloadClaim{}, errors.New("download unavailable")
	}
	if count > 0 || state == "DOWNLOADED" {
		_, _ = r.db.Exec(ctx, `
			INSERT INTO download_logs (redemption_id, receipt_token_hash, ip_address, user_agent, result)
			VALUES ($1, $2, $3, $4, 'ALREADY_DOWNLOADED')
		`, redemptionID, receiptHash, ip, ua)
		return domain.DownloadClaim{}, domain.ErrAlreadyDownloaded
	}
	tag, err := r.db.Exec(ctx, `
		UPDATE redemptions
		SET download_state = 'IN_PROGRESS', download_claim_token_hash = $1, download_claim_expires_at = $2
		WHERE id = $3
		  AND download_count = 0
		  AND (
		    download_state = 'AVAILABLE'
		    OR (download_state = 'IN_PROGRESS' AND download_claim_expires_at < now())
		  )
	`, claimHash, claimExpiresAt, redemptionID)
	if err != nil {
		return domain.DownloadClaim{}, err
	}
	if tag.RowsAffected() == 0 {
		_, _ = r.db.Exec(ctx, `
			INSERT INTO download_logs (redemption_id, receipt_token_hash, ip_address, user_agent, result)
			VALUES ($1, $2, $3, $4, 'ALREADY_DOWNLOADED')
		`, redemptionID, receiptHash, ip, ua)
		return domain.DownloadClaim{}, domain.ErrAlreadyDownloaded
	}
	return domain.DownloadClaim{
		RedemptionID: redemptionID,
		ZipPath:      zipPath,
		GoodsName:    goodsName,
	}, nil
}

func (r *DownloadsRepository) CompleteDownloadClaim(ctx context.Context, redemptionID string, claimHash string, ip string, ua string) error {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
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

func (r *DownloadsRepository) ReleaseDownloadClaim(ctx context.Context, redemptionID string, claimHash string, ip string, ua string) error {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
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
