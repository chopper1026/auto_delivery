package api

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"auto_delivery/backend/internal/config"

	"github.com/gin-gonic/gin"
)

func TestSecurityHeadersAreSet(t *testing.T) {
	app := New(config.Config{StaticDir: t.TempDir(), AppEnv: "production"}, nil, nil)
	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	rec := httptest.NewRecorder()

	app.Handler().ServeHTTP(rec, req)

	for name, want := range map[string]string{
		"X-Content-Type-Options": "nosniff",
		"Referrer-Policy":        "same-origin",
		"X-Frame-Options":        "DENY",
	} {
		if got := rec.Header().Get(name); got != want {
			t.Fatalf("%s = %q, want %q", name, got, want)
		}
	}
	if !strings.Contains(rec.Header().Get("Content-Security-Policy"), "default-src 'self'") {
		t.Fatalf("CSP missing default-src self: %q", rec.Header().Get("Content-Security-Policy"))
	}
}

func TestClientIPOnlyTrustsForwardedForFromTrustedProxy(t *testing.T) {
	app := New(config.Config{
		StaticDir:         t.TempDir(),
		TrustedProxyCIDRs: []string{"10.0.0.0/8"},
	}, nil, nil)
	app.router.GET("/ip-test", func(c *gin.Context) {
		c.String(http.StatusOK, app.clientIP(c))
	})

	untrustedReq := httptest.NewRequest(http.MethodGet, "/ip-test", nil)
	untrustedReq.RemoteAddr = "203.0.113.10:1234"
	untrustedReq.Header.Set("X-Forwarded-For", "198.51.100.99")
	untrustedRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(untrustedRec, untrustedReq)
	if got := untrustedRec.Body.String(); got == "198.51.100.99" {
		t.Fatalf("untrusted proxy forwarded IP was accepted: %s", got)
	}

	trustedReq := httptest.NewRequest(http.MethodGet, "/ip-test", nil)
	trustedReq.RemoteAddr = "10.1.2.3:1234"
	trustedReq.Header.Set("X-Forwarded-For", "198.51.100.99, 10.1.2.3")
	trustedRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(trustedRec, trustedReq)
	if got := trustedRec.Body.String(); got != "198.51.100.99" {
		t.Fatalf("trusted proxy client IP = %q, want first forwarded IP", got)
	}
}
