# Go Version Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 Go/React 重构版本中评审发现的安全、数据一致性、性能、目录结构和测试覆盖问题，让项目达到可部署、可维护、可回归验证的状态。

**Architecture:** 保持生产形态为单个 Go/Gin 服务托管 Vite React 静态资源，但把后端从“大 handler + SQL + 文件 IO”逐步拆成 handler、service、repository、domain 四层。前端保留当前视觉方向，按公开页和后台页做路由级代码拆分，并把复杂后台组件拆成 focused modules。

**Tech Stack:** Go `1.26.3`、Gin `1.12.0`、pgx `5.9.2`、go-redis `9.19.0`、PostgreSQL `18.4`、Redis `8.6.3`、React `19.2.6`、Vite `8.0.13`、TypeScript `6.0.3`、TanStack Query `5.100.11`、Playwright `1.60.0`、Vitest `4.1.6`。

---

## Scope And Assumptions

- Review target: `go-version` 分支当前 worktree 的评审结果。
- Working directory: `.worktrees/go-react-rewrite`
- Do not revert unrelated dirty worktree changes.
- Keep `main` as reference only; do not edit main checkout.
- Every fix must start with a failing test or regression test, then implementation, then verification.
- Database integration tests require `TEST_DATABASE_URL` pointing to a database name or schema containing `test`.

## Priority Order

1. P0 security and data integrity: static path traversal, trusted client IP, upload body limit, stuck download claim, goods inventory overcount.
2. P1 correctness and production hardening: expired card semantics, security headers, cookie policy, stale E2E tests.
3. P2 performance and scale: route code splitting, goods picker pagination/search, overview/log query shape.
4. P3 structure: backend service/repository split and frontend feature folder split.

## Execution Status As Of 2026-05-21

This section is the authoritative progress tracker. The detailed task checkboxes below are retained as the original implementation recipe, not as a one-for-one history of the exact commits that landed.

Latest pushed commits:

- `bd3c49d fix: address go rewrite review findings`
- `b5fbab7 refactor: move read models into backend services`

The continuation after `b5fbab7` completes the remaining Task 8 backend layering and P3 frontend feature-folder split.

| Task | Status | What landed | Remaining |
| --- | --- | --- | --- |
| Task 1: Add Review Regression Test Skeletons | Complete | Regression coverage was added for static containment, security middleware, upload limits, expired download claims, goods count aggregation, card expiration semantics, card goods options, overview query shape, settings validation, logs parsing, and E2E selectors. | None known. |
| Task 2: Harden Static File Serving And Security Middleware | Complete | Static file serving now rejects traversal outside `STATIC_DIR`; security headers are registered; trusted proxy CIDR/IP handling is explicit; secure cookie behavior is configurable. | None known. |
| Task 3: Enforce Upload Body Limits Before Multipart Parsing | Complete | Upload body limit middleware rejects oversized requests before multipart parsing; multipart memory limit uses configuration. | None known. |
| Task 4: Recover Expired Download Claims | Complete | Expired `IN_PROGRESS` download claims can be reused safely; claim, complete, and release paths are represented in `DownloadsService` and `DownloadsRepository`. | None known. |
| Task 5: Fix Goods Inventory Overcount | Complete | Goods inventory and usage counts now use pre-aggregated query shapes to avoid multiplied joins; integration coverage verifies the count behavior. | None known. |
| Task 6: Correct Expired Card Semantics | Complete | Active and expired card filters now distinguish non-expired active cards from active-but-expired cards; overview and card list tests cover the semantics. | None known. |
| Task 7: Reduce Transaction Time And Clean Orphan Files | Complete | Upload cleanup handles DB failures; file redemption reserves inventory in a shorter transaction and compensates failed download preparation. | None known. |
| Task 8: Add Backend Service And Repository Boundaries | Complete | Added admin, goods mutation/upload/export, card generation/delete, and public redemption service/repository boundaries. `admin_handlers.go`, `goods_handlers.go`, `card_handlers.go`, and `public_handlers.go` no longer own DB queries or transactions for those workflows; `app.go` wires `AdminService`, `GoodsService`, `CardKeysService`, `DownloadsService`, and `RedemptionsService`. | None known. |
| Task 9: Add Route-Level Code Splitting | Complete | `frontend/src/App.tsx` uses route-level lazy imports so public/admin routes split into separate chunks. Public and admin pages/components were moved under `frontend/src/features/public/...` and `frontend/src/features/admin/...`; shared UI remains under `frontend/src/components/ui`. | None known. |
| Task 10: Fix Card Generation Goods Picker Scale | Complete | Added query-backed card goods options API and frontend picker search, removing the hard-coded full goods fetch behavior. | None known. |
| Task 11: Improve Query Performance For Overview And Logs | Complete | Overview trend data is aggregated in SQL and performance indexes were added for the reviewed query paths. Admin overview/log SQL now lives in `repository/postgres.AdminRepository` behind `AdminService`. | None known. |
| Task 12: Update E2E And CI-Ready Verification Commands | Complete | E2E selectors were updated; verification documentation was added; Playwright config supports `E2E_BROWSER_CHANNEL=chrome`. | None known. |
| Task 13: Final Full-System Acceptance | Complete | Backend unit/vet/race, frontend tests/typecheck/build/audit, database integration tests, and Chrome-backed E2E checks passed for the continuation. | None known. |

Completed and pushed:

- P0/P1/P2 review remediation covering static path containment, security headers, trusted proxy IP handling, secure cookie policy, upload body limit, expired download claim recovery, goods inventory count aggregation, expired card semantics, upload cleanup, shorter file redemption reservation, route-level code splitting, card goods options search, overview trend SQL aggregation, indexes, selector updates, and verification docs.
- Partial backend layering in `b5fbab7`: domain DTOs plus service/repository wrappers for goods read models, card key read models, settings, and receipt/download claims.

Completed in current continuation:

