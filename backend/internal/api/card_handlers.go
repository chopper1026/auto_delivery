package api

import (
	"context"
	"errors"
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
	tx, err := a.db.BeginTx(c.Request.Context(), pgx.TxOptions{})
	if err != nil {
		jsonError(c, http.StatusInternalServerError, "failed to delete card key")
		return
	}
	defer tx.Rollback(c.Request.Context())
	var status string
	err = tx.QueryRow(c.Request.Context(), `SELECT status::text FROM card_keys WHERE id = $1 FOR UPDATE`, c.Param("id")).Scan(&status)
	if err != nil {
		jsonError(c, http.StatusNotFound, "card key not found")
		return
	}
	if status == "REDEEMED" {
		jsonError(c, http.StatusConflict, "cannot delete redeemed card key")
		return
	}
	if _, err := tx.Exec(c.Request.Context(), `
		UPDATE goods_files
		SET status = 'AVAILABLE', reserved_by_card_key_id = NULL, reserved_at = NULL
		WHERE reserved_by_card_key_id = $1 AND status = 'RESERVED'
	`, c.Param("id")); err != nil {
		jsonError(c, http.StatusInternalServerError, "failed to release reserved files")
		return
	}
	if _, err := tx.Exec(c.Request.Context(), `UPDATE card_keys SET status = 'DELETED', deleted_at = now() WHERE id = $1`, c.Param("id")); err != nil {
		jsonError(c, http.StatusInternalServerError, "failed to delete card key")
		return
	}
	if err := tx.Commit(c.Request.Context()); err != nil {
		jsonError(c, http.StatusInternalServerError, "failed to delete card key")
		return
	}
	a.writeAudit(c.Request.Context(), admin.ID, "card_key.delete", "CardKey", c.Param("id"), a.clientIP(c), userAgent(c), "")
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

var errNotEnoughInventory = errors.New("not enough inventory")

type generatedCardKey struct {
	ID              string     `json:"id"`
	PlaintextKey    string     `json:"plaintextKey"`
	KeyMask         string     `json:"keyMask"`
	DeliveryMessage string     `json:"deliveryMessage"`
	ExpiresAt       *time.Time `json:"expiresAt,omitempty"`
	CreatedAt       time.Time  `json:"createdAt"`
}

func (a *App) generateCardKey(ctx context.Context, req generateCardKeyRequest) (generatedCardKey, error) {
	expiration := strings.ToLower(strings.TrimSpace(req.Expiration))
	if expiration == "" {
		expiration = "3d"
	}
	expiresAt, err := calculateExpiresAt(expiration, time.Now())
	if err != nil {
		return generatedCardKey{}, err
	}
	plaintext, err := security.GenerateCardKey()
	if err != nil {
		return generatedCardKey{}, err
	}
	keyHash := security.LookupHash(plaintext, a.cfg.SecretPepper)
	keyMask := security.MaskSecret(plaintext)
	tx, err := a.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return generatedCardKey{}, err
	}
	defer tx.Rollback(ctx)

	var goodsID, goodsType, goodsStatus string
	err = tx.QueryRow(ctx, `SELECT id::text, type::text, status::text FROM goods WHERE id = $1 FOR UPDATE`, req.GoodsID).Scan(&goodsID, &goodsType, &goodsStatus)
	if err != nil {
		return generatedCardKey{}, errors.New("goods not found")
	}
	if goodsStatus != "ACTIVE" {
		return generatedCardKey{}, errors.New("goods is disabled")
	}
	quantity := 0
	if goodsType == "FILE" {
		quantity = req.FileQuantity
		if quantity < 1 {
			return generatedCardKey{}, errNotEnoughInventory
		}
	}
	var cardID string
	var createdAt time.Time
	err = tx.QueryRow(ctx, `
		INSERT INTO card_keys (key_hash, key_mask, goods_id, goods_type, file_quantity, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id::text, created_at
	`, keyHash, keyMask, goodsID, goodsType, quantity, expiresAt).Scan(&cardID, &createdAt)
	if err != nil {
		return generatedCardKey{}, err
	}
	if goodsType == "FILE" {
		rows, err := tx.Query(ctx, `
			SELECT id::text
			FROM goods_files
			WHERE goods_id = $1 AND status = 'AVAILABLE'
			ORDER BY created_at ASC
			LIMIT $2
			FOR UPDATE SKIP LOCKED
		`, goodsID, quantity)
		if err != nil {
			return generatedCardKey{}, err
		}
		fileIDs := []string{}
		for rows.Next() {
			var id string
			if err := rows.Scan(&id); err != nil {
				rows.Close()
				return generatedCardKey{}, err
			}
			fileIDs = append(fileIDs, id)
		}
		rows.Close()
		if len(fileIDs) != quantity {
			return generatedCardKey{}, errNotEnoughInventory
		}
		reserved := 0
		for _, fileID := range fileIDs {
			tag, err := tx.Exec(ctx, `
				UPDATE goods_files
				SET status = 'RESERVED', reserved_by_card_key_id = $1, reserved_at = now()
				WHERE id = $2 AND status = 'AVAILABLE'
			`, cardID, fileID)
			if err != nil {
				return generatedCardKey{}, err
			}
			reserved += int(tag.RowsAffected())
		}
		if reserved != quantity {
			return generatedCardKey{}, errNotEnoughInventory
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return generatedCardKey{}, err
	}
	settings, _ := a.loadSettings(ctx)
	return generatedCardKey{
		ID:              cardID,
		PlaintextKey:    plaintext,
		KeyMask:         keyMask,
		DeliveryMessage: buildDeliveryMessage(settings, plaintext, expiresAt, createdAt),
		ExpiresAt:       expiresAt,
		CreatedAt:       createdAt,
	}, nil
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
	template := settings.DeliveryMessageTemplate
	if template == "" {
		template = defaultDeliveryMessageTemplate
	}
	expires := "永不过期"
	if expiresAt != nil {
		expires = expiresAt.Format("2006-01-02 15:04")
	}
	replacer := strings.NewReplacer(
		"{{cardKey}}", cardKey,
		"{{redeemUrl}}", strings.TrimRight(settings.ServiceBaseURL, "/"),
		"{{expiresAt}}", expires,
		"{{createdAt}}", createdAt.Format("2006-01-02 15:04"),
	)
	return replacer.Replace(template)
}
