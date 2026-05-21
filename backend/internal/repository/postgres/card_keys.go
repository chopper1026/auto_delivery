package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"auto_delivery/backend/internal/domain"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type CardKeysRepository struct {
	db *pgxpool.Pool
}

func NewCardKeysRepository(db *pgxpool.Pool) *CardKeysRepository {
	return &CardKeysRepository{db: db}
}

func buildCardKeyListWhere(params domain.ListCardKeysParams) (string, []any) {
	conditions := []string{}
	args := []any{}
	if params.Query != "" {
		args = append(args, "%"+params.Query+"%")
		conditions = append(conditions, fmt.Sprintf("(g.name ILIKE $%d OR c.key_mask ILIKE $%d)", len(args), len(args)))
	}
	if params.Status != "" {
		switch params.Status {
		case "ACTIVE":
			conditions = append(conditions, "(c.status = 'ACTIVE' AND (c.expires_at IS NULL OR c.expires_at >= now()))")
		case "EXPIRED":
			conditions = append(conditions, "(c.status = 'EXPIRED' OR (c.status = 'ACTIVE' AND c.expires_at < now()))")
		default:
			args = append(args, params.Status)
			conditions = append(conditions, fmt.Sprintf("c.status = $%d", len(args)))
		}
	}
	if len(conditions) == 0 {
		return "", args
	}
	return "WHERE " + strings.Join(conditions, " AND "), args
}

func nullTimePtr(value sql.NullTime) *time.Time {
	if !value.Valid {
		return nil
	}
	return &value.Time
}

func (r *CardKeysRepository) ListCardKeys(ctx context.Context, params domain.ListCardKeysParams) (domain.PaginatedCardKeysResponse, error) {
	where, args := buildCardKeyListWhere(params)
	var totalItems int
	if err := r.db.QueryRow(ctx, `
		SELECT count(*)
		FROM card_keys c
		JOIN goods g ON g.id = c.goods_id
		`+where, args...).Scan(&totalItems); err != nil {
		return domain.PaginatedCardKeysResponse{}, err
	}
	pages := totalPages(totalItems, params.PageSize)
	if params.Page > pages {
		params.Page = pages
	}
	offset := (params.Page - 1) * params.PageSize
	queryArgs := append([]any{}, args...)
	queryArgs = append(queryArgs, params.PageSize, offset)
	limitPlaceholder := len(args) + 1
	offsetPlaceholder := len(args) + 2
	rows, err := r.db.Query(ctx, fmt.Sprintf(`
		SELECT c.id::text, c.key_mask, c.goods_id::text, g.name, c.goods_type::text, c.file_quantity,
		       c.expires_at, c.status::text, c.created_at, c.redeemed_at, c.deleted_at
		FROM card_keys c
		JOIN goods g ON g.id = c.goods_id
		%s
		ORDER BY c.created_at DESC
		LIMIT $%d OFFSET $%d
	`, where, limitPlaceholder, offsetPlaceholder), queryArgs...)
	if err != nil {
		return domain.PaginatedCardKeysResponse{}, err
	}
	defer rows.Close()

	items := []domain.CardKey{}
	for rows.Next() {
		var item domain.CardKey
		var expiresAt, redeemedAt, deletedAt sql.NullTime
		if err := rows.Scan(&item.ID, &item.KeyMask, &item.GoodsID, &item.GoodsName, &item.GoodsType, &item.FileQuantity, &expiresAt, &item.Status, &item.CreatedAt, &redeemedAt, &deletedAt); err != nil {
			return domain.PaginatedCardKeysResponse{}, err
		}
		item.ExpiresAt = nullTimePtr(expiresAt)
		item.RedeemedAt = nullTimePtr(redeemedAt)
		item.DeletedAt = nullTimePtr(deletedAt)
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return domain.PaginatedCardKeysResponse{}, err
	}
	return domain.PaginatedCardKeysResponse{
		Items:      items,
		Page:       params.Page,
		PageSize:   params.PageSize,
		TotalItems: totalItems,
		TotalPages: pages,
	}, nil
}

