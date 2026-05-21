package api

import (
	"context"
	"database/sql"
	"errors"
	"math"
	"net/http"
	"net/url"
	"strings"
	"time"

	"auto_delivery/backend/internal/domain"
	"auto_delivery/backend/internal/security"
	"auto_delivery/backend/internal/service"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
)

type loginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func (a *App) handleAdminLogin(c *gin.Context) {
	if !a.consumeRateLimit(c.Request.Context(), "admin-login", a.clientIP(c), 10, 15*time.Minute) {
		jsonError(c, http.StatusTooManyRequests, "too many login attempts")
		return
	}
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		jsonError(c, http.StatusBadRequest, "invalid login request")
		return
	}
	var adminID, username, passwordHash string
	err := a.db.QueryRow(c.Request.Context(), `
		SELECT id::text, username, password_hash FROM admin_users WHERE username = $1
	`, strings.TrimSpace(req.Username)).Scan(&adminID, &username, &passwordHash)
	if err != nil {
		jsonError(c, http.StatusUnauthorized, "invalid username or password")
		return
	}
	ok, err := security.VerifyPassword(req.Password, passwordHash)
	if err != nil || !ok {
		jsonError(c, http.StatusUnauthorized, "invalid username or password")
		return
	}
	token, err := security.RandomToken()
	if err != nil {
		jsonError(c, http.StatusInternalServerError, "failed to create session")
		return
	}
	csrfToken, err := security.RandomToken()
	if err != nil {
		jsonError(c, http.StatusInternalServerError, "failed to create session")
		return
	}
	expiresAt := time.Now().Add(a.cfg.SessionTTL)
	_, err = a.db.Exec(c.Request.Context(), `
		INSERT INTO admin_sessions (token_hash, csrf_token_hash, admin_user_id, ip_address, user_agent, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, security.LookupHash(token, a.cfg.SecretPepper), security.LookupHash(csrfToken, a.cfg.SecretPepper), adminID, a.clientIP(c), userAgent(c), expiresAt)
	if err != nil {
		jsonError(c, http.StatusInternalServerError, "failed to create session")
		return
	}
	_, _ = a.db.Exec(c.Request.Context(), `UPDATE admin_users SET last_login_at = now(), updated_at = now() WHERE id = $1`, adminID)
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     a.cfg.SessionCookieName,
		Value:    token,
		Path:     "/",
		Expires:  expiresAt,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   a.secureCookies(),
	})
	c.JSON(http.StatusOK, gin.H{"admin": gin.H{"id": adminID, "username": username}, "csrfToken": csrfToken})
}

func (a *App) secureCookies() bool {
	return a.cfg.ForceSecureCookies || strings.HasPrefix(a.cfg.AppBaseURL, "https://")
}

func (a *App) handleAdminSession(c *gin.Context) {
	admin := currentAdmin(c)
	csrf, err := security.RandomToken()
	if err != nil {
		jsonError(c, http.StatusInternalServerError, "failed to refresh csrf token")
		return
	}
	token, _ := c.Cookie(a.cfg.SessionCookieName)
	_, err = a.db.Exec(c.Request.Context(), `
		UPDATE admin_sessions SET csrf_token_hash = $1 WHERE token_hash = $2
	`, security.LookupHash(csrf, a.cfg.SecretPepper), security.LookupHash(token, a.cfg.SecretPepper))
	if err != nil {
		jsonError(c, http.StatusInternalServerError, "failed to refresh session")
		return
	}
	c.JSON(http.StatusOK, gin.H{"admin": gin.H{"id": admin.ID, "username": admin.Username}, "csrfToken": csrf})
}

func (a *App) handleAdminLogout(c *gin.Context) {
	token, _ := c.Cookie(a.cfg.SessionCookieName)
	_, _ = a.db.Exec(c.Request.Context(), `DELETE FROM admin_sessions WHERE token_hash = $1`, security.LookupHash(token, a.cfg.SecretPepper))
	http.SetCookie(c.Writer, &http.Cookie{Name: a.cfg.SessionCookieName, Value: "", Path: "/", MaxAge: -1, HttpOnly: true, SameSite: http.SameSiteLaxMode, Secure: a.secureCookies()})
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (a *App) handleOverview(c *gin.Context) {
	overview, err := a.loadOverview(c.Request.Context(), time.Now())
	if err != nil {
		jsonError(c, http.StatusInternalServerError, "failed to load overview")
		return
	}
	c.JSON(http.StatusOK, overview)
}

func activeCardKeysWhereClause() string {
	return "status = 'ACTIVE' AND (expires_at IS NULL OR expires_at >= now())"
}

func expiredCardKeysWhereClause() string {
	return "status = 'EXPIRED' OR (status = 'ACTIVE' AND expires_at < now())"
}

func startOfLocalDay(now time.Time) time.Time {
	return time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
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

func (a *App) loadOverview(ctx context.Context, now time.Time) (OverviewResponse, error) {
	today := startOfLocalDay(now)
	trendStart := today.AddDate(0, 0, -6)

	totalCardKeys, err := queryInt(ctx, a.db, `SELECT count(*) FROM card_keys`)
	if err != nil {
		return OverviewResponse{}, err
	}
	activeCardKeys, err := queryInt(ctx, a.db, `SELECT count(*) FROM card_keys WHERE `+activeCardKeysWhereClause())
	if err != nil {
		return OverviewResponse{}, err
	}
	redeemedCardKeys, err := queryInt(ctx, a.db, `SELECT count(*) FROM card_keys WHERE status = 'REDEEMED'`)
	if err != nil {
		return OverviewResponse{}, err
	}
	expiredCardKeys, err := queryInt(ctx, a.db, `SELECT count(*) FROM card_keys WHERE `+expiredCardKeysWhereClause())
	if err != nil {
		return OverviewResponse{}, err
	}
	todaysRedemptions, err := queryInt(ctx, a.db, `SELECT count(*) FROM redemptions WHERE redeemed_at >= $1`, today)
	if err != nil {
		return OverviewResponse{}, err
	}
	todaysDownloads, err := queryInt(ctx, a.db, `SELECT count(*) FROM download_logs WHERE result = 'SUCCESS' AND created_at >= $1`, today)
	if err != nil {
		return OverviewResponse{}, err
	}
	fileInventory, err := a.loadFileInventory(ctx)
	if err != nil {
		return OverviewResponse{}, err
	}
	redemptionCounts, err := a.loadRedemptionTrendCounts(ctx, trendStart)
	if err != nil {
		return OverviewResponse{}, err
	}
	downloadCounts, err := a.loadSuccessfulDownloadTrendCounts(ctx, trendStart)
	if err != nil {
		return OverviewResponse{}, err
	}

	return OverviewResponse{
		TotalCardKeys:     totalCardKeys,
		ActiveCardKeys:    activeCardKeys,
		RedeemedCardKeys:  redeemedCardKeys,
		ExpiredCardKeys:   expiredCardKeys,
		TodaysRedemptions: todaysRedemptions,
		TodaysDownloads:   todaysDownloads,
		FileInventory:     fileInventory,
		CardKeyStatus:     buildCardKeyStatusDistribution(activeCardKeys, redeemedCardKeys, expiredCardKeys),
		DeliveryTrend:     buildDeliveryTrendDays(now, redemptionCounts, downloadCounts),
	}, nil
}

func (a *App) loadFileInventory(ctx context.Context) ([]FileInventoryStat, error) {
	rows, err := a.db.Query(ctx, `
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
	items := []FileInventoryStat{}
	for rows.Next() {
		var item FileInventoryStat
		if err := rows.Scan(&item.GoodsID, &item.GoodsName, &item.Total, &item.Available, &item.Reserved, &item.Redeemed); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func redemptionTrendQuery() string {
	return `
		SELECT date_trunc('day', redeemed_at AT TIME ZONE 'UTC')::date AS day, count(*)::int
		FROM redemptions
		WHERE redeemed_at >= $1
		GROUP BY day
	`
}

func successfulDownloadTrendQuery() string {
	return `
		SELECT date_trunc('day', created_at AT TIME ZONE 'UTC')::date AS day, count(*)::int
		FROM download_logs
		WHERE result = 'SUCCESS' AND created_at >= $1
		GROUP BY day
	`
}

func (a *App) loadRedemptionTrendCounts(ctx context.Context, since time.Time) (map[string]int, error) {
	rows, err := a.db.Query(ctx, redemptionTrendQuery(), since)
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

func (a *App) loadSuccessfulDownloadTrendCounts(ctx context.Context, since time.Time) (map[string]int, error) {
	rows, err := a.db.Query(ctx, successfulDownloadTrendQuery(), since)
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

func buildCardKeyStatusDistribution(active int, redeemed int, expired int) CardKeyStatusDistribution {
	total := active + redeemed + expired
	return CardKeyStatusDistribution{
		Active:          active,
		Redeemed:        redeemed,
		Expired:         expired,
		Total:           total,
		ActivePercent:   percent(active, total),
		RedeemedPercent: percent(redeemed, total),
		ExpiredPercent:  percent(expired, total),
	}
}

func percent(value int, total int) int {
	if total <= 0 {
		return 0
	}
	return int(math.Round(float64(value) / float64(total) * 100))
}

func startOfUTCDay(value time.Time) time.Time {
	year, month, day := value.UTC().Date()
	return time.Date(year, month, day, 0, 0, 0, 0, time.UTC)
}

func buildDeliveryTrendDays(now time.Time, redemptions map[string]int, downloads map[string]int) []DeliveryTrendDay {
	today := startOfUTCDay(now)
	buckets := make([]DeliveryTrendDay, 0, 7)
	for index := 6; index >= 0; index-- {
		day := today.AddDate(0, 0, -index)
		key := day.Format("2006-01-02")
		buckets = append(buckets, DeliveryTrendDay{
			DateKey:     key,
			Label:       key[5:],
			Redemptions: redemptions[key],
			Downloads:   downloads[key],
		})
	}
	return buckets
}

func (a *App) handleLogs(c *gin.Context) {
	params, err := parseLogsListParams(c.Request.URL.Query())
	if err != nil {
		jsonError(c, http.StatusBadRequest, err.Error())
		return
	}
	totalItems, items, err := a.loadLogs(c.Request.Context(), params)
	if err != nil {
		jsonError(c, http.StatusInternalServerError, "failed to load logs")
		return
	}
	c.JSON(http.StatusOK, LogsResponse{
		Type:       params.Type,
		Items:      items,
		Page:       params.Page,
		PageSize:   params.PageSize,
		TotalItems: totalItems,
		TotalPages: totalPages(totalItems, params.PageSize),
	})
}

type logsListParams struct {
	Type     string
	Query    string
	Page     int
	PageSize int
}

func parseLogsListParams(values url.Values) (logsListParams, error) {
	params := logsListParams{Type: "redemptions", Page: 1, PageSize: 10}
	logType := strings.TrimSpace(values.Get("type"))
	if logType != "" {
		switch logType {
		case "redemptions", "downloads", "admin":
			params.Type = logType
		default:
			return logsListParams{}, errors.New("type must be redemptions, downloads, or admin")
		}
	}
	params.Query = strings.TrimSpace(values.Get("q"))
	params.Page = parsePositiveInt(values.Get("page"), 1, 1000000)
	params.PageSize = parsePositiveInt(values.Get("pageSize"), 10, 100)
	return params, nil
}

func logSearchArgs(query string) (string, string) {
	if query == "" {
		return "", "%%"
	}
	return query, "%" + query + "%"
}

func (a *App) loadLogs(ctx context.Context, params logsListParams) (int, any, error) {
	switch params.Type {
	case "downloads":
		total, err := a.countDownloadLogs(ctx, params.Query)
		if err != nil {
			return 0, nil, err
		}
		params.Page = clampPage(params.Page, total, params.PageSize)
		items, err := a.listDownloadLogs(ctx, params)
		return total, items, err
	case "admin":
		total, err := a.countAdminAuditLogs(ctx, params.Query)
		if err != nil {
			return 0, nil, err
		}
		params.Page = clampPage(params.Page, total, params.PageSize)
		items, err := a.listAdminAuditLogs(ctx, params)
		return total, items, err
	default:
		total, err := a.countRedemptionLogs(ctx, params.Query)
		if err != nil {
			return 0, nil, err
		}
		params.Page = clampPage(params.Page, total, params.PageSize)
		items, err := a.listRedemptionLogs(ctx, params)
		return total, items, err
	}
}

func clampPage(page int, totalItems int, pageSize int) int {
	pages := totalPages(totalItems, pageSize)
	if page < 1 {
		return 1
	}
	if page > pages {
		return pages
	}
	return page
}

func (a *App) countRedemptionLogs(ctx context.Context, query string) (int, error) {
	raw, pattern := logSearchArgs(query)
	return queryInt(ctx, a.db, `
		SELECT count(*)
		FROM redemptions r
		WHERE ($1 = '' OR r.ip_address ILIKE $2 OR r.user_agent ILIKE $2)
	`, raw, pattern)
}

func (a *App) listRedemptionLogs(ctx context.Context, params logsListParams) ([]RedemptionLogItem, error) {
	raw, pattern := logSearchArgs(params.Query)
	rows, err := a.db.Query(ctx, `
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
	items := []RedemptionLogItem{}
	for rows.Next() {
		var item RedemptionLogItem
		if err := rows.Scan(&item.ID, &item.RedeemedAt, &item.CardKeyMask, &item.GoodsName, &item.IPAddress, &item.UserAgent); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (a *App) countDownloadLogs(ctx context.Context, query string) (int, error) {
	raw, pattern := logSearchArgs(query)
	return queryInt(ctx, a.db, `
		SELECT count(*)
		FROM download_logs d
		WHERE ($1 = '' OR d.ip_address ILIKE $2 OR d.user_agent ILIKE $2)
	`, raw, pattern)
}

func (a *App) listDownloadLogs(ctx context.Context, params logsListParams) ([]DownloadLogItem, error) {
	raw, pattern := logSearchArgs(params.Query)
	rows, err := a.db.Query(ctx, `
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
	items := []DownloadLogItem{}
	for rows.Next() {
		var item DownloadLogItem
		if err := rows.Scan(&item.ID, &item.CreatedAt, &item.Result, &item.CardKeyMask, &item.GoodsName, &item.IPAddress, &item.UserAgent); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (a *App) countAdminAuditLogs(ctx context.Context, query string) (int, error) {
	raw, pattern := logSearchArgs(query)
	return queryInt(ctx, a.db, `
		SELECT count(*)
		FROM admin_audit_logs l
		WHERE ($1 = '' OR l.ip_address ILIKE $2 OR l.user_agent ILIKE $2 OR l.action ILIKE $2 OR l.entity_type ILIKE $2)
	`, raw, pattern)
}

func (a *App) listAdminAuditLogs(ctx context.Context, params logsListParams) ([]AdminLogItem, error) {
	raw, pattern := logSearchArgs(params.Query)
	rows, err := a.db.Query(ctx, `
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
	items := []AdminLogItem{}
	for rows.Next() {
		var item AdminLogItem
		if err := rows.Scan(&item.ID, &item.CreatedAt, &item.Action, &item.EntityType, &item.EntityID, &item.Username, &item.IPAddress, &item.UserAgent, &item.Metadata); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (a *App) handleGetSettings(c *gin.Context) {
	settings, err := a.loadSettings(c.Request.Context())
	if err != nil {
		jsonError(c, http.StatusInternalServerError, "failed to load settings")
		return
	}
	c.JSON(http.StatusOK, settings)
}

func (a *App) handleUpdateSettings(c *gin.Context) {
	admin := currentAdmin(c)
	var req struct {
		ServiceBaseURL  *string `json:"serviceBaseUrl"`
		DeliveryMessage *string `json:"deliveryMessageTemplate"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		jsonError(c, http.StatusBadRequest, "invalid settings request")
		return
	}
	if req.ServiceBaseURL != nil {
		if _, err := normalizeServiceBaseURL(*req.ServiceBaseURL); err != nil {
			jsonError(c, http.StatusBadRequest, err.Error())
			return
		}
	}
	settings, err := a.updateSettings(c.Request.Context(), domain.SettingsUpdate{
		ServiceBaseURL:          req.ServiceBaseURL,
		DeliveryMessageTemplate: req.DeliveryMessage,
	})
	if err != nil {
		if strings.Contains(err.Error(), "service address") {
			jsonError(c, http.StatusBadRequest, err.Error())
			return
		}
		jsonError(c, http.StatusInternalServerError, "failed to update settings")
		return
	}
	a.writeAudit(c.Request.Context(), admin.ID, "settings.update", "SystemSetting", "", a.clientIP(c), userAgent(c), "")
	c.JSON(http.StatusOK, settings)
}

const defaultDeliveryMessageTemplate = service.DefaultDeliveryMessageTemplate

type settingsResponse = domain.Settings

func normalizeServiceBaseURL(value string) (string, error) {
	return service.NormalizeServiceBaseURL(value)
}

func (a *App) updateSettings(ctx context.Context, input domain.SettingsUpdate) (settingsResponse, error) {
	if a.settings == nil {
		return settingsResponse{}, errors.New("settings service is unavailable")
	}
	return a.settings.Update(ctx, a.cfg.AppBaseURL, input)
}

func (a *App) loadSettings(ctx context.Context) (settingsResponse, error) {
	if a.settings == nil {
		return settingsResponse{}, errors.New("settings service is unavailable")
	}
	return a.settings.Load(ctx, a.cfg.AppBaseURL)
}

func scanNoRows(err error) bool {
	return errors.Is(err, pgx.ErrNoRows) || errors.Is(err, sql.ErrNoRows)
}
