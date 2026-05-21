package api

import (
	"net"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

func securityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("Referrer-Policy", "same-origin")
		c.Header("Content-Security-Policy", "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'")
		if c.Request.TLS != nil || strings.HasPrefix(c.GetHeader("X-Forwarded-Proto"), "https") {
			c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		}
		c.Next()
	}
}

func maxRequestBody(bytes int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		if bytes > 0 {
			c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, bytes)
		}
		c.Next()
	}
}

func isTrustedProxy(remoteAddr string, cidrs []string) bool {
	host, _, err := net.SplitHostPort(remoteAddr)
	if err != nil {
		host = remoteAddr
	}
	ip := net.ParseIP(host)
	if ip == nil {
		return false
	}
	for _, raw := range cidrs {
		trimmed := strings.TrimSpace(raw)
		if trimmed == "" {
			continue
		}
		_, network, err := net.ParseCIDR(trimmed)
		if err == nil && network.Contains(ip) {
			return true
		}
		if parsed := net.ParseIP(trimmed); parsed != nil && parsed.Equal(ip) {
			return true
		}
	}
	return false
}

func firstForwardedFor(value string) string {
	parts := strings.Split(value, ",")
	return strings.TrimSpace(parts[0])
}

func remoteAddrHost(remoteAddr string) string {
	host, _, err := net.SplitHostPort(remoteAddr)
	if err == nil {
		return host
	}
	if net.ParseIP(remoteAddr) != nil {
		return remoteAddr
	}
	return ""
}
