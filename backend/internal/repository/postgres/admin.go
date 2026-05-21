package postgres

import (
	"context"
	"time"

	"auto_delivery/backend/internal/domain"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AdminRepository struct {
	db *pgxpool.Pool
}

func NewAdminRepository(db *pgxpool.Pool) *AdminRepository {
	return &AdminRepository{db: db}
}

func (r *AdminRepository) CountAdminUsers(ctx context.Context) (int, error) {
	return queryInt(ctx, r.db, `SELECT count(*) FROM admin_users`)
}

func (r *AdminRepository) CreateAdminUser(ctx context.Context, username string, passwordHash string) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO admin_users (username, password_hash)
		VALUES ($1, $2)
	`, username, passwordHash)
	return err
}

func (r *AdminRepository) FindAdminByUsername(ctx context.Context, username string) (domain.AdminUser, error) {
	var admin domain.AdminUser
	err := r.db.QueryRow(ctx, `
		SELECT id::text, username, password_hash FROM admin_users WHERE username = $1
	`, username).Scan(&admin.ID, &admin.Username, &admin.PasswordHash)
	return admin, err
}

func (r *AdminRepository) CreateAdminSession(ctx context.Context, session domain.AdminSessionCreate) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO admin_sessions (token_hash, csrf_token_hash, admin_user_id, ip_address, user_agent, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, session.TokenHash, session.CSRFTokenHash, session.AdminUserID, session.IPAddress, session.UserAgent, session.ExpiresAt)
	return err
}

func (r *AdminRepository) UpdateAdminLastLogin(ctx context.Context, adminID string) error {
	_, err := r.db.Exec(ctx, `UPDATE admin_users SET last_login_at = now(), updated_at = now() WHERE id = $1`, adminID)
	return err
}

func (r *AdminRepository) RefreshAdminSessionCSRF(ctx context.Context, tokenHash string, csrfHash string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE admin_sessions SET csrf_token_hash = $1 WHERE token_hash = $2
	`, csrfHash, tokenHash)
	return err
}

