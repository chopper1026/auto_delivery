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

	"auto_delivery/backend/internal/security"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
)

type loginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func (a *App) handleAdminLogin(c *gin.Context) {
	if !a.consumeRateLimit(c.Request.Context(), "admin-login", clientIP(c), 10, 15*time.Minute) {
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
	`, security.LookupHash(token, a.cfg.SecretPepper), security.LookupHash(csrfToken, a.cfg.SecretPepper), adminID, clientIP(c), userAgent(c), expiresAt)
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
		Secure:   strings.HasPrefix(a.cfg.AppBaseURL, "https://"),
	})
	c.JSON(http.StatusOK, gin.H{"admin": gin.H{"id": adminID, "username": username}, "csrfToken": csrfToken})
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
	http.SetCookie(c.Writer, &http.Cookie{Name: a.cfg.SessionCookieName, Value: "", Path: "/", MaxAge: -1, HttpOnly: true, SameSite: http.SameSiteLaxMode})
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

func expiredCardKeysWhereClause() string {
	return "(status = 'EXPIRED' OR (status = 'ACTIVE' AND expires_at < now()))"
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
	activeCardKeys, err := queryInt(ctx, a.db, `SELECT count(*) FROM card_keys WHERE status = 'ACTIVE'`)
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
	redemptionTimes, err := a.loadRedemptionTimes(ctx, trendStart)
	if err != nil {
		return OverviewResponse{}, err
	}
	downloadTimes, err := a.loadSuccessfulDownloadTimes(ctx, trendStart)
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
		DeliveryTrend:     buildDeliveryTrendDays(now, redemptionTimes, downloadTimes),
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

func (a *App) loadRedemptionTimes(ctx context.Context, since time.Time) ([]time.Time, error) {
	rows, err := a.db.Query(ctx, `SELECT redeemed_at FROM redemptions WHERE redeemed_at >= $1`, since)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var values []time.Time
	for rows.Next() {
		var value time.Time
		if err := rows.Scan(&value); err != nil {
			return nil, err
		}
		values = append(values, value)
	}
	return values, rows.Err()
}

func (a *App) loadSuccessfulDownloadTimes(ctx context.Context, since time.Time) ([]time.Time, error) {
	rows, err := a.db.Query(ctx, `SELECT created_at FROM download_logs WHERE result = 'SUCCESS' AND created_at >= $1`, since)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var values []time.Time
	for rows.Next() {
		var value time.Time
		if err := rows.Scan(&value); err != nil {
			return nil, err
		}
		values = append(values, value)
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

func buildDeliveryTrendDays(now time.Time, redemptions []time.Time, downloads []time.Time) []DeliveryTrendDay {
	today := startOfUTCDay(now)
	buckets := make([]DeliveryTrendDay, 0, 7)
	byKey := map[string]int{}
	for index := 6; index >= 0; index-- {
		day := today.AddDate(0, 0, -index)
		key := day.Format("2006-01-02")
		byKey[key] = len(buckets)
		buckets = append(buckets, DeliveryTrendDay{DateKey: key, Label: key[5:]})
	}
	for _, redeemedAt := range redemptions {
		key := startOfUTCDay(redeemedAt).Format("2006-01-02")
		if index, ok := byKey[key]; ok {
			buckets[index].Redemptions++
		}
	}
	for _, downloadedAt := range downloads {
		key := startOfUTCDay(downloadedAt).Format("2006-01-02")
		if index, ok := byKey[key]; ok {
			buckets[index].Downloads++
		}
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
		serviceBaseURL, err := normalizeServiceBaseURL(*req.ServiceBaseURL)
		if err != nil {
			jsonError(c, http.StatusBadRequest, err.Error())
			return
		}
		if _, err := a.db.Exec(c.Request.Context(), `
			INSERT INTO system_settings (key, value) VALUES ('service_base_url', $1)
			ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
		`, serviceBaseURL); err != nil {
			jsonError(c, http.StatusInternalServerError, "failed to update settings")
			return
		}
	}
	if req.DeliveryMessage != nil {
		deliveryMessage := *req.DeliveryMessage
		if strings.TrimSpace(deliveryMessage) == "" {
			deliveryMessage = defaultDeliveryMessageTemplate
		}
		if _, err := a.db.Exec(c.Request.Context(), `
			INSERT INTO system_settings (key, value) VALUES ('card_key_delivery_message_template', $1)
			ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
		`, deliveryMessage); err != nil {
			jsonError(c, http.StatusInternalServerError, "failed to update settings")
			return
		}
	}
	a.writeAudit(c.Request.Context(), admin.ID, "settings.update", "SystemSetting", "", clientIP(c), userAgent(c), "")
	settings, err := a.loadSettings(c.Request.Context())
	if err != nil {
		jsonError(c, http.StatusInternalServerError, "failed to load settings")
		return
	}
	c.JSON(http.StatusOK, settings)
}

const defaultDeliveryMessageTemplate = "兑换地址：{{redeemUrl}}\n卡密：{{cardKey}}\n创建时间：{{createdAt}}\n到期时间：{{expiresAt}}\n\n注意事项：\n1. 一个卡密只能兑换一次，请勿转发给无关人员。\n2. 兑换完成后请及时保存收货页面内容或下载文件。\n3. 因个人原因未及时保存导致的损失不予处理。"

type settingsResponse struct {
	ServiceBaseURL          string `json:"serviceBaseUrl"`
	DeliveryMessageTemplate string `json:"deliveryMessageTemplate"`
}

func normalizeServiceBaseURL(value string) (string, error) {
	trimmed := strings.TrimSpace(value)
	parsed, err := url.Parse(trimmed)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return "", errors.New("service address must be a valid URL")
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return "", errors.New("service address must use http or https")
	}
	parsed.RawQuery = ""
	parsed.Fragment = ""
	parsed.Path = strings.TrimRight(parsed.Path, "/")
	return parsed.String(), nil
}

func (a *App) loadSettings(ctx context.Context) (settingsResponse, error) {
	rows, err := a.db.Query(ctx, `SELECT key, value FROM system_settings`)
	if err != nil {
		return settingsResponse{}, err
	}
	defer rows.Close()
	out := settingsResponse{ServiceBaseURL: a.cfg.AppBaseURL, DeliveryMessageTemplate: defaultDeliveryMessageTemplate}
	for rows.Next() {
		var key, value string
		if err := rows.Scan(&key, &value); err != nil {
			return settingsResponse{}, err
		}
		switch key {
		case "service_base_url":
			out.ServiceBaseURL = value
		case "card_key_delivery_message_template":
			out.DeliveryMessageTemplate = value
		}
	}
	return out, rows.Err()
}

func scanNoRows(err error) bool {
	return errors.Is(err, pgx.ErrNoRows) || errors.Is(err, sql.ErrNoRows)
}
