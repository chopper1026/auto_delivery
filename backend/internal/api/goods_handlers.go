package api

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/csv"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"auto_delivery/backend/internal/domain"
	"auto_delivery/backend/internal/storage"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
)

func (a *App) handleListGoods(c *gin.Context) {
	params, err := parseGoodsListParams(c.Request.URL.Query())
	if err != nil {
		jsonError(c, http.StatusBadRequest, err.Error())
		return
	}
	response, err := a.listGoods(c.Request.Context(), params)
	if err != nil {
		jsonError(c, http.StatusInternalServerError, "failed to load goods")
		return
	}
	c.JSON(http.StatusOK, response)
}

func (a *App) handleCardGoodsOptions(c *gin.Context) {
	query := strings.TrimSpace(c.Query("q"))
	limit := parsePositiveInt(c.Query("limit"), 50, 200)
	items, err := a.listCardGoodsOptions(c.Request.Context(), query, limit)
	if err != nil {
		jsonError(c, http.StatusInternalServerError, "failed to load goods options")
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

type createGoodsRequest struct {
	Name        string `json:"name"`
	Type        string `json:"type"`
	TextContent string `json:"textContent"`
	Note        string `json:"note"`
}

func (a *App) handleCreateGoods(c *gin.Context) {
	admin := currentAdmin(c)
	var req createGoodsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		jsonError(c, http.StatusBadRequest, "invalid goods request")
		return
	}
	name := strings.TrimSpace(req.Name)
	if name == "" {
		jsonError(c, http.StatusBadRequest, "goods name is required")
		return
	}
	goodsType := strings.ToUpper(strings.TrimSpace(req.Type))
	if goodsType != "TEXT" && goodsType != "FILE" {
		jsonError(c, http.StatusBadRequest, "goods type must be TEXT or FILE")
		return
	}
	if goodsType == "TEXT" && strings.TrimSpace(req.TextContent) == "" {
		jsonError(c, http.StatusBadRequest, "text content is required")
		return
	}
	var id string
	err := a.db.QueryRow(c.Request.Context(), `
		INSERT INTO goods (name, type, text_content, note)
		VALUES ($1, $2, $3, $4)
		RETURNING id::text
	`, name, goodsType, nullIfEmpty(req.TextContent), nullIfEmpty(req.Note)).Scan(&id)
	if err != nil {
		jsonError(c, http.StatusInternalServerError, "failed to create goods")
		return
	}
	action := "goods.create_text"
	if goodsType == "FILE" {
		action = "goods.create_file"
	}
	a.writeAudit(c.Request.Context(), admin.ID, action, "Goods", id, a.clientIP(c), userAgent(c), "")
	response, _ := a.listGoods(c.Request.Context(), defaultGoodsListParams())
	c.JSON(http.StatusCreated, gin.H{"id": id, "items": response.Items})
}

func (a *App) handleUpdateGoods(c *gin.Context) {
	admin := currentAdmin(c)
	var req struct {
		Status string `json:"status"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		jsonError(c, http.StatusBadRequest, "invalid goods update request")
		return
	}
	status := strings.ToUpper(strings.TrimSpace(req.Status))
	if status != "ACTIVE" && status != "DISABLED" {
		jsonError(c, http.StatusBadRequest, "status must be ACTIVE or DISABLED")
		return
	}
	tag, err := a.db.Exec(c.Request.Context(), `UPDATE goods SET status = $1, updated_at = now() WHERE id = $2`, status, c.Param("id"))
	if err != nil {
		jsonError(c, http.StatusInternalServerError, "failed to update goods")
		return
	}
	if tag.RowsAffected() == 0 {
		jsonError(c, http.StatusNotFound, "goods not found")
		return
	}
	a.writeAudit(c.Request.Context(), admin.ID, "goods."+strings.ToLower(status), "Goods", c.Param("id"), a.clientIP(c), userAgent(c), "")
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (a *App) handleDeleteGoods(c *gin.Context) {
	admin := currentAdmin(c)
	var count int
	if err := a.db.QueryRow(c.Request.Context(), `SELECT count(*) FROM card_keys WHERE goods_id = $1`, c.Param("id")).Scan(&count); err != nil {
		jsonError(c, http.StatusInternalServerError, "failed to delete goods")
		return
	}
	if count > 0 {
		jsonError(c, http.StatusConflict, "goods has card keys")
		return
	}
	tag, err := a.db.Exec(c.Request.Context(), `DELETE FROM goods WHERE id = $1`, c.Param("id"))
	if err != nil {
		jsonError(c, http.StatusInternalServerError, "failed to delete goods")
		return
	}
	if tag.RowsAffected() == 0 {
		jsonError(c, http.StatusNotFound, "goods not found")
		return
	}
	a.writeAudit(c.Request.Context(), admin.ID, "goods.delete", "Goods", c.Param("id"), a.clientIP(c), userAgent(c), "")
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (a *App) handleUploadGoodsFiles(c *gin.Context) {
	admin := currentAdmin(c)
	form, err := c.MultipartForm()
	if err != nil {
		jsonError(c, http.StatusBadRequest, "invalid upload")
		return
	}
	files := form.File["files"]
	if len(files) == 0 {
		jsonError(c, http.StatusBadRequest, "no files selected")
		return
	}
	if len(files) > storage.MaxUploadFiles {
		jsonError(c, http.StatusBadRequest, "too many files selected")
		return
	}
	var total int64
	for _, file := range files {
		total += file.Size
	}
	if total > storage.MaxUploadBytes {
		jsonError(c, http.StatusBadRequest, "selected files are too large")
		return
	}
	goodsID := c.Param("id")
	tx, err := a.db.BeginTx(c.Request.Context(), pgx.TxOptions{})
	if err != nil {
		jsonError(c, http.StatusInternalServerError, "failed to start upload")
		return
	}
	defer tx.Rollback(c.Request.Context())
	var goodsType string
	if err := tx.QueryRow(c.Request.Context(), `SELECT type::text FROM goods WHERE id = $1`, goodsID).Scan(&goodsType); err != nil {
		jsonError(c, http.StatusNotFound, "file goods not found")
		return
	}
	if goodsType != "FILE" {
		jsonError(c, http.StatusBadRequest, "goods is not file type")
		return
	}
	saved := []storage.SavedFile{}
	committed := false
	defer func() {
		if !committed {
			storage.RemoveSavedFiles(saved)
		}
	}()
	for _, file := range files {
		item, err := storage.SaveInventoryFile(a.cfg.StorageRoot, goodsID, file)
		if err != nil {
			jsonError(c, http.StatusBadRequest, err.Error())
			return
		}
		saved = append(saved, item)
		_, err = tx.Exec(c.Request.Context(), `
			INSERT INTO goods_files (goods_id, original_name, stored_name, storage_path, size_bytes, mime_type, sha256)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
		`, goodsID, item.OriginalName, item.StoredName, item.StoragePath, item.SizeBytes, item.MimeType, item.SHA256)
		if err != nil {
			jsonError(c, http.StatusInternalServerError, "failed to register uploaded file")
			return
		}
	}
	if err := tx.Commit(c.Request.Context()); err != nil {
		jsonError(c, http.StatusInternalServerError, "failed to finish upload")
		return
	}
	committed = true
	a.writeAudit(c.Request.Context(), admin.ID, "goods.upload_files", "Goods", goodsID, a.clientIP(c), userAgent(c), fmt.Sprintf(`{"count":%d}`, len(saved)))
	c.JSON(http.StatusOK, gin.H{"acceptedCount": len(saved)})
}

func (a *App) handleExportGoodsFiles(c *gin.Context) {
	admin := currentAdmin(c)
	scope := strings.ToUpper(c.Param("scope"))
	if scope != "UNREDEEMED" && scope != "REDEEMED" {
		jsonError(c, http.StatusBadRequest, "invalid export scope")
		return
	}
	rows, err := a.db.Query(c.Request.Context(), `
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
	`, c.Param("id"), scope)
	if err != nil {
		jsonError(c, http.StatusInternalServerError, "failed to export files")
		return
	}
	defer rows.Close()
	type entry struct {
		originalName string
		path         string
		status       string
		cardKeyMask  string
		reservedAt   sql.NullTime
		redeemedAt   sql.NullTime
		goodsName    string
	}
	entries := []entry{}
	for rows.Next() {
		var item entry
		if err := rows.Scan(&item.originalName, &item.path, &item.status, &item.cardKeyMask, &item.reservedAt, &item.redeemedAt, &item.goodsName); err != nil {
			jsonError(c, http.StatusInternalServerError, "failed to export files")
			return
		}
		entries = append(entries, item)
	}
	if len(entries) == 0 {
		jsonError(c, http.StatusNotFound, "no files to export")
		return
	}
	var manifest bytes.Buffer
	csvWriter := csv.NewWriter(&manifest)
	_ = csvWriter.Write([]string{"originalName", "status", "cardKeyMask", "reservedAt", "redeemedAt"})
	zipEntries := make([]storage.ZipEntry, 0, len(entries))
	for _, item := range entries {
		_ = csvWriter.Write([]string{item.originalName, item.status, item.cardKeyMask, formatNullTime(item.reservedAt), formatNullTime(item.redeemedAt)})
		zipEntries = append(zipEntries, storage.ZipEntry{Path: item.path, EntryName: item.originalName})
	}
	csvWriter.Flush()
	filename := storage.SanitizeEntryName(entries[0].goodsName) + "-" + strings.ToLower(scope) + ".zip"
	c.Header("Content-Type", "application/zip")
	c.Header("Content-Disposition", `attachment; filename="`+filename+`"`)
	if err := storage.WriteZip(c.Writer, zipEntries, map[string]string{"manifest.csv": manifest.String()}); err != nil {
		return
	}
	a.writeAudit(c.Request.Context(), admin.ID, goodsExportAuditAction(scope), "Goods", c.Param("id"), a.clientIP(c), userAgent(c), fmt.Sprintf(`{"count":%d}`, len(entries)))
}

type goodsListParams = domain.ListGoodsParams

func defaultGoodsListParams() goodsListParams {
	return goodsListParams{Page: 1, PageSize: 10}
}

func parseGoodsListParams(values url.Values) (goodsListParams, error) {
	params := defaultGoodsListParams()
	params.Query = strings.TrimSpace(values.Get("q"))
	status := strings.ToUpper(strings.TrimSpace(values.Get("status")))
	if status != "" {
		if status != "ACTIVE" && status != "DISABLED" {
			return goodsListParams{}, errors.New("status must be ACTIVE or DISABLED")
		}
		params.Status = status
	}
	params.Page = parsePositiveInt(values.Get("page"), 1, 1000000)
	params.PageSize = parsePositiveInt(values.Get("pageSize"), 10, 100)
	return params, nil
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

func goodsExportAuditAction(scope string) string {
	if strings.ToUpper(scope) == "REDEEMED" {
		return "goods.export_redeemed"
	}
	return "goods.export_unredeemed"
}

func (a *App) listCardGoodsOptions(ctx context.Context, query string, limit int) ([]Goods, error) {
	if a.goods == nil {
		return nil, errors.New("goods service is unavailable")
	}
	return a.goods.ListCardGoodsOptions(ctx, query, limit)
}

func (a *App) listGoods(ctx context.Context, params goodsListParams) (PaginatedGoodsResponse, error) {
	if a.goods == nil {
		return PaginatedGoodsResponse{}, errors.New("goods service is unavailable")
	}
	return a.goods.ListGoods(ctx, params)
}

func nullIfEmpty(value string) any {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	return trimmed
}

func formatNullTime(value sql.NullTime) string {
	if !value.Valid {
		return ""
	}
	return value.Time.Format(time.RFC3339)
}
