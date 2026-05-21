package api

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"math"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"auto_delivery/backend/internal/config"
	"auto_delivery/backend/internal/domain"
	postgresrepo "auto_delivery/backend/internal/repository/postgres"
	"auto_delivery/backend/internal/service"
	"auto_delivery/backend/internal/storage"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

type App struct {
	cfg         config.Config
	db          *pgxpool.Pool
	redis       *redis.Client
	router      *gin.Engine
	goods       *service.GoodsService
	cards       *service.CardKeysService
	settings    *service.SettingsService
	downloads   *service.DownloadsService
	redemptions *service.RedemptionsService
	admin       *service.AdminService
}

func New(cfg config.Config, db *pgxpool.Pool, redisClient *redis.Client) *App {
	if cfg.AppEnv == "production" {
		gin.SetMode(gin.ReleaseMode)
	}
	app := &App{cfg: cfg, db: db, redis: redisClient}
	if db != nil {
		app.goods = service.NewGoodsService(postgresrepo.NewGoodsRepository(db))
		app.settings = service.NewSettingsService(postgresrepo.NewSettingsRepository(db))
		app.cards = service.NewCardKeysService(postgresrepo.NewCardKeysRepository(db), cfg.SecretPepper, app.settings, cfg.AppBaseURL)
		app.downloads = service.NewDownloadsService(postgresrepo.NewDownloadsRepository(db), cfg.SecretPepper, cfg.DownloadClaimTTL)
		app.redemptions = service.NewRedemptionsService(postgresrepo.NewRedemptionsRepository(db), cfg.SecretPepper, cfg.StorageRoot)
		app.admin = service.NewAdminService(postgresrepo.NewAdminRepository(db), cfg.SecretPepper, cfg.AdminUsername, cfg.AdminPassword, cfg.SessionTTL)
	}
	router := gin.New()
	router.Use(gin.Logger(), gin.Recovery(), securityHeaders(), maxRequestBody(app.cfg.UploadBodyLimit))
	router.MaxMultipartMemory = minPositiveInt64(app.cfg.UploadBodyLimit, storage.MaxUploadBytes)

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
	admin.GET("/goods/card-options", app.handleCardGoodsOptions)
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
	staticDir, err := filepath.Abs(a.cfg.StaticDir)
	if err != nil {
		staticDir = a.cfg.StaticDir
	}
	router.NoRoute(func(c *gin.Context) {
		if strings.HasPrefix(c.Request.URL.Path, "/api/") {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}
		requestPath := filepath.Clean(strings.TrimPrefix(c.Request.URL.Path, "/"))
		if requestPath == "." {
			requestPath = "index.html"
		}
		candidate, err := filepath.Abs(filepath.Join(staticDir, requestPath))
		if err != nil {
			c.Status(http.StatusNotFound)
			return
		}
		rel, err := filepath.Rel(staticDir, candidate)
		if err != nil || rel == ".." || strings.HasPrefix(rel, ".."+string(filepath.Separator)) || filepath.IsAbs(rel) {
			c.Status(http.StatusNotFound)
			return
		}
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
	if a.admin == nil {
		return errors.New("admin service is unavailable")
	}
	return a.admin.EnsureInitialAdmin(ctx)
}

func (a *App) clientIP(c *gin.Context) string {
	if forwarded := strings.TrimSpace(c.GetHeader("X-Forwarded-For")); forwarded != "" && isTrustedProxy(c.Request.RemoteAddr, a.cfg.TrustedProxyCIDRs) {
		return firstForwardedFor(forwarded)
	}
	if direct := remoteAddrHost(c.Request.RemoteAddr); direct != "" {
		return direct
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
	if a.admin == nil {
		return
	}
	_ = a.admin.WriteAudit(ctx, domain.AdminAuditEntry{
		AdminID:    adminID,
		Action:     action,
		EntityType: entityType,
		EntityID:   entityID,
		IPAddress:  ip,
		UserAgent:  ua,
		Metadata:   metadata,
	})
}

func (a *App) requireAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		token, err := c.Cookie(a.cfg.SessionCookieName)
		if err != nil || token == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			return
		}
		if a.admin == nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			return
		}
		validateCSRF := c.Request.Method != http.MethodGet && c.Request.Method != http.MethodHead && c.Request.Method != http.MethodOptions
		admin, err := a.admin.AuthenticateSession(c.Request.Context(), token, c.GetHeader("X-CSRF-Token"), validateCSRF)
		if err != nil {
			if errors.Is(err, service.ErrInvalidCSRFToken) {
				c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "invalid csrf token"})
				return
			}
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			return
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

func minPositiveInt64(a int64, b int64) int64 {
	if a <= 0 {
		return b
	}
	if b <= 0 || a < b {
		return a
	}
	return b
}