func (r *CardKeysRepository) CreateCardKey(ctx context.Context, input domain.CreateCardKeyInput) (domain.GeneratedCardKey, error) {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return domain.GeneratedCardKey{}, err
	}
	defer tx.Rollback(ctx)

	var goodsID, goodsType, goodsStatus string
	err = tx.QueryRow(ctx, `SELECT id::text, type::text, status::text FROM goods WHERE id = $1 FOR UPDATE`, input.GoodsID).Scan(&goodsID, &goodsType, &goodsStatus)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.GeneratedCardKey{}, domain.ErrGoodsNotFound
		}
		return domain.GeneratedCardKey{}, err
	}
	if goodsStatus != "ACTIVE" {
		return domain.GeneratedCardKey{}, domain.ErrGoodsDisabled
	}
	quantity := 0
	if goodsType == "FILE" {
		quantity = input.FileQuantity
		if quantity < 1 {
			return domain.GeneratedCardKey{}, domain.ErrNotEnoughInventory
		}
	}

	var cardID string
	var createdAt time.Time
	err = tx.QueryRow(ctx, `
		INSERT INTO card_keys (key_hash, key_mask, goods_id, goods_type, file_quantity, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id::text, created_at
	`, input.KeyHash, input.KeyMask, goodsID, goodsType, quantity, input.ExpiresAt).Scan(&cardID, &createdAt)
	if err != nil {
		return domain.GeneratedCardKey{}, err
	}

	if goodsType == "FILE" {
		rows, err := tx.Query(ctx, `
			SELECT id::text
			FROM goods_files
			WHERE goods_id = $1 AND status = 'AVAILABLE'
			ORDER BY created_at ASC
			LIMIT $2
			FOR UPDATE SKIP LOCKED
		`, goodsID, quantity)
		if err != nil {
			return domain.GeneratedCardKey{}, err
		}
		fileIDs := []string{}
		for rows.Next() {
			var id string
			if err := rows.Scan(&id); err != nil {
				rows.Close()
				return domain.GeneratedCardKey{}, err
			}
			fileIDs = append(fileIDs, id)
		}
		rows.Close()
		if err := rows.Err(); err != nil {
			return domain.GeneratedCardKey{}, err
		}
		if len(fileIDs) != quantity {
			return domain.GeneratedCardKey{}, domain.ErrNotEnoughInventory
		}
		reserved := 0
		for _, fileID := range fileIDs {
			tag, err := tx.Exec(ctx, `
				UPDATE goods_files
				SET status = 'RESERVED', reserved_by_card_key_id = $1, reserved_at = now()
				WHERE id = $2 AND status = 'AVAILABLE'
			`, cardID, fileID)
			if err != nil {
				return domain.GeneratedCardKey{}, err
			}
			reserved += int(tag.RowsAffected())
		}
		if reserved != quantity {
			return domain.GeneratedCardKey{}, domain.ErrNotEnoughInventory
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return domain.GeneratedCardKey{}, err
	}
	return domain.GeneratedCardKey{
		ID:        cardID,
		KeyMask:   input.KeyMask,
		ExpiresAt: input.ExpiresAt,
		CreatedAt: createdAt,
	}, nil
}

func (r *CardKeysRepository) DeleteCardKey(ctx context.Context, id string) error {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var status string
	err = tx.QueryRow(ctx, `SELECT status::text FROM card_keys WHERE id = $1 FOR UPDATE`, id).Scan(&status)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.ErrCardKeyNotFound
		}
		return err
	}
	if status == "REDEEMED" {
		return domain.ErrCardKeyRedeemed
	}
	if _, err := tx.Exec(ctx, `
		UPDATE goods_files
		SET status = 'AVAILABLE', reserved_by_card_key_id = NULL, reserved_at = NULL
		WHERE reserved_by_card_key_id = $1 AND status = 'RESERVED'
	`, id); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `UPDATE card_keys SET status = 'DELETED', deleted_at = now() WHERE id = $1`, id); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
