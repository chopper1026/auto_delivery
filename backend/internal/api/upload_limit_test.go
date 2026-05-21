package api

import (
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"auto_delivery/backend/internal/config"

	"github.com/gin-gonic/gin"
)

func TestUploadBodyLimitRejectsOversizedRequestBeforeHandler(t *testing.T) {
	app := New(config.Config{StaticDir: t.TempDir(), UploadBodyLimit: 8}, nil, nil)
	app.router.POST("/body-limit-test", func(c *gin.Context) {
		_, err := io.ReadAll(c.Request.Body)
		if err == nil {
			c.Status(http.StatusOK)
			return
		}
		var maxBytesError *http.MaxBytesError
		if errors.As(err, &maxBytesError) {
			c.Status(http.StatusRequestEntityTooLarge)
			return
		}
		jsonError(c, http.StatusBadRequest, "invalid body")
	})

	req := httptest.NewRequest(http.MethodPost, "/body-limit-test", strings.NewReader(strings.Repeat("x", 32)))
	rec := httptest.NewRecorder()

	app.Handler().ServeHTTP(rec, req)

	if rec.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("status = %d, want 413", rec.Code)
	}
}
