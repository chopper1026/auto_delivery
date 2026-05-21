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

type generateCardKeyRequest struct {
	GoodsID      string `json:"goodsId"`
	Expiration   string `json:"expiration"`
	FileQuantity int    `json:"fileQuantity"`
}

func (a *App) handleListCardKeys(c *gin.Context) {
	params, err := parseCardKeyListParams(c.Request.URL.Query())
	if err != nil {
		jsonError(c, http.StatusBadRequest, err.Error())
		return
	}
	response, err := a.listCardKeys(c.Request.Context(), params)
	if err != nil {
		jsonError(c, http.StatusInternalServerError, "failed to load card keys")
		return
	}
	c.JSON(http.StatusOK, response)
}

func (a *App) handleGenerateCardKey(c *gin.Context) {
	admin := currentAdmin(c)
	var req generateCardKeyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		jsonError(c, http.StatusBadRequest, "invalid card key request")
		return
	}
	result, err := a.generateCardKey(c.Request.Context(), req)
	if err != nil {
		if errors.Is(err, errNotEnoughInventory) {
			jsonError(c, http.StatusConflict, "not enough available file inventory")
			return
		}
		jsonError(c, http.StatusBadRequest, err.Error())
		return
	}
	a.writeAudit(c.Request.Context(), admin.ID, "card_key.generate", "CardKey", result.ID, a.clientIP(c), userAgent(c), "")
	c.JSON(http.StatusCreated, result)
}

func (a *App) handleDeleteCardKey(c *gin.Context) {
	admin := currentAdmin(c)
	err := a.deleteCardKey(c.Request.Context(), c.Param("id"))
	if err != nil {
		switch {
		case errors.Is(err, domain.ErrCardKeyNotFound):
			jsonError(c, http.StatusNotFound, "card key not found")
			return
		case errors.Is(err, domain.ErrCardKeyRedeemed):
			jsonError(c, http.StatusConflict, "cannot delete redeemed card key")
			return
		default:
			jsonError(c, http.StatusInternalServerError, "failed to delete card key")
			return
		}
	}
	a.writeAudit(c.Request.Context(), admin.ID, "card_key.delete", "CardKey", c.Param("id"), a.clientIP(c), userAgent(c), "")
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

var errNotEnoughInventory = domain.ErrNotEnoughInventory

type generatedCardKey = domain.GeneratedCardKey

func (a *App) generateCardKey(ctx context.Context, req generateCardKeyRequest) (generatedCardKey, error) {
	if a.cards == nil {
		return generatedCardKey{}, errors.New("card keys service is unavailable")
	}
	return a.cards.GenerateCardKey(ctx, domain.GenerateCardKeyInput{
		GoodsID:      req.GoodsID,
		Expiration:   req.Expiration,
		FileQuantity: req.FileQuantity,
	})
}

type cardKeyListParams = domain.ListCardKeysParams

func defaultCardKeyListParams() cardKeyListParams {
	return cardKeyListParams{Page: 1, PageSize: 10}
}

func parseCardKeyListParams(values url.Values) (cardKeyListParams, error) {
	params := defaultCardKeyListParams()
	params.Query = strings.TrimSpace(values.Get("q"))
	status := strings.ToUpper(strings.TrimSpace(values.Get("status")))
	if status != "" {
		switch status {
		case "ACTIVE", "REDEEMED", "EXPIRED", "DELETED":
			params.Status = status
		default:
			return cardKeyListParams{}, errors.New("status must be ACTIVE, REDEEMED, EXPIRED, or DELETED")
		}
	}
	params.Page = parsePositiveInt(values.Get("page"), 1, 1000000)
	params.PageSize = parsePositiveInt(values.Get("pageSize"), 10, 100)
	return params, nil
}

func (a *App) listCardKeys(ctx context.Context, params cardKeyListParams) (PaginatedCardKeysResponse, error) {
	if a.cards == nil {
		return PaginatedCardKeysResponse{}, errors.New("card keys service is unavailable")
	}
	return a.cards.ListCardKeys(ctx, params)
}

func calculateExpiresAt(option string, now time.Time) (*time.Time, error) {
	return service.CalculateExpiresAt(option, now)
}

func buildDeliveryMessage(settings settingsResponse, cardKey string, expiresAt *time.Time, createdAt time.Time) string {
	return service.BuildDeliveryMessage(settings, cardKey, expiresAt, createdAt)
}

func (a *App) deleteCardKey(ctx context.Context, id string) error {
	if a.cards == nil {
		return errors.New("card keys service is unavailable")
	}
	return a.cards.DeleteCardKey(ctx, id)
}
