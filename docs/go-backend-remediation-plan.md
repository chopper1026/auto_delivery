# Go Backend Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the reviewed Go backend issues except access-log token redaction, with data consistency handled first.

**Architecture:** Keep the existing `api -> service -> repository/postgres` split. Put orchestration and filesystem cleanup in services, keep SQL and transactions in repositories, and keep HTTP status/message mapping in handlers.

**Tech Stack:** Go 1.26, Gin, pgx, PostgreSQL, goose migrations, local filesystem storage.

---

## Progress

- [x] Baseline: `cd backend && go test ./...`
- [x] Phase 1: File redemption failure compensation
- [x] Phase 2: Expired file card-key inventory release and display status
- [x] Phase 3: Goods deletion filesystem cleanup
- [x] Phase 4: API error mapping hardening
- [x] Phase 5: Goods list query optimization
- [x] Phase 6: Helper cleanup and formatting
- [x] Final verification

## Verification Notes

- `cd backend && go test ./...`
- `cd backend && go vet ./...`
- `cd backend && go test -race ./...`
- `git diff --check`
- `cd backend && go test ./internal/api -run Integration -count=1 -v` was executed; database-backed integration tests were skipped because `TEST_DATABASE_URL` is not set in this environment.

---

## Phase 1: File Redemption Failure Compensation

**Problem:** `ReserveRedemption` commits `card_keys.status = 'REDEEMED'` before ZIP creation. If ZIP creation fails, `FailFileRedemption` only clears ZIP metadata and leaves the card consumed plus files reserved.

**Files:**
- Modify: `backend/internal/domain/redemption.go`
- Modify: `backend/internal/service/redemptions.go`
- Modify: `backend/internal/repository/postgres/redemptions.go`
- Test: `backend/internal/service/redemptions_test.go`

**Implementation:**
- Add a repository method `AbortFileRedemption(ctx, reserved)` or equivalent.
- On ZIP creation/finalization failure, restore the card key to `ACTIVE`, clear `redeemed_at`, release reserved files to `AVAILABLE`, clear reservation columns, and delete the orphan redemption row.
- Keep the existing shorter transaction shape: ZIP creation stays outside the reservation transaction.

**Tests:**
- Service test with fake repository and forced ZIP failure proves abort compensation is called with the reserved redemption.
- Existing redemptions tests continue to pass.

**Verification:**
```bash
cd backend
go test ./internal/service -run TestFileRedemptionFailureAbortsReservation -count=1
go test ./internal/service ./internal/api ./internal/repository/postgres -count=1
```

---

## Phase 2: Expired File Card-Key Inventory Release And Display Status

**Problem:** Active-but-expired file card keys are treated as expired in filters, but the list may still return `ACTIVE`. Attempting to redeem an expired file card marks it `EXPIRED` without releasing reserved files.

**Files:**
- Modify: `backend/internal/repository/postgres/card_keys.go`
- Modify: `backend/internal/repository/postgres/redemptions.go`
- Test: `backend/internal/repository/postgres/card_keys_test.go`
- Test: `backend/internal/api/card_keys_integration_test.go`

**Implementation:**
- In card-key list SQL, return a computed status:
  `CASE WHEN c.status = 'ACTIVE' AND c.expires_at IS NOT NULL AND c.expires_at < now() THEN 'EXPIRED' ELSE c.status::text END`.
- When redemption sees an active expired card, update it to `EXPIRED`, clear reserved file rows for that card, and commit that state.
- Keep already redeemed cards immutable.

**Tests:**
- SQL unit test proves the list query includes the computed status expression.
- Integration test, when `TEST_DATABASE_URL` is available, creates expired file card with reserved inventory and verifies a redemption attempt releases inventory.

**Verification:**
```bash
cd backend
go test ./internal/repository/postgres -run 'TestCardKeyListQueryReturnsComputedExpiredStatus|TestCardKeyListWhereExpiredSemantics' -count=1
go test ./internal/api -run TestExpiredFileCardKeyReleasesReservedInventoryIntegration -count=1
```

---

## Phase 3: Goods Deletion Filesystem Cleanup

**Problem:** Deleting file goods removes DB rows through cascade but leaves uploaded files on disk.

**Files:**
- Modify: `backend/internal/domain/goods.go`
- Modify: `backend/internal/service/goods.go`
- Modify: `backend/internal/repository/postgres/goods.go`
- Test: `backend/internal/service/goods_test.go`

**Implementation:**
- Change repository deletion to return deleted file paths: `DeleteGoods(ctx, id) ([]string, error)`.
- Query file paths before deleting goods.
- After DB deletion succeeds, the service calls a storage cleanup function for each path.
- If cleanup fails, report an error after DB deletion so the caller can observe the storage issue.

**Tests:**
- Service test proves cleanup is called only after repository deletion succeeds.
- Service test proves cleanup is not called when repository returns `ErrGoodsHasCardKeys`.

**Verification:**
```bash
cd backend
go test ./internal/service -run TestDeleteGoods -count=1
go test ./internal/api ./internal/repository/postgres ./internal/storage -count=1
```

---

## Phase 4: API Error Mapping Hardening

**Problem:** Some handlers return `err.Error()` for user-facing responses, exposing internal details for unknown errors.

**Files:**
- Modify: `backend/internal/api/card_handlers.go`
- Test: `backend/internal/api/card_handlers_test.go`

**Implementation:**
- Add a small handler helper for generate-card-key errors.
- Map known domain/service validation errors to stable messages.
- Return `500` with a generic message for unknown errors.

**Tests:**
- Handler-level test injects an unknown generate error and verifies the response does not contain the internal error string.
- Existing request validation and inventory behavior remain unchanged.

**Verification:**
```bash
cd backend
go test ./internal/api -run TestHandleGenerateCardKeyDoesNotExposeInternalError -count=1
go test ./internal/api -count=1
```

---

## Phase 5: Goods List Query Optimization

**Problem:** `goodsListQuery` aggregates all `goods_files`, `card_keys`, and `redemptions` before applying pagination.

**Files:**
- Modify: `backend/internal/repository/postgres/goods.go`
- Modify: `backend/internal/repository/postgres/goods_test.go`
- Create: `backend/internal/migrations/004_goods_list_indexes.sql`

**Implementation:**
- Build `paged_goods` CTE first using the existing filter/order/limit/offset.
- Aggregate file, card, and redemption counts only for IDs from `paged_goods`.
- Add indexes for filtered/sorted goods list and joined counts.

**Tests:**
- SQL unit test proves `paged_goods` appears before aggregation CTEs and that aggregation CTEs join `paged_goods`.
- Existing query shape tests still pass.

**Verification:**
```bash
cd backend
go test ./internal/repository/postgres ./internal/migrations -count=1
```

---

## Phase 6: Helper Cleanup And Formatting

**Problem:** Some helper functions are duplicated or unused, and two test files are not gofmt-clean.

**Files:**
- Modify: `backend/internal/api/app.go`
- Modify: `backend/internal/api/goods_handlers.go`
- Modify: `backend/internal/repository/postgres/goods.go`
- Modify: `backend/internal/repository/postgres/card_keys.go`
- Modify: `backend/internal/repository/postgres/admin_test.go`
- Modify: `backend/internal/service/admin_test.go`

**Implementation:**
- Remove unused `nullStringToString` and `nullTimePtr` from API.
- Keep repository-local `nullTimePtr` where it is used.
- Format all backend Go files with `gofmt`.

**Verification:**
```bash
cd backend
gofmt -l .
go test ./...
go vet ./...
go test -race ./...
```
