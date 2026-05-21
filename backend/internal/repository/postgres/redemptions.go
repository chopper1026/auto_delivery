package postgres

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"auto_delivery/backend/internal/domain"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type RedemptionsRepository struct {
	db *pgxpool.Pool
}

func NewRedemptionsRepository(db *pgxpool.Pool) *RedemptionsRepository {
	return &RedemptionsRepository{db: db}
}

func (r *RedemptionsRepository) ReserveRedemption(ctx context.Context, keyHash string, receiptHash string, receiptMask string, ip string, ua string) (domain.ReservedRedemption, error) {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return domain.ReservedRedemption{}, err
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
		return domain.ReservedRedemption{}, domain.ErrCardKeyNotRedeemable
	}
	if expiresAt.Valid && expiresAt.Time.Before(time.Now()) && cardStatus == "ACTIVE" {
		_, _ = tx.Exec(ctx, `UPDATE card_keys SET status = 'EXPIRED' WHERE id = $1`, cardID)
		return domain.ReservedRedemption{}, domain.ErrCardKeyNotRedeemable
	}
	if cardStatus != "ACTIVE" || goodsStatus != "ACTIVE" {
		return domain.ReservedRedemption{}, domain.ErrCardKeyNotRedeemable
	}

	var redemptionID string
	err = tx.QueryRow(ctx, `
		INSERT INTO redemptions (card_key_id, goods_id, receipt_token_hash, receipt_token_mask, ip_address, user_agent)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id::text
	`, cardID, goodsID, receiptHash, receiptMask, ip, ua).Scan(&redemptionID)
	if err != nil {
		return domain.ReservedRedemption{}, err
	}

	reserved := domain.ReservedRedemption{RedemptionID: redemptionID, CardID: cardID, GoodsType: goodsType}
	if goodsType == "FILE" {
		rows, err := tx.Query(ctx, `
			SELECT id::text, original_name, storage_path
			FROM goods_files
			WHERE reserved_by_card_key_id = $1 AND status = 'RESERVED'
			ORDER BY created_at ASC
			FOR UPDATE
		`, cardID)
		if err != nil {
			return domain.ReservedRedemption{}, err
		}
		for rows.Next() {
			var item domain.ReservedFile
			if err := rows.Scan(&item.ID, &item.OriginalName, &item.StoragePath); err != nil {
				rows.Close()
				return domain.ReservedRedemption{}, err
			}
			reserved.Files = append(reserved.Files, item)
		}
		rows.Close()
		if err := rows.Err(); err != nil {
			return domain.ReservedRedemption{}, err
		}
		if len(reserved.Files) == 0 {
			return domain.ReservedRedemption{}, domain.ErrReservedFilesNotFound
		}
	}

	if _, err := tx.Exec(ctx, `UPDATE card_keys SET status = 'REDEEMED', redeemed_at = now() WHERE id = $1`, cardID); err != nil {
		return domain.ReservedRedemption{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return domain.ReservedRedemption{}, err
	}
	return reserved, nil
}

func (r *RedemptionsRepository) FinalizeFileRedemption(ctx context.Context, reserved domain.ReservedRedemption, zipPath string, size int64) error {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	for _, file := range reserved.Files {
		if _, err := tx.Exec(ctx, `
			INSERT INTO redemption_files (redemption_id, goods_file_id, original_name)
			VALUES ($1, $2, $3)
		`, reserved.RedemptionID, file.ID, file.OriginalName); err != nil {
			return err
		}
	}
	tag, err := tx.Exec(ctx, `
		UPDATE goods_files
		SET status = 'REDEEMED', redeemed_by_redemption_id = $1, redeemed_at = now()
		WHERE reserved_by_card_key_id = $2 AND status = 'RESERVED'
	`, reserved.RedemptionID, reserved.CardID)
	if err != nil {
		return err
	}
	if int(tag.RowsAffected()) != len(reserved.Files) {
		return domain.ErrReservedFileCountChange
	}
	if _, err := tx.Exec(ctx, `UPDATE redemptions SET zip_path = $1, zip_size_bytes = $2 WHERE id = $3`, zipPath, size, reserved.RedemptionID); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (r *RedemptionsRepository) FailFileRedemption(ctx context.Context, redemptionID string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE redemptions
		SET download_state = 'AVAILABLE',
		    zip_path = NULL,
		    zip_size_bytes = NULL
		WHERE id = $1
	`, redemptionID)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil
	}
	return err
}
