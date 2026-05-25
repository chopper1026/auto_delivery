package api

import (
	"bytes"
	"context"
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

type updateGoodsRequest struct {
	Name        *string `json:"name"`
	TextContent *string `json:"textContent"`
	Note        *string `json:"note"`
	Status      *string `json:"status"`
}

func (a *App) handleCreateGoods(c *gin.Context) {
	admin := currentAdmin(c)
	var req createGoodsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		jsonError(c, http.StatusBadRequest, "invalid goods request")
		return
	}
	id, err := a.createGoods(c.Request.Context(), domain.CreateGoodsInput{
		Name:        req.Name,
		Type:        req.Type,
		TextContent: req.TextContent,
		Note:        req.Note,
	})
	if err != nil {
		if errors.Is(err, domain.ErrInvalidGoodsInput) {
			jsonError(c, http.StatusBadRequest, "invalid goods request")
			return
		}
		jsonError(c, http.StatusInternalServerError, "failed to create goods")
		return
	}
	action := "goods.create_text"
	if strings.EqualFold(strings.TrimSpace(req.Type), "FILE") {
		action = "goods.create_file"
	}
	a.writeAudit(c.Request.Context(), admin.ID, action, "Goods", id, a.clientIP(c), userAgent(c), "")
	response, _ := a.listGoods(c.Request.Context(), defaultGoodsListParams())
	c.JSON(http.StatusCreated, gin.H{"id": id, "items": response.Items})
}

func (a *App) handleUpdateGoods(c *gin.Context) {
	admin := currentAdmin(c)
	var req updateGoodsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		jsonError(c, http.StatusBadRequest, "invalid goods update request")
		return
	}
	err := a.updateGoods(c.Request.Context(), c.Param("id"), domain.UpdateGoodsInput{
		Name:        req.Name,
		TextContent: req.TextContent,
		Note:        req.Note,
		Status:      req.Status,
	})
	if err != nil {
		switch {
		case errors.Is(err, domain.ErrInvalidGoodsInput):
			jsonError(c, http.StatusBadRequest, "invalid goods update request")
			return
		case errors.Is(err, domain.ErrGoodsNotFound):
			jsonError(c, http.StatusNotFound, "goods not found")
			return
		default:
			jsonError(c, http.StatusInternalServerError, "failed to update goods")
			return
		}
	}
	action := "goods.update"
	if req.Status != nil && req.Name == nil && req.TextContent == nil && req.Note == nil {
		status := strings.ToUpper(strings.TrimSpace(*req.Status))
		action = "goods." + strings.ToLower(status)
	}
	a.writeAudit(c.Request.Context(), admin.ID, action, "Goods", c.Param("id"), a.clientIP(c), userAgent(c), "")
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (a *App) handleDeleteGoods(c *gin.Context) {
	admin := currentAdmin(c)
	err := a.deleteGoods(c.Request.Context(), c.Param("id"))
	if err != nil {
		switch {
		case errors.Is(err, domain.ErrGoodsHasCardKeys):
			jsonError(c, http.StatusConflict, "goods has card keys")
			return
		case errors.Is(err, domain.ErrGoodsNotFound):
			jsonError(c, http.StatusNotFound, "goods not found")
			return
		default:
			jsonError(c, http.StatusInternalServerError, "failed to delete goods")
			return
		}
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
	}
	if err := a.registerGoodsFiles(c.Request.Context(), goodsID, saved); err != nil {
		switch {
		case errors.Is(err, domain.ErrGoodsNotFound):
			jsonError(c, http.StatusNotFound, "file goods not found")
			return
		case errors.Is(err, domain.ErrGoodsNotFileType):
			jsonError(c, http.StatusBadRequest, "goods is not file type")
			return
		default:
			jsonError(c, http.StatusInternalServerError, "failed to register uploaded file")
			return
		}
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
	entries, err := a.listGoodsFileExportEntries(c.Request.Context(), c.Param("id"), scope)
	if err != nil {
		jsonError(c, http.StatusInternalServerError, "failed to export files")
		return
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
		_ = csvWriter.Write([]string{item.OriginalName, item.Status, item.CardKeyMask, formatOptionalTime(item.ReservedAt), formatOptionalTime(item.RedeemedAt)})
		zipEntries = append(zipEntries, storage.ZipEntry{Path: item.StoragePath, EntryName: item.OriginalName})
	}
	csvWriter.Flush()
	filename := storage.BuildZipFilename(entries[0].GoodsName, len(entries), time.Now())
	c.Header("Content-Type", "application/zip")
	c.Header("Content-Disposition", storage.AttachmentDisposition(filename))
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

func (a *App) createGoods(ctx context.Context, input domain.CreateGoodsInput) (string, error) {
	if a.goods == nil {
		return "", errors.New("goods service is unavailable")
	}
	return a.goods.CreateGoods(ctx, input)
}

func (a *App) updateGoodsStatus(ctx context.Context, id string, status string) error {
	if a.goods == nil {
		return errors.New("goods service is unavailable")
	}
	return a.goods.UpdateGoodsStatus(ctx, id, status)
}

func (a *App) updateGoods(ctx context.Context, id string, input domain.UpdateGoodsInput) error {
	if a.goods == nil {
		return errors.New("goods service is unavailable")
	}
	return a.goods.UpdateGoods(ctx, id, input)
}

func (a *App) deleteGoods(ctx context.Context, id string) error {
	if a.goods == nil {
		return errors.New("goods service is unavailable")
	}
	return a.goods.DeleteGoods(ctx, id)
}

func (a *App) registerGoodsFiles(ctx context.Context, goodsID string, saved []storage.SavedFile) error {
	if a.goods == nil {
		return errors.New("goods service is unavailable")
	}
	files := make([]domain.GoodsFileUpload, 0, len(saved))
	for _, item := range saved {
		files = append(files, domain.GoodsFileUpload{
			OriginalName: item.OriginalName,
			StoredName:   item.StoredName,
			StoragePath:  item.StoragePath,
			SizeBytes:    item.SizeBytes,
			MimeType:     item.MimeType,
			SHA256:       item.SHA256,
		})
	}
	return a.goods.RegisterGoodsFiles(ctx, goodsID, files)
}

func (a *App) listGoodsFileExportEntries(ctx context.Context, goodsID string, scope string) ([]domain.GoodsFileExportEntry, error) {
	if a.goods == nil {
		return nil, errors.New("goods service is unavailable")
	}
	return a.goods.ListGoodsFileExportEntries(ctx, goodsID, scope)
}

func formatOptionalTime(value *time.Time) string {
	if value == nil {
		return ""
	}
	return value.Format(time.RFC3339)
}
