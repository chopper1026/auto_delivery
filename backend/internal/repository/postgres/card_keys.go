package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"auto_delivery/backend/internal/domain"

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
