package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"auto_delivery/backend/internal/config"
	"auto_delivery/backend/internal/testutil"

	"github.com/jackc/pgx/v5/pgxpool"
)

func newIntegrationApp(t *testing.T, pool *pgxpool.Pool) *App {
	t.Helper()
	root := t.TempDir()
	staticDir := filepath.Join(root, "static")
	if err := os.MkdirAll(staticDir, 0o755); err != nil {
		t.Fatalf("create static dir: %v", err)
	}
	if err := os.WriteFile(filepath.Join(staticDir, "index.html"), []byte("<!doctype html><html><body>test</body></html>"), 0o644); err != nil {
		t.Fatalf("write static index: %v", err)
	}
	cfg := config.Config{
		AppEnv:            "test",
		AdminUsername:     "admin",
		AdminPassword:     "test1234567890",
		SecretPepper:      "0123456789abcdef0123456789abcdef",
		SessionCookieName: "auto_delivery_test_admin",
		AppBaseURL:        "http://localhost:18080",
		StorageRoot:       filepath.Join(root, "storage"),
		StaticDir:         staticDir,
		SessionTTL:        time.Hour,
		DownloadClaimTTL:  time.Minute,
	}
	app := New(cfg, pool, nil)
	if err := app.EnsureStorage(); err != nil {
		t.Fatalf("prepare storage: %v", err)
	}
	if err := app.EnsureInitialAdmin(t.Context()); err != nil {
		t.Fatalf("create initial admin: %v", err)
	}
	return app
}

func performJSONRequest(t *testing.T, app *App, method string, path string, cookie *http.Cookie, csrf string, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "integration-test")
	if csrf != "" {
		req.Header.Set("X-CSRF-Token", csrf)
	}
	if cookie != nil {
		req.AddCookie(cookie)
	}
	return performRequest(t, app, req)
}

func performRequest(t *testing.T, app *App, req *http.Request) *httptest.ResponseRecorder {
	t.Helper()
	recorder := httptest.NewRecorder()
	app.Handler().ServeHTTP(recorder, req)
	return recorder
}

func decodeResponse[T any](t *testing.T, recorder *httptest.ResponseRecorder) T {
	t.Helper()
	var out T
	if err := json.Unmarshal(recorder.Body.Bytes(), &out); err != nil {
		t.Fatalf("decode response %q: %v", recorder.Body.String(), err)
	}
	return out
}

func loginIntegrationAdmin(t *testing.T, app *App) (*http.Cookie, string) {
	t.Helper()
	recorder := performJSONRequest(t, app, http.MethodPost, "/api/admin/login", nil, "", `{"username":"admin","password":"test1234567890"}`)
	if recorder.Code != http.StatusOK {
		t.Fatalf("login status = %d, body = %s", recorder.Code, recorder.Body.String())
	}
	var payload struct {
		CSRFToken string `json:"csrfToken"`
	}
	payload = decodeResponse[struct {
		CSRFToken string `json:"csrfToken"`
	}](t, recorder)
	if payload.CSRFToken == "" {
		t.Fatal("login did not return csrf token")
	}
	for _, cookie := range recorder.Result().Cookies() {
		if cookie.Name == app.cfg.SessionCookieName {
			return cookie, payload.CSRFToken
		}
	}
	t.Fatal("login did not set session cookie")
	return nil, ""
}

func TestAdminAuthIntegrationLoginAndSession(t *testing.T) {
	pool := testutil.OpenTestDB(t)
	defer pool.Close()
	app := newIntegrationApp(t, pool)
	cookie, _ := loginIntegrationAdmin(t, app)

	recorder := performJSONRequest(t, app, http.MethodGet, "/api/admin/session", cookie, "", "")
	if recorder.Code != http.StatusOK {
		t.Fatalf("session status = %d, body = %s", recorder.Code, recorder.Body.String())
	}
	var payload struct {
		CSRFToken string `json:"csrfToken"`
		Admin     struct {
			Username string `json:"username"`
		} `json:"admin"`
	}
	payload = decodeResponse[struct {
		CSRFToken string `json:"csrfToken"`
		Admin     struct {
			Username string `json:"username"`
		} `json:"admin"`
	}](t, recorder)
	if payload.Admin.Username != "admin" || payload.CSRFToken == "" {
		t.Fatalf("session payload = %#v", payload)
	}
}
