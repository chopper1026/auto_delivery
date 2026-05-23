package config

import "testing"

func TestLoadAllowsAdminPasswordShorterThanTwelveCharacters(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://example")
	t.Setenv("ADMIN_USERNAME", "admin")
	t.Setenv("ADMIN_PASSWORD", "short")
	t.Setenv("SECRET_PEPPER", "0123456789abcdef0123456789abcdef")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if cfg.AdminPassword != "short" {
		t.Fatalf("AdminPassword = %q", cfg.AdminPassword)
	}
}