- Finished Task 8 backend layering for the previously remaining API-owned SQL/transaction paths:
  - Admin login/session/logout/auth, audit writes, overview, and logs moved to `AdminService` and `repository/postgres.AdminRepository`.
  - Goods create/update/delete/upload DB registration/export listing moved to `GoodsService` and `repository/postgres.GoodsRepository`.
  - Card key generation/delete and inventory reservation/release moved to `CardKeysService` and `repository/postgres.CardKeysRepository`.
  - Public card redemption reserve/finalize/fail and ZIP preparation moved to `RedemptionsService` and `repository/postgres.RedemptionsRepository`.
- Finished the frontend P3 feature split:
  - Public redeem/receipt code now lives under `frontend/src/features/public/...`.
  - Admin auth/shell/dashboard/goods/cards/logs/settings/shared code now lives under `frontend/src/features/admin/...`.
  - `@/*` path alias was added for feature code imports in Vite, Vitest, and TypeScript.

Not done yet:

- None known for the review remediation scope. Future cleanup can continue reducing duplicate API wrapper methods, but it is not required by this plan.

Last recorded verification:

- `go test ./... && go vet ./...`
- `TEST_DATABASE_URL='postgresql://auto_delivery:replace-with-a-long-random-database-password@localhost:15432/auto_delivery_test?sslmode=disable' go test ./internal/api -count=1`
- `E2E_BROWSER_CHANNEL=chrome E2E_DATABASE_URL='postgresql://auto_delivery:replace-with-a-long-random-database-password@localhost:15432/auto_delivery_test?sslmode=disable' npm run e2e`
- Current continuation final acceptance:
  - `go test ./... && go vet ./... && go test -race ./...`
  - `npm test -- --run && npm run typecheck && npm run build && npm audit --audit-level=moderate`
  - `TEST_DATABASE_URL='postgresql://auto_delivery:replace-with-a-long-random-database-password@localhost:15432/auto_delivery_test?sslmode=disable' go test ./internal/api -count=1`
  - `E2E_BROWSER_CHANNEL=chrome E2E_DATABASE_URL='postgresql://auto_delivery:replace-with-a-long-random-database-password@localhost:15432/auto_delivery_test?sslmode=disable' npm run e2e`

Known caveats:

- Database integration tests and E2E should run sequentially when sharing the same test database because reset/admin initialization can collide.
- The Playwright bundled browser download timed out in this environment; system Chrome worked through `E2E_BROWSER_CHANNEL=chrome`.
- Local test PostgreSQL was available on `localhost:15432`; Redis was available on `localhost:6379`.

## Target File Structure

Backend target structure:

```text
backend/internal/api/
  app.go
  middleware.go
  admin_handlers.go
  public_handlers.go
  goods_handlers.go
  card_handlers.go
backend/internal/domain/
  card_key.go
  download.go
  goods.go
backend/internal/service/
  card_keys.go
  downloads.go
  goods.go
  settings.go
backend/internal/repository/postgres/
  card_keys.go
  downloads.go
  goods.go
  settings.go
backend/internal/storage/
  storage.go
```

Frontend target structure:

```text
frontend/src/features/public/
  redeem/
  receipt/
frontend/src/features/admin/
  cards/
  goods/
  logs/
  dashboard/
  settings/
frontend/src/components/ui/
frontend/src/lib/
```

---

## Task 1: Add Review Regression Test Skeletons

**Files:**
- Modify: `backend/internal/api/app.go`
- Create: `backend/internal/api/static_security_test.go`
- Create: `backend/internal/api/middleware_security_test.go`
- Create: `backend/internal/api/download_claim_test.go`
- Modify: `backend/internal/api/goods_integration_test.go`
- Modify: `frontend/src/App.tsx`
- Modify: `tests/e2e/admin-flow.spec.ts`
- Modify: `tests/e2e/public-flow.spec.ts`

- [ ] **Step 1: Add static path traversal regression test**

Create `backend/internal/api/static_security_test.go`:

```go
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
	for _, path := range []string{"/../.env", "/%2e%2e/.env", "/..%2f.env"} {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		rec := httptest.NewRecorder()
		app.Handler().ServeHTTP(rec, req)
		if rec.Code != http.StatusNotFound {
			t.Fatalf("path %q status = %d, want 404", path, rec.Code)
		}
		if strings.Contains(rec.Body.String(), "SECRET=value") {
			t.Fatalf("path %q leaked file outside static dir: %q", path, rec.Body.String())
		}
	}
}
```

- [ ] **Step 2: Run test to verify it fails on current implementation**

Run:

```bash
cd backend
go test ./internal/api -run TestStaticFilesRejectTraversalOutsideStaticDir -count=1
```

Expected before fix: FAIL because traversal can serve content outside `STATIC_DIR` or because the current implementation does not explicitly reject traversal.

- [ ] **Step 3: Add middleware regression tests**

Create `backend/internal/api/middleware_security_test.go`:

```go
package api

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"auto_delivery/backend/internal/config"
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
```

- [ ] **Step 4: Run middleware test to verify it fails**

Run:

```bash
cd backend
go test ./internal/api -run TestSecurityHeadersAreSet -count=1
```

Expected before fix: FAIL because headers are missing.

- [ ] **Step 5: Add stuck download claim regression test**

Create `backend/internal/api/download_claim_test.go`:

```go
package api

import (
	"testing"
	"time"
)

func claimIsReusable(state string, expiresAt time.Time, now time.Time) bool {
	return state == "IN_PROGRESS" && !expiresAt.IsZero() && expiresAt.Before(now)
}

func TestExpiredDownloadClaimIsReusable(t *testing.T) {
	now := time.Date(2026, 5, 21, 12, 0, 0, 0, time.UTC)
	if !claimIsReusable("IN_PROGRESS", now.Add(-time.Minute), now) {
		t.Fatal("expired IN_PROGRESS claim should be reusable")
	}
	if claimIsReusable("IN_PROGRESS", now.Add(time.Minute), now) {
		t.Fatal("unexpired IN_PROGRESS claim must not be reusable")
	}
	if claimIsReusable("DOWNLOADED", now.Add(-time.Minute), now) {
		t.Fatal("DOWNLOADED claim must not be reusable")
	}
}
```

This test creates the reusable-claim rule first. In Task 4 this rule moves into the real download service.

- [ ] **Step 6: Update stale E2E admin assertion**

