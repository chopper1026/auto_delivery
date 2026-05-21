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
