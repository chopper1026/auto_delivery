package api

import (
	"context"
	"database/sql"
	"fmt"
	"math"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"auto_delivery/backend/internal/config"
	"auto_delivery/backend/internal/security"
	"auto_delivery/backend/internal/storage"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

type App struct {
	cfg    config.Config
	db     *pgxpool.Pool
	redis  *redis.Client
	router *gin.Engine
}

type adminContext struct {
	ID       string
	Username string
	CSRFHash string
}

func New(cfg config.Config, db *pgxpool.Pool, redisClient *redis.Client) *App {
	if cfg.AppEnv == "production" {
		gin.SetMode(gin.ReleaseMode)
	}
	app := &App{cfg: cfg, db: db, redis: redisClient}
	router := gin.New()
	router.Use(gin.Logger(), gin.Recovery())
	router.MaxMultipartMemory = storage.MaxUploadBytes

	api := router.Group("/api")
	api.POST("/public/redeem", app.handleRedeem)
	api.GET("/public/receipt/:token", app.handleReceipt)
	api.GET("/public/receipt/:token/status", app.handleReceiptStatus)
	api.GET("/download/:token", app.handleDownload)
	api.POST("/admin/login", app.handleAdminLogin)

	admin := api.Group("/admin")
	admin.Use(app.requireAdmin())
	admin.GET("/session", app.handleAdminSession)
	admin.DELETE("/session", app.handleAdminLogout)
	admin.GET("/overview", app.handleOverview)
	admin.GET("/goods", app.handleListGoods)
	admin.POST("/goods", app.handleCreateGoods)
	admin.PATCH("/goods/:id", app.handleUpdateGoods)
	admin.DELETE("/goods/:id", app.handleDeleteGoods)
	admin.POST("/goods/:id/files", app.handleUploadGoodsFiles)
	admin.GET("/goods/:id/export/:scope", app.handleExportGoodsFiles)
	admin.GET("/card-keys", app.handleListCardKeys)
	admin.POST("/card-keys", app.handleGenerateCardKey)
	admin.DELETE("/card-keys/:id", app.handleDeleteCardKey)
	admin.GET("/logs", app.handleLogs)
	admin.GET("/settings", app.handleGetSettings)
	admin.PATCH("/settings", app.handleUpdateSettings)

	router.GET("/healthz", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})
	app.mountStatic(router)
	app.router = router
	return app
}

func (a *App) Handler() http.Handler {
	return a.router
}

func (a *App) mountStatic(router *gin.Engine) {
	staticDir := a.cfg.StaticDir
	router.NoRoute(func(c *gin.Context) {
		if strings.HasPrefix(c.Request.URL.Path, "/api/") {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}
		requestPath := filepath.Clean(strings.TrimPrefix(c.Request.URL.Path, "/"))
		if requestPath == "." {
			requestPath = "index.html"
		}
		candidate := filepath.Join(staticDir, requestPath)
		if info, err := os.Stat(candidate); err == nil && !info.IsDir() {
			c.File(candidate)
			return
		}
		c.File(filepath.Join(staticDir, "index.html"))
	})
}

func (a *App) EnsureStorage() error {
	return storage.Ensure(a.cfg.StorageRoot)
}

func (a *App) EnsureInitialAdmin(ctx context.Context) error {
	var count int
	if err := a.db.QueryRow(ctx, `SELECT count(*) FROM admin_users`).Scan(&count); err != nil {
		return err
	}
	if count > 0 {
		return nil
	}
	hash, err := security.HashPassword(a.cfg.AdminPassword)
	if err != nil {
		return err
	}
	_, err = a.db.Exec(ctx, `
		INSERT INTO admin_users (username, password_hash)
		VALUES ($1, $2)
	`, a.cfg.AdminUsername, hash)
	return err
}

func clientIP(c *gin.Context) string {
	if forwarded := strings.TrimSpace(c.GetHeader("X-Forwarded-For")); forwarded != "" {
		return strings.TrimSpace(strings.Split(forwarded, ",")[0])
	}
	return c.ClientIP()
}

func userAgent(c *gin.Context) string {
	ua := c.Request.UserAgent()
	if ua == "" {
		return "-"
	}
	return ua
}

func (a *App) consumeRateLimit(ctx context.Context, scope, identifier string, limit int, window time.Duration) bool {
	if a.redis == nil {
		return true
	}
	bucket := time.Now().Unix() / int64(window.Seconds())
	key := fmt.Sprintf("rate:%s:%s:%d", scope, identifier, bucket)
	count, err := a.redis.Incr(ctx, key).Result()
	if err != nil {
		return true
	}
	if count == 1 {
		_ = a.redis.Expire(ctx, key, window+time.Minute).Err()
	}
	return count <= int64(limit)
}

func (a *App) writeAudit(ctx context.Context, adminID, action, entityType, entityID, ip, ua string, metadata string) {
	var entity any
	if entityID != "" {
		entity = entityID
	}
	var meta any
	if metadata != "" {
		meta = metadata
	}
	_, _ = a.db.Exec(ctx, `
		INSERT INTO admin_audit_logs (admin_user_id, action, entity_type, entity_id, ip_address, user_agent, metadata_json)
		VALUES ($1, $2, $3, $4, $5, $6, CASE WHEN $7::text IS NULL THEN NULL ELSE $7::jsonb END)
	`, adminID, action, entityType, entity, ip, ua, meta)
}

func (a *App) requireAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		token, err := c.Cookie(a.cfg.SessionCookieName)
		if err != nil || token == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			return
		}
		tokenHash := security.LookupHash(token, a.cfg.SecretPepper)
		var admin adminContext
		err = a.db.QueryRow(c.Request.Context(), `
			SELECT u.id::text, u.username, s.csrf_token_hash
			FROM admin_sessions s
			JOIN admin_users u ON u.id = s.admin_user_id
			WHERE s.token_hash = $1 AND s.expires_at > now()
		`, tokenHash).Scan(&admin.ID, &admin.Username, &admin.CSRFHash)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			return
		}
		if c.Request.Method != http.MethodGet && c.Request.Method != http.MethodHead && c.Request.Method != http.MethodOptions {
			csrf := c.GetHeader("X-CSRF-Token")
			if csrf == "" || security.LookupHash(csrf, a.cfg.SecretPepper) != admin.CSRFHash {
				c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "invalid csrf token"})
				return
			}
		}
		c.Set("admin", admin)
		c.Next()
	}
}

func currentAdmin(c *gin.Context) adminContext {
	admin, _ := c.Get("admin")
	return admin.(adminContext)
}

func jsonError(c *gin.Context, status int, message string) {
	c.JSON(status, gin.H{"error": message})
}

func nullStringToString(value sql.NullString) string {
	if !value.Valid {
		return ""
	}
	return value.String
}

func nullTimePtr(value sql.NullTime) *time.Time {
	if !value.Valid {
		return nil
	}
	return &value.Time
}

func parsePositiveInt(value string, fallback int, max int) int {
	n, err := strconv.Atoi(value)
	if err != nil || n < 1 {
		return fallback
	}
	return int(math.Min(float64(n), float64(max)))
}