Modify `tests/e2e/admin-flow.spec.ts` and `tests/e2e/public-flow.spec.ts` to replace old text assertion:

```ts
await expect(page.getByLabel("管理员账号")).toBeVisible();
```

Remove assertions that expect `当前管理员`.

- [ ] **Step 7: Verify regression test set**

Run:

```bash
cd backend && go test ./internal/api -run 'TestStaticFilesRejectTraversalOutsideStaticDir|TestSecurityHeadersAreSet|TestExpiredDownloadClaimIsReusable' -count=1
```

Expected at this stage: static/security tests fail until Task 2 and Task 3 are implemented; E2E assertion changes compile.

---

## Task 2: Harden Static File Serving And Security Middleware

**Files:**
- Modify: `backend/internal/api/app.go`
- Create: `backend/internal/api/middleware.go`
- Modify: `backend/internal/config/config.go`
- Test: `backend/internal/api/static_security_test.go`
- Test: `backend/internal/api/middleware_security_test.go`

- [ ] **Step 1: Add configuration fields**

Modify `backend/internal/config/config.go`:

```go
TrustedProxyCIDRs  []string `env:"TRUSTED_PROXY_CIDRS" envSeparator:","`
ForceSecureCookies bool     `env:"FORCE_SECURE_COOKIES" envDefault:"false"`
```

- [ ] **Step 2: Add middleware file**

Create `backend/internal/api/middleware.go`:

```go
package api

import (
	"net"
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
```

- [ ] **Step 3: Register security headers**

Modify `backend/internal/api/app.go`:

```go
router.Use(gin.Logger(), gin.Recovery(), securityHeaders())
```

- [ ] **Step 4: Replace `clientIP` with trusted proxy logic**

Modify `clientIP` in `backend/internal/api/app.go`:

```go
func (a *App) clientIP(c *gin.Context) string {
	if forwarded := strings.TrimSpace(c.GetHeader("X-Forwarded-For")); forwarded != "" && isTrustedProxy(c.Request.RemoteAddr, a.cfg.TrustedProxyCIDRs) {
		return firstForwardedFor(forwarded)
	}
	return c.ClientIP()
}
```

Then replace every `clientIP(c)` call with `a.clientIP(c)`.

- [ ] **Step 5: Make cookie secure policy explicit**

Add method in `backend/internal/api/admin_handlers.go`:

```go
func (a *App) secureCookies() bool {
	return a.cfg.ForceSecureCookies || strings.HasPrefix(a.cfg.AppBaseURL, "https://")
}
```

Use it in login and logout cookies:

```go
Secure: a.secureCookies(),
```

- [ ] **Step 6: Make static serving containment-safe**

Replace `mountStatic` path handling in `backend/internal/api/app.go` with:

```go
func (a *App) mountStatic(router *gin.Engine) {
	staticDir, err := filepath.Abs(a.cfg.StaticDir)
	if err != nil {
		staticDir = a.cfg.StaticDir
	}
	router.NoRoute(func(c *gin.Context) {
		if strings.HasPrefix(c.Request.URL.Path, "/api/") {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}
		requestPath := filepath.Clean(strings.TrimPrefix(c.Request.URL.Path, "/"))
		if requestPath == "." {
			requestPath = "index.html"
		}
		candidate, err := filepath.Abs(filepath.Join(staticDir, requestPath))
		if err != nil {
			c.Status(http.StatusNotFound)
			return
		}
		rel, err := filepath.Rel(staticDir, candidate)
		if err != nil || rel == ".." || strings.HasPrefix(rel, ".."+string(filepath.Separator)) || filepath.IsAbs(rel) {
			c.Status(http.StatusNotFound)
			return
		}
		if info, err := os.Stat(candidate); err == nil && !info.IsDir() {
			c.File(candidate)
			return
		}
		c.File(filepath.Join(staticDir, "index.html"))
	})
}
```

- [ ] **Step 7: Verify**

Run:

```bash
cd backend
go test ./internal/api -run 'TestStaticFilesRejectTraversalOutsideStaticDir|TestSecurityHeadersAreSet' -count=1
go test ./...
go vet ./...
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add backend/internal/config/config.go backend/internal/api/app.go backend/internal/api/middleware.go backend/internal/api/static_security_test.go backend/internal/api/middleware_security_test.go
git commit -m "fix: harden static serving and security middleware"
```

---

## Task 3: Enforce Upload Body Limits Before Multipart Parsing

**Files:**
- Modify: `backend/internal/api/app.go`
- Modify: `backend/internal/api/goods_handlers.go`
- Create: `backend/internal/api/upload_limit_test.go`
- Modify: `.env.example`
- Modify: `README.md`

- [ ] **Step 1: Add failing upload limit test**

Create `backend/internal/api/upload_limit_test.go`:

```go
package api

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"auto_delivery/backend/internal/config"
)

func TestUploadBodyLimitRejectsOversizedRequestBeforeHandler(t *testing.T) {
	app := New(config.Config{StaticDir: t.TempDir(), UploadBodyLimit: 8}, nil, nil)
	req := httptest.NewRequest(http.MethodPost, "/api/admin/goods/example/files", strings.NewReader(strings.Repeat("x", 32)))
	req.Header.Set("Content-Type", "multipart/form-data; boundary=x")
	rec := httptest.NewRecorder()

	app.Handler().ServeHTTP(rec, req)

	if rec.Code != http.StatusRequestEntityTooLarge && rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 413 before parsing or auth rejection before handler", rec.Code)
	}
}
```

- [ ] **Step 2: Implement body limit middleware**

Add in `backend/internal/api/middleware.go`:

```go
func maxRequestBody(bytes int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		if bytes > 0 {
			c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, bytes)
		}
		c.Next()
	}
}
```

Add `net/http` to `backend/internal/api/middleware.go` imports when adding this middleware.

Register after recovery in `backend/internal/api/app.go`:

```go
router.Use(maxRequestBody(a.cfg.UploadBodyLimit))
```

- [ ] **Step 3: Use configured multipart memory**

Modify:

```go
router.MaxMultipartMemory = minPositiveInt64(a.cfg.UploadBodyLimit, storage.MaxUploadBytes)
```

