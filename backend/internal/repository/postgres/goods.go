package postgres

import (
	"context"
	"fmt"
	"strings"

	"auto_delivery/backend/internal/domain"

	"github.com/jackc/pgx/v5/pgxpool"
)

type GoodsRepository struct {
	db *pgxpool.Pool
}

func NewGoodsRepository(db *pgxpool.Pool) *GoodsRepository {
	return &GoodsRepository{db: db}
}

func buildGoodsListWhere(params domain.ListGoodsParams) (string, []any) {
	conditions := []string{}
	args := []any{}
	if params.Query != "" {
		args = append(args, "%"+params.Query+"%")
		conditions = append(conditions, fmt.Sprintf("g.name ILIKE $%d", len(args)))
	}
	if params.Status != "" {
		args = append(args, params.Status)
		conditions = append(conditions, fmt.Sprintf("g.status = $%d", len(args)))
	}
	if len(conditions) == 0 {
		return "", args
	}
	return "WHERE " + strings.Join(conditions, " AND "), args
}

func totalPages(totalItems int, pageSize int) int {
	if pageSize < 1 {
		pageSize = 10
	}
	pages := (totalItems + pageSize - 1) / pageSize
	if pages < 1 {
		return 1
	}
	return pages
}

func goodsListQuery(where string) string {
	return fmt.Sprintf(`
		WITH file_counts AS (
			SELECT goods_id,
			       COUNT(*)::int AS total,
			       COUNT(*) FILTER (WHERE status = 'AVAILABLE')::int AS available,
			       COUNT(*) FILTER (WHERE status = 'RESERVED')::int AS reserved,
			       COUNT(*) FILTER (WHERE status = 'REDEEMED')::int AS redeemed
			FROM goods_files
			GROUP BY goods_id
		),
		card_counts AS (
			SELECT goods_id, COUNT(*)::int AS card_keys
			FROM card_keys
			GROUP BY goods_id
		),
		redemption_counts AS (
			SELECT goods_id, COUNT(*)::int AS redemptions
			FROM redemptions
			GROUP BY goods_id
		)
		SELECT g.id::text, g.name, g.type::text, COALESCE(g.text_content, ''), COALESCE(g.note, ''), g.status::text,
		       g.created_at, g.updated_at,
		       COALESCE(fc.total, 0), COALESCE(fc.available, 0), COALESCE(fc.reserved, 0), COALESCE(fc.redeemed, 0),
		       COALESCE(cc.card_keys, 0), COALESCE(rc.redemptions, 0)
		FROM goods g
		LEFT JOIN file_counts fc ON fc.goods_id = g.id
		LEFT JOIN card_counts cc ON cc.goods_id = g.id
		LEFT JOIN redemption_counts rc ON rc.goods_id = g.id
		%s
		ORDER BY g.created_at DESC
		LIMIT $%%d OFFSET $%%d
	`, where)
}

func cardGoodsOptionsQuery() string {
	return `
		WITH file_counts AS (
			SELECT goods_id,
			       COUNT(*)::int AS total,
			       COUNT(*) FILTER (WHERE status = 'AVAILABLE')::int AS available,
			       COUNT(*) FILTER (WHERE status = 'RESERVED')::int AS reserved,
			       COUNT(*) FILTER (WHERE status = 'REDEEMED')::int AS redeemed
			FROM goods_files
			GROUP BY goods_id
		)
		SELECT g.id::text, g.name, g.type::text, COALESCE(g.text_content, ''), COALESCE(g.note, ''),
		       g.status::text, g.created_at, g.updated_at,
		       COALESCE(fc.total, 0), COALESCE(fc.available, 0), COALESCE(fc.reserved, 0), COALESCE(fc.redeemed, 0),
		       0, 0
		FROM goods g
		LEFT JOIN file_counts fc ON fc.goods_id = g.id
		WHERE g.status = 'ACTIVE'
		  AND ($1 = '' OR g.name ILIKE $2 OR COALESCE(g.note, '') ILIKE $2)
		  AND (g.type = 'TEXT' OR COALESCE(fc.available, 0) > 0)
		ORDER BY g.created_at DESC
		LIMIT $3
	`
}

func (r *GoodsRepository) ListGoods(ctx context.Context, params domain.ListGoodsParams) (domain.PaginatedGoodsResponse, error) {
	where, args := buildGoodsListWhere(params)
	var totalItems int
	if err := r.db.QueryRow(ctx, `SELECT count(*) FROM goods g `+where, args...).Scan(&totalItems); err != nil {
		return domain.PaginatedGoodsResponse{}, err
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
	rows, err := r.db.Query(ctx, fmt.Sprintf(goodsListQuery(where), limitPlaceholder, offsetPlaceholder), queryArgs...)
	if err != nil {
		return domain.PaginatedGoodsResponse{}, err
	}
	defer rows.Close()

	items := []domain.Goods{}
	for rows.Next() {
		var item domain.Goods
		if err := rows.Scan(&item.ID, &item.Name, &item.Type, &item.TextContent, &item.Note, &item.Status, &item.CreatedAt, &item.UpdatedAt, &item.Inventory.Total, &item.Inventory.Available, &item.Inventory.Reserved, &item.Inventory.Redeemed, &item.Usage.CardKeys, &item.Usage.Redemptions); err != nil {
			return domain.PaginatedGoodsResponse{}, err
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return domain.PaginatedGoodsResponse{}, err
	}
	return domain.PaginatedGoodsResponse{
		Items:      items,
		Page:       params.Page,
		PageSize:   params.PageSize,
		TotalItems: totalItems,
		TotalPages: pages,
	}, nil
}

func (r *GoodsRepository) ListCardGoodsOptions(ctx context.Context, query string, limit int) ([]domain.Goods, error) {
	pattern := "%" + query + "%"
	rows, err := r.db.Query(ctx, cardGoodsOptionsQuery(), query, pattern, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []domain.Goods{}
	for rows.Next() {
		var item domain.Goods
		if err := rows.Scan(&item.ID, &item.Name, &item.Type, &item.TextContent, &item.Note, &item.Status, &item.CreatedAt, &item.UpdatedAt, &item.Inventory.Total, &item.Inventory.Available, &item.Inventory.Reserved, &item.Inventory.Redeemed, &item.Usage.CardKeys, &item.Usage.Redemptions); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}
