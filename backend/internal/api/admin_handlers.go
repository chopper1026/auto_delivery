package api

import (
	"context"
	"errors"
	"net/http"
	"net/url"
	"strings"
	"time"

	"auto_delivery/backend/internal/domain"
	"auto_delivery/backend/internal/service"

	"github.com/gin-gonic/gin"
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
	if a.admin == nil {
		jsonError(c, http.StatusInternalServerError, "admin service is unavailable")
		return
	}
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		jsonError(c, http.StatusBadRequest, "invalid login request")
		return
	}
	result, err := a.admin.Login(c.Request.Context(), req.Username, req.Password, a.clientIP(c), userAgent(c))
	if err != nil {
		if errors.Is(err, service.ErrInvalidAdminCredentials) {
			jsonError(c, http.StatusUnauthorized, "invalid username or password")
			return
		}
		jsonError(c, http.StatusInternalServerError, "failed to create session")
		return
	}
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     a.cfg.SessionCookieName,
		Value:    result.SessionToken,
		Path:     "/",
		Expires:  result.ExpiresAt,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   a.secureCookies(),
	})
	c.JSON(http.StatusOK, gin.H{"admin": gin.H{"id": result.Admin.ID, "username": result.Admin.Username}, "csrfToken": result.CSRFToken})
}

func (a *App) secureCookies() bool {
	return a.cfg.ForceSecureCookies || strings.HasPrefix(a.cfg.AppBaseURL, "https://")
}

func (a *App) handleAdminSession(c *gin.Context) {
	admin := currentAdmin(c)
	if a.admin == nil {
		jsonError(c, http.StatusInternalServerError, "admin service is unavailable")
		return
	}
	token, _ := c.Cookie(a.cfg.SessionCookieName)
	csrf, err := a.admin.RefreshSession(c.Request.Context(), token)
	if err != nil {
		jsonError(c, http.StatusInternalServerError, "failed to refresh session")
		return
	}
	c.JSON(http.StatusOK, gin.H{"admin": gin.H{"id": admin.ID, "username": admin.Username}, "csrfToken": csrf})
}

func (a *App) handleAdminLogout(c *gin.Context) {
	token, _ := c.Cookie(a.cfg.SessionCookieName)
	if a.admin != nil {
		_ = a.admin.Logout(c.Request.Context(), token)
	}
	http.SetCookie(c.Writer, &http.Cookie{Name: a.cfg.SessionCookieName, Value: "", Path: "/", MaxAge: -1, HttpOnly: true, SameSite: http.SameSiteLaxMode, Secure: a.secureCookies()})
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (a *App) handleOverview(c *gin.Context) {
	if a.admin == nil {
		jsonError(c, http.StatusInternalServerError, "admin service is unavailable")
		return
	}
	overview, err := a.admin.LoadOverview(c.Request.Context(), time.Now())
	if err != nil {
		jsonError(c, http.StatusInternalServerError, "failed to load overview")
		return
	}
	c.JSON(http.StatusOK, overview)
}

func (a *App) handleLogs(c *gin.Context) {
	params, err := parseLogsListParams(c.Request.URL.Query())
	if err != nil {
		jsonError(c, http.StatusBadRequest, err.Error())
		return
	}
	if a.admin == nil {
		jsonError(c, http.StatusInternalServerError, "admin service is unavailable")
		return
	}
	response, err := a.admin.LoadLogs(c.Request.Context(), params)
	if err != nil {
		jsonError(c, http.StatusInternalServerError, "failed to load logs")
		return
	}
	c.JSON(http.StatusOK, response)
}

type logsListParams = domain.LogsListParams

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