Add helper:

```go
func minPositiveInt64(a int64, b int64) int64 {
	if a <= 0 {
		return b
	}
	if b <= 0 || a < b {
		return a
	}
	return b
}
```

- [ ] **Step 4: Verify upload docs**

Update `.env.example`:

```text
ADMIN_UPLOAD_BODY_LIMIT_BYTES="104857600"
```

Update `README.md` command notes to mention the admin upload request cap.

- [ ] **Step 5: Verify**

Run:

```bash
cd backend
go test ./internal/api -run TestUploadBodyLimitRejectsOversizedRequestBeforeHandler -count=1
go test ./...
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/internal/api/app.go backend/internal/api/middleware.go backend/internal/api/upload_limit_test.go .env.example README.md
git commit -m "fix: enforce upload body limit"
```

---

## Task 4: Recover Expired Download Claims

**Files:**
- Modify: `backend/internal/api/public_handlers.go`
- Modify: `backend/internal/api/redemption_integration_test.go`
- Test: `backend/internal/api/download_claim_test.go`

- [ ] **Step 1: Extend integration test for expired claims**

Modify `backend/internal/api/redemption_integration_test.go` to insert:

```go
_, err = db.Exec(t.Context(), `
	UPDATE redemptions
	SET download_state = 'IN_PROGRESS',
	    download_claim_token_hash = 'expired',
	    download_claim_expires_at = now() - interval '1 minute'
	WHERE id = $1
`, redemptionID)
if err != nil {
	t.Fatalf("expire claim: %v", err)
}

expiredRecovered, err := app.claimDownload(t.Context(), receiptToken, "127.0.0.1", "integration-test")
if err != nil {
	t.Fatalf("expired claim should be reusable: %v", err)
}
if expiredRecovered.claimToken == "" {
	t.Fatal("expected recovered claim token")
}
```

- [ ] **Step 2: Change claim query to recover expired in-progress rows**

In `backend/internal/api/public_handlers.go`, before rejecting `IN_PROGRESS`, add:

```go
_, _ = a.db.Exec(ctx, `
	UPDATE redemptions
	SET download_state = 'AVAILABLE',
	    download_claim_token_hash = NULL,
	    download_claim_expires_at = NULL
	WHERE receipt_token_hash = $1
	  AND download_state = 'IN_PROGRESS'
	  AND download_count = 0
	  AND download_claim_expires_at < now()
`, receiptHash)
```

Then re-read the row, or use a single `UPDATE ... WHERE ... RETURNING` flow that only claims rows where:

```sql
download_count = 0
AND (
  download_state = 'AVAILABLE'
  OR (download_state = 'IN_PROGRESS' AND download_claim_expires_at < now())
)
```

- [ ] **Step 3: Make claim update atomic**

Replace the update condition with:

```sql
WHERE id = $3
  AND download_count = 0
  AND (
    download_state = 'AVAILABLE'
    OR (download_state = 'IN_PROGRESS' AND download_claim_expires_at < now())
  )
```

- [ ] **Step 4: Verify**

Run:

```bash
cd backend
go test ./internal/api -run 'TestExpiredDownloadClaimIsReusable|TestDownloadClaimReleaseIntegration' -count=1
TEST_DATABASE_URL='postgresql://auto_delivery:auto_delivery@localhost:5432/auto_delivery_test?sslmode=disable' go test ./internal/api -run TestDownloadClaimReleaseIntegration -count=1
```

Expected: unit test PASS; integration test PASS when test DB is available.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/api/public_handlers.go backend/internal/api/download_claim_test.go backend/internal/api/redemption_integration_test.go
git commit -m "fix: recover expired download claims"
```

---

## Task 5: Fix Goods Inventory Overcount

**Files:**
- Modify: `backend/internal/api/goods_handlers.go`
- Modify: `backend/internal/api/goods_integration_test.go`
- Modify: `backend/internal/api/admin_handlers.go`
- Create: `backend/internal/api/goods_counts_test.go`

- [ ] **Step 1: Add SQL shape unit test**

Create `backend/internal/api/goods_counts_test.go`:

```go
package api

import (
	"strings"
	"testing"
)