func (r *AdminRepository) DeleteAdminSession(ctx context.Context, tokenHash string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM admin_sessions WHERE token_hash = $1`, tokenHash)
	return err
}

func (r *AdminRepository) FindAdminSession(ctx context.Context, tokenHash string) (domain.AdminContext, error) {
	var admin domain.AdminContext
	err := r.db.QueryRow(ctx, `
		SELECT u.id::text, u.username, s.csrf_token_hash
		FROM admin_sessions s
		JOIN admin_users u ON u.id = s.admin_user_id
		WHERE s.token_hash = $1 AND s.expires_at > now()
	`, tokenHash).Scan(&admin.ID, &admin.Username, &admin.CSRFHash)
	return admin, err
}

func (r *AdminRepository) WriteAudit(ctx context.Context, entry domain.AdminAuditEntry) error {
	var entity any
	if entry.EntityID != "" {
		entity = entry.EntityID
	}
	var metadata any
	if entry.Metadata != "" {
		metadata = entry.Metadata
	}
	_, err := r.db.Exec(ctx, `
		INSERT INTO admin_audit_logs (admin_user_id, action, entity_type, entity_id, ip_address, user_agent, metadata_json)
		VALUES ($1, $2, $3, $4, $5, $6, CASE WHEN $7::text IS NULL THEN NULL ELSE $7::jsonb END)
	`, entry.AdminID, entry.Action, entry.EntityType, entity, entry.IPAddress, entry.UserAgent, metadata)
	return err
}

func adminActiveCardKeysWhereClause() string {
	return "status = 'ACTIVE' AND (expires_at IS NULL OR expires_at >= now())"
}

func adminExpiredCardKeysWhereClause() string {
	return "status = 'EXPIRED' OR (status = 'ACTIVE' AND expires_at < now())"
}

func queryInt(ctx context.Context, db interface {
	QueryRow(context.Context, string, ...any) pgx.Row
}, sql string, args ...any) (int, error) {
	var value int
	if err := db.QueryRow(ctx, sql, args...).Scan(&value); err != nil {
		return 0, err
	}
	return value, nil
}

func (r *AdminRepository) LoadOverviewCounts(ctx context.Context, today time.Time) (domain.OverviewCounts, error) {
	var counts domain.OverviewCounts
	var err error
	counts.TotalCardKeys, err = queryInt(ctx, r.db, `SELECT count(*) FROM card_keys`)
	if err != nil {
		return domain.OverviewCounts{}, err
	}
	counts.ActiveCardKeys, err = queryInt(ctx, r.db, `SELECT count(*) FROM card_keys WHERE `+adminActiveCardKeysWhereClause())
	if err != nil {
		return domain.OverviewCounts{}, err
	}
	counts.RedeemedCardKeys, err = queryInt(ctx, r.db, `SELECT count(*) FROM card_keys WHERE status = 'REDEEMED'`)
	if err != nil {
		return domain.OverviewCounts{}, err
	}
	counts.ExpiredCardKeys, err = queryInt(ctx, r.db, `SELECT count(*) FROM card_keys WHERE `+adminExpiredCardKeysWhereClause())
	if err != nil {
		return domain.OverviewCounts{}, err
	}
	counts.TodaysRedemptions, err = queryInt(ctx, r.db, `SELECT count(*) FROM redemptions WHERE redeemed_at >= $1`, today)
	if err != nil {
		return domain.OverviewCounts{}, err
	}
	counts.TodaysDownloads, err = queryInt(ctx, r.db, `SELECT count(*) FROM download_logs WHERE result = 'SUCCESS' AND created_at >= $1`, today)
	if err != nil {
		return domain.OverviewCounts{}, err
	}
	return counts, nil
}

func (r *AdminRepository) ListFileInventory(ctx context.Context) ([]domain.FileInventoryStat, error) {
	rows, err := r.db.Query(ctx, `
		SELECT g.id::text, g.name,
		       COUNT(f.id)::int AS total,
		       COUNT(f.id) FILTER (WHERE f.status = 'AVAILABLE')::int AS available,
		       COUNT(f.id) FILTER (WHERE f.status = 'RESERVED')::int AS reserved,
		       COUNT(f.id) FILTER (WHERE f.status = 'REDEEMED')::int AS redeemed
		FROM goods g
		LEFT JOIN goods_files f ON f.goods_id = g.id
		WHERE g.type = 'FILE'
		GROUP BY g.id
		ORDER BY g.created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []domain.FileInventoryStat{}
	for rows.Next() {
		var item domain.FileInventoryStat
		if err := rows.Scan(&item.GoodsID, &item.GoodsName, &item.Total, &item.Available, &item.Reserved, &item.Redeemed); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func adminRedemptionTrendQuery() string {
	return `
		SELECT date_trunc('day', redeemed_at AT TIME ZONE 'UTC')::date AS day, count(*)::int
		FROM redemptions
		WHERE redeemed_at >= $1
		GROUP BY day
	`
}

func adminSuccessfulDownloadTrendQuery() string {
	return `
		SELECT date_trunc('day', created_at AT TIME ZONE 'UTC')::date AS day, count(*)::int
		FROM download_logs
		WHERE result = 'SUCCESS' AND created_at >= $1
		GROUP BY day
	`
}

func (r *AdminRepository) LoadRedemptionTrendCounts(ctx context.Context, since time.Time) (map[string]int, error) {
	return r.loadTrendCounts(ctx, adminRedemptionTrendQuery(), since)
}

func (r *AdminRepository) LoadSuccessfulDownloadTrendCounts(ctx context.Context, since time.Time) (map[string]int, error) {
	return r.loadTrendCounts(ctx, adminSuccessfulDownloadTrendQuery(), since)
}

func (r *AdminRepository) loadTrendCounts(ctx context.Context, query string, since time.Time) (map[string]int, error) {
	rows, err := r.db.Query(ctx, query, since)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	values := map[string]int{}
	for rows.Next() {
		var day time.Time
		var count int
		if err := rows.Scan(&day, &count); err != nil {
			return nil, err
		}
		values[day.Format("2006-01-02")] = count
	}
	return values, rows.Err()
}

func adminLogSearchArgs(query string) (string, string) {
	if query == "" {
		return "", "%%"
	}
	return query, "%" + query + "%"
}

func (r *AdminRepository) CountRedemptionLogs(ctx context.Context, query string) (int, error) {
	raw, pattern := adminLogSearchArgs(query)
	return queryInt(ctx, r.db, `
		SELECT count(*)
		FROM redemptions r
		WHERE ($1 = '' OR r.ip_address ILIKE $2 OR r.user_agent ILIKE $2)
	`, raw, pattern)
}

func (r *AdminRepository) ListRedemptionLogs(ctx context.Context, params domain.LogsListParams) ([]domain.RedemptionLogItem, error) {
	raw, pattern := adminLogSearchArgs(params.Query)
	rows, err := r.db.Query(ctx, `
		SELECT r.id::text, r.redeemed_at, c.key_mask, g.name, r.ip_address, r.user_agent
		FROM redemptions r
		JOIN card_keys c ON c.id = r.card_key_id
		JOIN goods g ON g.id = r.goods_id
		WHERE ($1 = '' OR r.ip_address ILIKE $2 OR r.user_agent ILIKE $2)
		ORDER BY r.redeemed_at DESC
		LIMIT $3 OFFSET $4
	`, raw, pattern, params.PageSize, (params.Page-1)*params.PageSize)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []domain.RedemptionLogItem{}
	for rows.Next() {
		var item domain.RedemptionLogItem
		if err := rows.Scan(&item.ID, &item.RedeemedAt, &item.CardKeyMask, &item.GoodsName, &item.IPAddress, &item.UserAgent); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *AdminRepository) CountDownloadLogs(ctx context.Context, query string) (int, error) {
	raw, pattern := adminLogSearchArgs(query)
	return queryInt(ctx, r.db, `
		SELECT count(*)
		FROM download_logs d
		WHERE ($1 = '' OR d.ip_address ILIKE $2 OR d.user_agent ILIKE $2)
	`, raw, pattern)
}

func (r *AdminRepository) ListDownloadLogs(ctx context.Context, params domain.LogsListParams) ([]domain.DownloadLogItem, error) {
	raw, pattern := adminLogSearchArgs(params.Query)
	rows, err := r.db.Query(ctx, `
		SELECT d.id::text, d.created_at, d.result::text, COALESCE(c.key_mask, ''), COALESCE(g.name, ''), d.ip_address, d.user_agent
		FROM download_logs d
		LEFT JOIN redemptions r ON r.id = d.redemption_id
		LEFT JOIN card_keys c ON c.id = r.card_key_id
		LEFT JOIN goods g ON g.id = r.goods_id
		WHERE ($1 = '' OR d.ip_address ILIKE $2 OR d.user_agent ILIKE $2)
		ORDER BY d.created_at DESC
		LIMIT $3 OFFSET $4
	`, raw, pattern, params.PageSize, (params.Page-1)*params.PageSize)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []domain.DownloadLogItem{}
	for rows.Next() {
		var item domain.DownloadLogItem
		if err := rows.Scan(&item.ID, &item.CreatedAt, &item.Result, &item.CardKeyMask, &item.GoodsName, &item.IPAddress, &item.UserAgent); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *AdminRepository) CountAdminAuditLogs(ctx context.Context, query string) (int, error) {
	raw, pattern := adminLogSearchArgs(query)
	return queryInt(ctx, r.db, `
		SELECT count(*)
		FROM admin_audit_logs l
		WHERE ($1 = '' OR l.ip_address ILIKE $2 OR l.user_agent ILIKE $2 OR l.action ILIKE $2 OR l.entity_type ILIKE $2)
	`, raw, pattern)
}

func (r *AdminRepository) ListAdminAuditLogs(ctx context.Context, params domain.LogsListParams) ([]domain.AdminLogItem, error) {
	raw, pattern := adminLogSearchArgs(params.Query)
	rows, err := r.db.Query(ctx, `
		SELECT l.id::text, l.created_at, l.action, l.entity_type, COALESCE(l.entity_id::text, ''), COALESCE(u.username, ''),
		       l.ip_address, l.user_agent, COALESCE(l.metadata_json::text, '')
		FROM admin_audit_logs l
		LEFT JOIN admin_users u ON u.id = l.admin_user_id
		WHERE ($1 = '' OR l.ip_address ILIKE $2 OR l.user_agent ILIKE $2 OR l.action ILIKE $2 OR l.entity_type ILIKE $2)
		ORDER BY l.created_at DESC
		LIMIT $3 OFFSET $4
	`, raw, pattern, params.PageSize, (params.Page-1)*params.PageSize)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []domain.AdminLogItem{}
	for rows.Next() {
		var item domain.AdminLogItem
		if err := rows.Scan(&item.ID, &item.CreatedAt, &item.Action, &item.EntityType, &item.EntityID, &item.Username, &item.IPAddress, &item.UserAgent, &item.Metadata); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}
