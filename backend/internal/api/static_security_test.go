package api

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"auto_delivery/backend/internal/config"
)

func TestStaticFilesRejectTraversalOutsideStaticDir(t *testing.T) {
	root := t.TempDir()
	staticDir := filepath.Join(root, "public")
	if err := os.MkdirAll(staticDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(staticDir, "index.html"), []byte("index"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, ".env"), []byte("SECRET=value"), 0o644); err != nil {
		t.Fatal(err)
	}

	app := New(config.Config{StaticDir: staticDir}, nil, nil)
	for _, path := range []string{"/../.env", "/%2e%2e/.env", "/..%2f.env", "/assets/../../.env"} {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		rec := httptest.NewRecorder()
		app.Handler().ServeHTTP(rec, req)
		if rec.Code != http.StatusNotFound && rec.Code != http.StatusBadRequest {
			t.Fatalf("path %q status = %d, want 404 or 400", path, rec.Code)
		}
		if strings.Contains(rec.Body.String(), "SECRET=value") {
			t.Fatalf("path %q leaked file outside static dir: %q", path, rec.Body.String())
		}
	}
}