func TestGoodsListQueryUsesPreAggregatedCounts(t *testing.T) {
	query := goodsListQuery("")
	if !strings.Contains(query, "file_counts") {
		t.Fatalf("goods list query must pre-aggregate file counts: %s", query)
	}
	if strings.Contains(query, "COUNT(f.id)::int AS total") {
		t.Fatalf("goods list query must not count joined file rows directly: %s", query)
	}
}
```

- [ ] **Step 2: Extract goods list SQL into function**

Add in `backend/internal/api/goods_handlers.go`:

```go
func goodsListQuery(where string) string {
	return fmt.Sprintf(`
		WITH file_counts AS (
			SELECT goods_id,
			       COUNT(*)::int AS total,
			       COUNT(*) FILTER (WHERE status = 'AVAILABLE')::int AS available,
			       COUNT(*) FILTER (WHERE status = 'RESERVED')::int AS reserved,
			       COUNT(*) FILTER (WHERE status = 'REDEEMED')::int AS redeemed
			FROM goods_files
			GROUP BY goods_id
		),
		card_counts AS (
			SELECT goods_id, COUNT(*)::int AS card_keys
			FROM card_keys
			GROUP BY goods_id
		),
		redemption_counts AS (
			SELECT goods_id, COUNT(*)::int AS redemptions
			FROM redemptions
			GROUP BY goods_id
		)
		SELECT g.id::text, g.name, g.type::text, COALESCE(g.text_content, ''), COALESCE(g.note, ''), g.status::text,
		       g.created_at, g.updated_at,
		       COALESCE(fc.total, 0), COALESCE(fc.available, 0), COALESCE(fc.reserved, 0), COALESCE(fc.redeemed, 0),
		       COALESCE(cc.card_keys, 0), COALESCE(rc.redemptions, 0)
		FROM goods g
		LEFT JOIN file_counts fc ON fc.goods_id = g.id
		LEFT JOIN card_counts cc ON cc.goods_id = g.id
		LEFT JOIN redemption_counts rc ON rc.goods_id = g.id
		%s
		ORDER BY g.created_at DESC
		LIMIT $%%d OFFSET $%%d
	`, where)
}
```

Use `fmt.Sprintf(goodsListQuery(where), limitPlaceholder, offsetPlaceholder)` at the call site.

- [ ] **Step 3: Fix overview file inventory if needed**

Keep `loadFileInventory` because it only joins `goods_files` and does not multiply counts. Add a regression test if future joins are introduced.

- [ ] **Step 4: Add integration fixture for multiplied joins**

In `backend/internal/api/goods_integration_test.go`, create one goods item with 2 files, 3 card keys, 3 redemptions, then assert:

```go
if got, want := payload.Items[0].Inventory.Total, 2; got != want {
	t.Fatalf("inventory total = %d, want %d", got, want)
}
```

- [ ] **Step 5: Verify**

Run:

```bash
cd backend
go test ./internal/api -run 'TestGoodsListQueryUsesPreAggregatedCounts|TestFileDeliveryFullFlowIntegration' -count=1
go test ./...
```

Expected: PASS; integration test skips only when `TEST_DATABASE_URL` is unset.

- [ ] **Step 6: Commit**

```bash
git add backend/internal/api/goods_handlers.go backend/internal/api/goods_counts_test.go backend/internal/api/goods_integration_test.go
git commit -m "fix: pre-aggregate goods inventory counts"
```

---

## Task 6: Correct Expired Card Semantics

**Files:**
- Modify: `backend/internal/api/admin_handlers.go`
- Modify: `backend/internal/api/card_handlers.go`
- Modify: `backend/internal/api/card_handlers_test.go`
- Modify: `frontend/src/lib/displayLabels.ts`

- [ ] **Step 1: Define active and expired SQL helpers**

In `backend/internal/api/admin_handlers.go`:

```go
func activeCardKeysWhereClause() string {
	return "status = 'ACTIVE' AND (expires_at IS NULL OR expires_at >= now())"
}

func expiredCardKeysWhereClause() string {
	return "status = 'EXPIRED' OR (status = 'ACTIVE' AND expires_at < now())"
}
```

- [ ] **Step 2: Update overview counts**

Replace:

```go
SELECT count(*) FROM card_keys WHERE status = 'ACTIVE'
```

with:

```go
`SELECT count(*) FROM card_keys WHERE ` + activeCardKeysWhereClause()
```

- [ ] **Step 3: Update card list status filter**

In `buildCardKeyListWhere`, if `params.Status == "ACTIVE"`, use `activeCardKeysWhereClause()` for `c`. If `params.Status == "EXPIRED"`, use `expiredCardKeysWhereClause()` for `c`.

Concrete pattern:

```go
case "ACTIVE":
	conditions = append(conditions, "(c.status = 'ACTIVE' AND (c.expires_at IS NULL OR c.expires_at >= now()))")
case "EXPIRED":
	conditions = append(conditions, "(c.status = 'EXPIRED' OR (c.status = 'ACTIVE' AND c.expires_at < now()))")
default:
	args = append(args, params.Status)
	conditions = append(conditions, fmt.Sprintf("c.status = $%d", len(args)))
```

- [ ] **Step 4: Add tests**

In `backend/internal/api/card_handlers_test.go`:

```go
func TestActiveCardKeysWhereClauseExcludesPastDueActiveCards(t *testing.T) {
	clause := activeCardKeysWhereClause()
	if !strings.Contains(clause, "expires_at >= now()") {
		t.Fatalf("active clause should exclude expired active cards: %s", clause)
	}
}
```

- [ ] **Step 5: Verify**

Run:

```bash
cd backend
go test ./internal/api -run 'TestActiveCardKeysWhereClauseExcludesPastDueActiveCards|TestExpiredCardKeysWhereClauseIncludesActivePastDue' -count=1
go test ./...
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/internal/api/admin_handlers.go backend/internal/api/card_handlers.go backend/internal/api/card_handlers_test.go
git commit -m "fix: align expired card status semantics"
```

---

## Task 7: Reduce Transaction Time And Clean Orphan Files

**Files:**
- Modify: `backend/internal/api/public_handlers.go`
- Modify: `backend/internal/api/goods_handlers.go`
- Modify: `backend/internal/storage/storage.go`
- Modify: `backend/internal/api/goods_integration_test.go`
- Modify: `backend/internal/api/redemption_integration_test.go`

- [ ] **Step 1: Add cleanup helper**

In `backend/internal/storage/storage.go`:

```go
func RemoveSavedFiles(files []SavedFile) {
	for _, file := range files {
		if file.StoragePath != "" {
			_ = os.Remove(file.StoragePath)
		}
	}
}

