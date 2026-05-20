package testutil

import (
	"context"
	"database/sql"
	"net/url"
	"os"
	"strings"
	"testing"

	"auto_delivery/backend/internal/migrations"

	"github.com/jackc/pgx/v5/pgxpool"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
)

func IsSafeTestDatabaseURL(raw string) bool {
	parsed, err := url.Parse(raw)
	if err != nil {
		return false
	}
	dbName := strings.TrimPrefix(parsed.Path, "/")
	schema := parsed.Query().Get("search_path")
	return strings.Contains(strings.ToLower(dbName), "test") || strings.Contains(strings.ToLower(schema), "test")
}

func OpenTestDB(t *testing.T) *pgxpool.Pool {
	t.Helper()
	raw := os.Getenv("TEST_DATABASE_URL")
	if raw == "" {
		t.Skip("TEST_DATABASE_URL is not set")
	}
	if !IsSafeTestDatabaseURL(raw) {
		t.Fatalf("refusing to use unsafe TEST_DATABASE_URL %q", raw)
	}
	runMigrations(t, raw)
	pool, err := pgxpool.New(context.Background(), raw)
	if err != nil {
		t.Fatalf("connect test database: %v", err)
	}
	if err := pool.Ping(context.Background()); err != nil {
		pool.Close()
		t.Fatalf("ping test database: %v", err)
	}
	ResetDatabase(t, pool)
	return pool
}

func runMigrations(t *testing.T, raw string) {
	t.Helper()
	db, err := sql.Open("pgx", raw)
	if err != nil {
		t.Fatalf("open migration database: %v", err)
	}
	defer db.Close()
	goose.SetBaseFS(migrations.FS)
	if err := goose.SetDialect("postgres"); err != nil {
		t.Fatalf("set goose dialect: %v", err)
	}
	if err := goose.Up(db, "."); err != nil {
		t.Fatalf("run migrations: %v", err)
	}
}

func ResetDatabase(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
		TRUNCATE
			download_logs,
			admin_audit_logs,
			redemption_files,
			redemptions,
			goods_files,
			card_keys,
			goods,
			admin_sessions,
			admin_users,
			system_settings
		RESTART IDENTITY CASCADE
	`)
	if err != nil {
		t.Fatalf("reset test database: %v", err)
	}
}
