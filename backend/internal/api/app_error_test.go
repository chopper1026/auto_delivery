package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"auto_delivery/backend/internal/config"

	"github.com/gin-gonic/gin"
)

func TestJSONErrorLocalizesUserVisibleMessages(t *testing.T) {
	tests := []struct {
		name    string
		status  int
		message string
		want    string
	}{
		{
			name:    "redeem failure",
			status:  http.StatusBadRequest,
			message: "card key is not redeemable",
			want:    "卡密无效、已过期或已被使用。",
		},
		{
			name:    "dynamic settings validation",
			status:  http.StatusBadRequest,
			message: "service address must use http or https",
			want:    "服务地址必须使用 http 或 https。",
		},
		{
			name:    "unknown client error",
			status:  http.StatusBadRequest,
			message: "invalid storage metadata",
			want:    "请求参数无效，请检查后重试。",
		},
		{
			name:    "unknown server error",
			status:  http.StatusInternalServerError,
			message: "database connection detail",
			want:    "服务器暂时无法处理请求，请稍后重试。",
		},
		{
			name:    "existing Chinese message",
			status:  http.StatusBadRequest,
			message: "请输入卡密。",
			want:    "请输入卡密。",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(recorder)

			jsonError(c, tt.status, tt.message)

			if recorder.Code != tt.status {
				t.Fatalf("status = %d, want %d", recorder.Code, tt.status)
			}
			payload := decodeJSONError(t, recorder)
			if payload.Error != tt.want {
				t.Fatalf("error = %q, want %q", payload.Error, tt.want)
			}
		})
	}
}

func TestRouteLevelAPIErrorsAreLocalized(t *testing.T) {
	app := newAppWithoutDB(t)

	tests := []struct {
		name   string
		method string
		path   string
		status int
		want   string
	}{
		{
			name:   "unauthorized admin route",
			method: http.MethodGet,
			path:   "/api/admin/session",
			status: http.StatusUnauthorized,
			want:   "请先登录。",
		},
		{
			name:   "missing api route",
			method: http.MethodGet,
			path:   "/api/missing",
			status: http.StatusNotFound,
			want:   "接口不存在。",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, tt.path, nil)
			recorder := performRequest(t, app, req)

			if recorder.Code != tt.status {
				t.Fatalf("status = %d, want %d, body = %s", recorder.Code, tt.status, recorder.Body.String())
			}
			payload := decodeJSONError(t, recorder)
			if payload.Error != tt.want {
				t.Fatalf("error = %q, want %q", payload.Error, tt.want)
			}
		})
	}
}

func newAppWithoutDB(t *testing.T) *App {
	t.Helper()
	root := t.TempDir()
	staticDir := filepath.Join(root, "static")
	if err := os.MkdirAll(staticDir, 0o755); err != nil {
		t.Fatalf("create static dir: %v", err)
	}
	if err := os.WriteFile(filepath.Join(staticDir, "index.html"), []byte("<!doctype html><html><body>test</body></html>"), 0o644); err != nil {
		t.Fatalf("write static index: %v", err)
	}
	return New(config.Config{
		AppEnv:            "test",
		SessionCookieName: "auto_delivery_test_admin",
		StaticDir:         staticDir,
		UploadBodyLimit:   1024 * 1024,
	}, nil, nil)
}

func decodeJSONError(t *testing.T, recorder *httptest.ResponseRecorder) struct {
	Error string `json:"error"`
} {
	t.Helper()
	var payload struct {
		Error string `json:"error"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode error response %q: %v", recorder.Body.String(), err)
	}
	return payload
}