func RemovePath(path string) {
	if path != "" {
		_ = os.Remove(path)
	}
}
```

- [ ] **Step 2: Clean uploaded files if DB commit fails**

In `handleUploadGoodsFiles`, after `saved := []storage.SavedFile{}` add:

```go
committed := false
defer func() {
	if !committed {
		storage.RemoveSavedFiles(saved)
	}
}()
```

After commit succeeds:

```go
committed = true
```

- [ ] **Step 3: Move ZIP creation after short reservation transaction**

Split `redeemCardKey` into:

```go
func (a *App) reserveRedemption(ctx context.Context, cardKey string, ip string, ua string) (reservedRedemption, error)
func (a *App) finalizeFileRedemption(ctx context.Context, reserved reservedRedemption) error
func (a *App) failFileRedemption(ctx context.Context, reserved reservedRedemption) error
```

`reserveRedemption` must only lock rows, insert redemption, mark card as `REDEEMED`, and return reserved file metadata. `finalizeFileRedemption` creates ZIP outside the row lock, then updates `zip_path` and `goods_files` status in a second short transaction.

- [ ] **Step 4: Add failure compensation**

If ZIP creation fails after card redemption reservation, set a clear error state by updating:

```sql
UPDATE redemptions SET download_state = 'AVAILABLE', zip_path = NULL, zip_size_bytes = NULL WHERE id = $1
```

Then return a 500 with `failed to prepare redemption files`.

- [ ] **Step 5: Verify**

Run:

```bash
cd backend
go test ./internal/storage ./internal/api -run 'TestFileDeliveryFullFlowIntegration|TestDownloadClaimReleaseIntegration' -count=1
go test ./...
```

Expected: PASS; integration tests skip only without `TEST_DATABASE_URL`.

- [ ] **Step 6: Commit**

```bash
git add backend/internal/storage/storage.go backend/internal/api/public_handlers.go backend/internal/api/goods_handlers.go backend/internal/api/goods_integration_test.go backend/internal/api/redemption_integration_test.go
git commit -m "refactor: shorten file redemption transactions"
```

---

## Task 8: Add Backend Service And Repository Boundaries

**Files:**
- Create: `backend/internal/domain/card_key.go`
- Create: `backend/internal/domain/download.go`
- Create: `backend/internal/domain/goods.go`
- Create: `backend/internal/repository/postgres/card_keys.go`
- Create: `backend/internal/repository/postgres/downloads.go`
- Create: `backend/internal/repository/postgres/goods.go`
- Create: `backend/internal/service/card_keys.go`
- Create: `backend/internal/service/downloads.go`
- Create: `backend/internal/service/goods.go`
- Modify: `backend/internal/api/card_handlers.go`
- Modify: `backend/internal/api/public_handlers.go`
- Modify: `backend/internal/api/goods_handlers.go`

- [ ] **Step 1: Create domain types**

Create `backend/internal/domain/card_key.go`:

```go
package domain

import "time"

type CardKeyStatus string

const (
	CardKeyActive   CardKeyStatus = "ACTIVE"
	CardKeyRedeemed CardKeyStatus = "REDEEMED"
	CardKeyExpired  CardKeyStatus = "EXPIRED"
	CardKeyDeleted  CardKeyStatus = "DELETED"
)

type GeneratedCardKey struct {
	ID              string
	PlaintextKey    string
	KeyMask         string
	DeliveryMessage string
	ExpiresAt       *time.Time
	CreatedAt       time.Time
}
```

Create `backend/internal/domain/download.go`:

```go
package domain

type DownloadClaim struct {
	RedemptionID string
	ClaimToken   string
	ZipPath      string
	Filename     string
}
```

Create `backend/internal/domain/goods.go`:

```go
package domain

type GoodsType string

const (
	GoodsText GoodsType = "TEXT"
	GoodsFile GoodsType = "FILE"
)
```

- [ ] **Step 2: Move pure business logic into services**

Create `backend/internal/service/card_keys.go` with exported functions for expiration and delivery message:

```go
package service

import (
	"errors"
	"strings"
	"time"
)

func CalculateExpiresAt(option string, now time.Time) (*time.Time, error) {
	var expires time.Time
	switch strings.ToLower(strings.TrimSpace(option)) {
	case "", "3d":
		expires = now.AddDate(0, 0, 3)
	case "never":
		return nil, nil
	case "3m":
		expires = now.Add(3 * time.Minute)
	case "1d":
		expires = now.AddDate(0, 0, 1)
	case "7d":
		expires = now.AddDate(0, 0, 7)
	default:
		return nil, errors.New("invalid expiration")
	}
	return &expires, nil
}
```

Move existing `calculateExpiresAt` logic into this function and update tests to call `service.CalculateExpiresAt`.

- [ ] **Step 3: Introduce repositories without changing SQL**

Create repository structs that wrap `*pgxpool.Pool`:

```go
type GoodsRepository struct {
	db *pgxpool.Pool
}

func NewGoodsRepository(db *pgxpool.Pool) *GoodsRepository {
	return &GoodsRepository{db: db}
}
```

Move one query at a time. Start with `listGoods` because it is read-only.

- [ ] **Step 4: Keep handlers thin**

Handlers should do only:

```go
parse request -> call service -> map response -> write JSON
```

No handler should directly create ZIP files or hold raw SQL after this task.

- [ ] **Step 5: Verify**

Run:

```bash
cd backend
go test ./...
go vet ./...
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/internal/domain backend/internal/repository backend/internal/service backend/internal/api
git commit -m "refactor: split backend services and repositories"
```

---

## Task 9: Add Route-Level Code Splitting

**Files:**
- Modify: `frontend/src/App.tsx`
- Create: `frontend/src/App.lazyRoutes.test.tsx`

- [ ] **Step 1: Add lazy route test**

Create `frontend/src/App.lazyRoutes.test.tsx`:

```tsx
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appSource = readFileSync("frontend/src/App.tsx", "utf8");

describe("route code splitting", () => {
  it("lazy-loads admin and public pages instead of static importing every page into the root bundle", () => {
    expect(appSource).toContain("lazy(");
    expect(appSource).toContain("<Suspense");
    expect(appSource).toContain('import("./features/admin/shell/AdminShell")');
    expect(appSource).toContain('import("./features/admin/goods/GoodsPage")');
    expect(appSource).not.toContain('from "./pages/admin/');
    expect(appSource).not.toContain('import("./pages/admin/');
  });
});
```

- [ ] **Step 2: Implement lazy imports**

Modify `frontend/src/App.tsx`:

```tsx
import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Centered } from "./components/Centered";

const RedeemPage = lazy(() => import("./features/public/redeem/RedeemPage").then((module) => ({ default: module.RedeemPage })));
const ReceiptPage = lazy(() => import("./features/public/receipt/ReceiptPage").then((module) => ({ default: module.ReceiptPage })));
const AlreadyDownloadedPage = lazy(() => import("./features/public/receipt/AlreadyDownloadedPage").then((module) => ({ default: module.AlreadyDownloadedPage })));
const LoginPage = lazy(() => import("./features/admin/auth/LoginPage").then((module) => ({ default: module.LoginPage })));
const AdminShell = lazy(() => import("./features/admin/shell/AdminShell").then((module) => ({ default: module.AdminShell })));
const DashboardPage = lazy(() => import("./features/admin/dashboard/DashboardPage").then((module) => ({ default: module.DashboardPage })));
const GoodsPage = lazy(() => import("./features/admin/goods/GoodsPage").then((module) => ({ default: module.GoodsPage })));
const CardsPage = lazy(() => import("./features/admin/cards/CardsPage").then((module) => ({ default: module.CardsPage })));
const LogsPage = lazy(() => import("./features/admin/logs/LogsPage").then((module) => ({ default: module.LogsPage })));
const SettingsPage = lazy(() => import("./features/admin/settings/SettingsPage").then((module) => ({ default: module.SettingsPage })));

