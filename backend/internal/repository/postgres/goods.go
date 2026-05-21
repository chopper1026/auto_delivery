package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"auto_delivery/backend/internal/domain"

	"github.com/jackc/pgx/v5"
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
		WITH paged_goods AS (
			SELECT g.id, g.name, g.type, g.text_content, g.note, g.status, g.created_at, g.updated_at
			FROM goods g
			%s
			ORDER BY g.created_at DESC
			LIMIT $%%d OFFSET $%%d
		),
		file_counts AS (
			SELECT goods_files.goods_id,
			       COUNT(*)::int AS total,
			       COUNT(*) FILTER (WHERE status = 'AVAILABLE')::int AS available,
			       COUNT(*) FILTER (WHERE status = 'RESERVED')::int AS reserved,
			       COUNT(*) FILTER (WHERE status = 'REDEEMED')::int AS redeemed
			FROM goods_files
			JOIN paged_goods pg ON pg.id = goods_files.goods_id
			GROUP BY goods_files.goods_id
		),
		card_counts AS (
			SELECT card_keys.goods_id, COUNT(*)::int AS card_keys
			FROM card_keys
			JOIN paged_goods pg ON pg.id = card_keys.goods_id
			GROUP BY card_keys.goods_id
		),
		redemption_counts AS (
			SELECT redemptions.goods_id, COUNT(*)::int AS redemptions
			FROM redemptions
			JOIN paged_goods pg ON pg.id = redemptions.goods_id
			GROUP BY redemptions.goods_id
		)
		SELECT g.id::text, g.name, g.type::text, COALESCE(g.text_content, ''), COALESCE(g.note, ''), g.status::text,
		       g.created_at, g.updated_at,
		       COALESCE(fc.total, 0), COALESCE(fc.available, 0), COALESCE(fc.reserved, 0), COALESCE(fc.redeemed, 0),
		       COALESCE(cc.card_keys, 0), COALESCE(rc.redemptions, 0)
		FROM paged_goods g
		LEFT JOIN file_counts fc ON fc.goods_id = g.id
		LEFT JOIN card_counts cc ON cc.goods_id = g.id
		LEFT JOIN redemption_counts rc ON rc.goods_id = g.id
		ORDER BY g.created_at DESC
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

func (r *GoodsRepository) CreateGoods(ctx context.Context, input domain.CreateGoodsInput) (string, error) {
	var id string
	err := r.db.QueryRow(ctx, `
		INSERT INTO goods (name, type, text_content, note)
		VALUES ($1, $2, $3, $4)
		RETURNING id::text
	`, input.Name, input.Type, emptyToNil(input.TextContent), emptyToNil(input.Note)).Scan(&id)
	return id, err
}

func (r *GoodsRepository) UpdateGoodsStatus(ctx context.Context, id string, status string) error {
	tag, err := r.db.Exec(ctx, `UPDATE goods SET status = $1, updated_at = now() WHERE id = $2`, status, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrGoodsNotFound
	}
	return nil
}

func (r *GoodsRepository) DeleteGoods(ctx context.Context, id string) ([]string, error) {
	count, err := queryInt(ctx, r.db, `SELECT count(*) FROM card_keys WHERE goods_id = $1`, id)
	if err != nil {
		return nil, err
	}
	if count > 0 {
		return nil, domain.ErrGoodsHasCardKeys
	}
	rows, err := r.db.Query(ctx, `SELECT storage_path FROM goods_files WHERE goods_id = $1`, id)
	if err != nil {
		return nil, err
	}
	paths := []string{}
	for rows.Next() {
		var path string
		if err := rows.Scan(&path); err != nil {
			rows.Close()
			return nil, err
		}
		paths = append(paths, path)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, err
	}
	tag, err := r.db.Exec(ctx, `DELETE FROM goods WHERE id = $1`, id)
	if err != nil {
		return nil, err
	}
	if tag.RowsAffected() == 0 {
		return nil, domain.ErrGoodsNotFound
	}
	return paths, nil
}

func (r *GoodsRepository) RegisterGoodsFiles(ctx context.Context, goodsID string, files []domain.GoodsFileUpload) error {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var goodsType string
	if err := tx.QueryRow(ctx, `SELECT type::text FROM goods WHERE id = $1`, goodsID).Scan(&goodsType); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.ErrGoodsNotFound
		}
		return err
	}
	if goodsType != "FILE" {
		return domain.ErrGoodsNotFileType
	}
	for _, item := range files {
		if _, err := tx.Exec(ctx, `
			INSERT INTO goods_files (goods_id, original_name, stored_name, storage_path, size_bytes, mime_type, sha256)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
		`, goodsID, item.OriginalName, item.StoredName, item.StoragePath, item.SizeBytes, item.MimeType, item.SHA256); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func (r *GoodsRepository) ListGoodsFileExportEntries(ctx context.Context, goodsID string, scope string) ([]domain.GoodsFileExportEntry, error) {
	rows, err := r.db.Query(ctx, `
		SELECT f.original_name, f.storage_path, f.status::text, COALESCE(c.key_mask, rc.key_mask, ''), f.reserved_at, f.redeemed_at, g.name
		FROM goods_files f
		JOIN goods g ON g.id = f.goods_id
		LEFT JOIN card_keys c ON c.id = f.reserved_by_card_key_id
		LEFT JOIN redemptions r ON r.id = f.redeemed_by_redemption_id
		LEFT JOIN card_keys rc ON rc.id = r.card_key_id
		WHERE f.goods_id = $1 AND (
			($2 = 'UNREDEEMED' AND f.status IN ('AVAILABLE', 'RESERVED')) OR
			($2 = 'REDEEMED' AND f.status = 'REDEEMED')
		)
		ORDER BY f.original_name ASC, f.created_at ASC
	`, goodsID, scope)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	entries := []domain.GoodsFileExportEntry{}
	for rows.Next() {
		var item domain.GoodsFileExportEntry
		var reservedAt, redeemedAt sql.NullTime
		if err := rows.Scan(&item.OriginalName, &item.StoragePath, &item.Status, &item.CardKeyMask, &reservedAt, &redeemedAt, &item.GoodsName); err != nil {
			return nil, err
		}
		item.ReservedAt = nullTimePtr(reservedAt)
		item.RedeemedAt = nullTimePtr(redeemedAt)
		entries = append(entries, item)
	}
	return entries, rows.Err()
}

func emptyToNil(value string) any {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	return value
}