export default function App() {
  return (
    <Suspense fallback={<Centered message="加载页面" />}>
      <Routes>
        <Route path="/" element={<RedeemPage />} />
        <Route path="/receipt/:token" element={<ReceiptPage />} />
        <Route path="/download/already-downloaded" element={<AlreadyDownloadedPage />} />
        <Route path="/admin/login" element={<LoginPage />} />
        <Route path="/admin" element={<AdminShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="goods" element={<GoodsPage />} />
          <Route path="cards" element={<CardsPage />} />
          <Route path="logs" element={<LogsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
```

- [ ] **Step 3: Verify bundle split**

Run:

```bash
npm test -- frontend/src/App.lazyRoutes.test.tsx --run
npm run typecheck
npm run build
```

Expected: PASS; build output should contain multiple JS chunks and no single entry chunk above 500 kB gzip target.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.tsx frontend/src/App.lazyRoutes.test.tsx
git commit -m "perf: split route bundles"
```

---

## Task 10: Fix Card Generation Goods Picker Scale

**Files:**
- Modify: `backend/internal/api/goods_handlers.go`
- Modify: `backend/internal/api/app.go`
- Modify: `frontend/src/api.ts`
- Modify: `frontend/src/pages/admin/CardsPage.tsx`
- Modify: `frontend/src/components/admin/CardKeyForm.tsx`
- Create: `frontend/src/components/admin/CardKeyForm.scale.test.tsx`

- [ ] **Step 1: Add dedicated API for card-generatable goods**

In `backend/internal/api/app.go`:

```go
admin.GET("/goods/card-options", app.handleCardGoodsOptions)
```

In `backend/internal/api/goods_handlers.go`, implement:

```go
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

func (a *App) listCardGoodsOptions(ctx context.Context, query string, limit int) ([]Goods, error) {
	pattern := "%" + query + "%"
	rows, err := a.db.Query(ctx, `
		WITH file_counts AS (
			SELECT goods_id,
			       COUNT(*)::int AS total,
			       COUNT(*) FILTER (WHERE status = 'AVAILABLE')::int AS available,
			       COUNT(*) FILTER (WHERE status = 'RESERVED')::int AS reserved,
			       COUNT(*) FILTER (WHERE status = 'REDEEMED')::int AS redeemed
			FROM goods_files
			GROUP BY goods_id
		)
		SELECT g.id::text, g.name, g.type::text, COALESCE(g.text_content, ''), COALESCE(g.note, ''),
		       g.status::text, g.created_at, g.updated_at,
		       COALESCE(fc.total, 0), COALESCE(fc.available, 0), COALESCE(fc.reserved, 0), COALESCE(fc.redeemed, 0),
		       0, 0
		FROM goods g
		LEFT JOIN file_counts fc ON fc.goods_id = g.id
		WHERE g.status = 'ACTIVE'
		  AND ($1 = '' OR g.name ILIKE $2 OR COALESCE(g.note, '') ILIKE $2)
		  AND (g.type = 'TEXT' OR COALESCE(fc.available, 0) > 0)
		ORDER BY g.created_at DESC
		LIMIT $3
	`, query, pattern, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []Goods{}
	for rows.Next() {
		var item Goods
		if err := rows.Scan(&item.ID, &item.Name, &item.Type, &item.TextContent, &item.Note, &item.Status, &item.CreatedAt, &item.UpdatedAt, &item.Inventory.Total, &item.Inventory.Available, &item.Inventory.Reserved, &item.Inventory.Redeemed, &item.Usage.CardKeys, &item.Usage.Redemptions); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}
```

- [ ] **Step 2: Add frontend API method**

In `frontend/src/api.ts`:

```ts
cardGoodsOptions(params: { q?: string; limit?: number } = {}) {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.limit) search.set("limit", String(params.limit));
  const query = search.toString();
  return apiFetch<{ items: Goods[] }>(`/api/admin/goods/card-options${query ? `?${query}` : ""}`);
}
```

- [ ] **Step 3: Use query-backed picker**

In `CardsPage.tsx`, replace `api.goods({ pageSize: 100 })` with `api.cardGoodsOptions({ limit: 200 })`.

In `CardKeyForm.tsx`, when `goodsQuery` changes, fetch `api.cardGoodsOptions({ q: goodsQuery, limit: 200 })` instead of only filtering the first 100 locally.

- [ ] **Step 4: Add test that no hard-coded 100 remains**

Create `frontend/src/components/admin/CardKeyForm.scale.test.tsx`:

```tsx
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("card goods picker scale", () => {
  it("does not rely on the first 100 goods from the paginated list", () => {
    const cardsPage = readFileSync("frontend/src/pages/admin/CardsPage.tsx", "utf8");
    expect(cardsPage).not.toContain("pageSize: 100");
    expect(cardsPage).toContain("cardGoodsOptions");
  });
});
```

- [ ] **Step 5: Verify**

Run:

```bash
npm test -- frontend/src/components/admin/CardKeyForm.scale.test.tsx --run
npm run typecheck
cd backend && go test ./internal/api -run CardGoodsOptions -count=1
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/internal/api/app.go backend/internal/api/goods_handlers.go frontend/src/api.ts frontend/src/pages/admin/CardsPage.tsx frontend/src/components/admin/CardKeyForm.tsx frontend/src/components/admin/CardKeyForm.scale.test.tsx
git commit -m "fix: load card goods options with search"
```

---

## Task 11: Improve Query Performance For Overview And Logs

**Files:**
- Modify: `backend/internal/api/admin_handlers.go`
- Modify: `backend/internal/migrations/003_performance_indexes.sql`
- Create: `backend/internal/api/overview_query_test.go`

- [ ] **Step 1: Aggregate trend in SQL**

Replace fetching all timestamps in `loadRedemptionTimes` and `loadSuccessfulDownloadTimes` with SQL grouped by day:

```sql
SELECT date_trunc('day', redeemed_at AT TIME ZONE 'UTC')::date AS day, count(*)::int
FROM redemptions
WHERE redeemed_at >= $1
GROUP BY day
```

Use a `map[string]int` directly instead of pulling every row into Go.

- [ ] **Step 2: Add indexes**

Create `backend/internal/migrations/003_performance_indexes.sql`:

```sql
-- +goose Up
CREATE INDEX IF NOT EXISTS idx_redemptions_redeemed_at ON redemptions(redeemed_at);
CREATE INDEX IF NOT EXISTS idx_download_logs_result_created_at ON download_logs(result, created_at);
CREATE INDEX IF NOT EXISTS idx_card_keys_status_created_at ON card_keys(status, created_at);
CREATE INDEX IF NOT EXISTS idx_goods_created_at ON goods(created_at);

-- +goose Down
DROP INDEX IF EXISTS idx_goods_created_at;
DROP INDEX IF EXISTS idx_card_keys_status_created_at;
DROP INDEX IF EXISTS idx_download_logs_result_created_at;
DROP INDEX IF EXISTS idx_redemptions_redeemed_at;
```

- [ ] **Step 3: Add query-shape test**

Create `backend/internal/api/overview_query_test.go`:

```go
package api

import (
	"strings"
	"testing"
)

func TestOverviewTrendQueriesAggregateInDatabase(t *testing.T) {
	query := redemptionTrendQuery()
	if !strings.Contains(query, "GROUP BY") || !strings.Contains(query, "count(*)") {
		t.Fatalf("trend query should aggregate in database: %s", query)
	}
}
```

- [ ] **Step 4: Verify**

Run:

```bash
cd backend
go test ./internal/api ./internal/migrations -count=1
go test ./...
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/api/admin_handlers.go backend/internal/api/overview_query_test.go backend/internal/migrations/003_performance_indexes.sql
git commit -m "perf: aggregate overview trends in postgres"
```

---

## Task 12: Update E2E And CI-Ready Verification Commands

**Files:**
- Modify: `tests/e2e/admin-flow.spec.ts`
- Modify: `tests/e2e/public-flow.spec.ts`
- Modify: `README.md`
- Create: `docs/verification.md`

- [ ] **Step 1: Fix E2E admin shell selectors**

Replace old assertions:

```ts
await expect(page.getByText("当前管理员")).toBeVisible();
```

with:

```ts
await expect(page.getByLabel("管理员账号")).toBeVisible();
```

- [ ] **Step 2: Add verification doc**

Create `docs/verification.md`:

````markdown
# Verification

## Fast Local

```bash
npm test -- --run
npm run typecheck
cd backend && go test ./... && go vet ./...
```

## Backend With Race Detector

```bash
cd backend
go test -race ./...
```

## Database Integration

```bash
TEST_DATABASE_URL='postgresql://auto_delivery:auto_delivery@localhost:5432/auto_delivery_test?sslmode=disable' go test ./internal/api -count=1
```

## End To End

```bash
npm run e2e
```

E2E requires Postgres and Redis reachable from `playwright.config.ts` environment.
````

- [ ] **Step 3: Update README**

Add a short link to `docs/verification.md` under common commands.

- [ ] **Step 4: Verify**

Run:

```bash
npm test -- --run
npm run typecheck
npm run build
cd backend && go test ./... && go vet ./... && go test -race ./...
```

Expected: all commands PASS. Integration tests may SKIP when `TEST_DATABASE_URL` is not set; run the explicit integration command before release.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/admin-flow.spec.ts tests/e2e/public-flow.spec.ts README.md docs/verification.md
git commit -m "test: refresh e2e selectors and verification docs"
```

---

## Task 13: Final Full-System Acceptance

**Files:**
- No source changes unless this task reveals failures.

- [ ] **Step 1: Run frontend checks**

```bash
npm test -- --run
npm run typecheck
npm run build
npm audit --audit-level=moderate
```

Expected:

```text
Tests pass
tsc exits 0
vite build exits 0
found 0 vulnerabilities
```

- [ ] **Step 2: Run backend checks**

```bash
cd backend
go test ./...
go vet ./...
go test -race ./...
```

Expected: all packages PASS.

- [ ] **Step 3: Run integration checks with database**

```bash
cd backend
TEST_DATABASE_URL='postgresql://auto_delivery:auto_delivery@localhost:5432/auto_delivery_test?sslmode=disable' go test ./internal/api -count=1
```

Expected: no skipped integration tests; all PASS.

- [ ] **Step 4: Run E2E checks**

```bash
npm run e2e
```

Expected: Playwright admin and public flows PASS.

- [ ] **Step 5: Confirm branch state**

```bash
git status --short
git log --oneline -n 12
```

Expected: only intentional changes are present; commit history shows one commit per completed task.

---

## Rollout Notes

- Production must set `APP_BASE_URL` to an HTTPS URL and `FORCE_SECURE_COOKIES=true`.
- Production should set `TRUSTED_PROXY_CIDRS` to the reverse proxy CIDR or exact IP, not `0.0.0.0/0`.
- PostgreSQL and Redis should not be published directly to the internet.
- Before deployment, run the full acceptance command set in Task 13.
- After deployment, verify:

```bash
curl -I https://your-domain.example/healthz
curl -I https://your-domain.example/
```

Expected headers include:

```text
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: same-origin
Content-Security-Policy: default-src 'self'; ...
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

## Residual Risks After Completion

- Card key plaintext is intentionally only returned once after generation; operators still need a secure workflow for sending it to customers.
- Receipt URLs remain bearer tokens; anyone with the URL can view the receipt. This matches current product behavior but should be documented for customers.
- Exported ZIP files can be large; if inventory grows beyond single-machine comfort, move ZIP generation to a background job or object storage.
- `localStorage` stores CSRF token. With CSP and no HTML injection this is acceptable for this app, but an XSS bug would expose it. Keep React escaped rendering and avoid `dangerouslySetInnerHTML`.
