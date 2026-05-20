# Auto Delivery 1:1 Parity Matrix

## Public Pages

| Page | Original Route | Rewrite Route | Functional Parity | Visual Parity | Notes |
| --- | --- | --- | --- | --- | --- |
| Redeem | `/` | `/` | Partial | Partial | Rewrite has basic redeem flow; missing original ticket layout details, brand animation, composition input handling, original error styling |
| Receipt Text | `/receipt/:token` | `/receipt/:token` | Partial | Partial | Rewrite displays text receipt; missing copy button, original receipt panels, return confirmation |
| Receipt File | `/receipt/:token` | `/receipt/:token` | Partial | Partial | Rewrite downloads ZIP; missing original ZIP panel styling, downloaded warning details, return confirmation |
| Already Downloaded | `/download/already-downloaded` | `/download/already-downloaded` | Partial | Partial | Rewrite has page; missing original receipt-return link styling and one-time-protection visual treatment |

## Admin Pages

| Page | Original Route | Rewrite Route | Functional Parity | Visual Parity | Notes |
| --- | --- | --- | --- | --- | --- |
| Login | `/admin/login` | `/admin/login` | Partial | Partial | Basic login works; original background, panel details, and failure presentation need porting |
| Dashboard | `/admin` | `/admin` | Partial | Missing | Basic counters only; missing card-key status distribution, inventory composition, trend chart, inventory warnings |
| Goods | `/admin/goods` | `/admin/goods` | Partial | Partial | Basic CRUD/upload/export exists; missing search, status filter, pagination, dialogs, detail panel, disabled delete UX |
| Cards | `/admin/cards` | `/admin/cards` | Partial | Partial | Basic generate/delete exists; missing search, status filter, pagination, original generated result panel and picker behavior |
| Logs | `/admin/logs` | `/admin/logs` | Missing | Partial | Rewrite only shows admin audit logs; missing redemption/download/admin tabs, search, pagination, localized badges |
| Settings | `/admin/settings` | `/admin/settings` | Partial | Partial | Basic fields exist; backend URL/template defaults and validation are incomplete |

## Backend Rules

| Rule | Original Source | Rewrite Source | Status | Notes |
| --- | --- | --- | --- | --- |
| File card generation reserves inventory with row locks | `src/lib/card-keys/service.ts` | `backend/internal/api/card_handlers.go` | Partial | Main behavior exists; needs real Postgres concurrency integration test |
| File ZIP can be successfully downloaded once | `src/lib/redemption/service.ts` | `backend/internal/api/public_handlers.go` | Partial | Manual API smoke passed; needs automated claim/release/in-progress tests |
| Settings affect generated delivery message | `src/lib/settings/service.ts` | `backend/internal/api/admin_handlers.go` | Missing | Current migration hard-codes `http://localhost:3000` and stores literal `\n` |
| Goods list supports search, status filter, pagination | `src/lib/goods/service.ts` | `backend/internal/api/goods_handlers.go` | Missing | Rewrite returns all goods without filters or pagination |
| Card list supports goods/key search, status filter, pagination | `src/lib/card-keys/service.ts` | `backend/internal/api/card_handlers.go` | Missing | Rewrite returns latest 500 without filters or pagination |
| Logs support redemptions/downloads/admin categories | `src/lib/admin/logs.ts` | `backend/internal/api/admin_handlers.go` | Missing | Rewrite exposes only admin audit logs |
| Dashboard includes original analytics model | `src/lib/admin/overview.ts` | `backend/internal/api/admin_handlers.go` | Missing | Rewrite only exposes simple counters |
| File export writes audit log | `src/app/admin/(protected)/goods/[goodsId]/export/[scope]/route.ts` | `backend/internal/api/goods_handlers.go` | Missing | Rewrite streams ZIP but does not record export audit |

## Screenshot Baseline

| Surface | Original Screenshot | Rewrite Screenshot | Status |
| --- | --- | --- | --- |
| Redeem | `docs/screenshots/original/redeem.png` | `docs/screenshots/rewrite/redeem.png` | Captured |
| Receipt Text | `docs/screenshots/original/receipt-text.png` | `docs/screenshots/rewrite/receipt-text.png` | Captured |
| Receipt File | `docs/screenshots/original/receipt-file.png` | `docs/screenshots/rewrite/receipt-file.png` | Captured |
| Already Downloaded | `docs/screenshots/original/already-downloaded.png` | `docs/screenshots/rewrite/already-downloaded.png` | Captured |
| Admin Login | `docs/screenshots/original/admin-login.png` | `docs/screenshots/rewrite/admin-login.png` | Captured |
| Dashboard | `docs/screenshots/original/admin-dashboard.png` | `docs/screenshots/rewrite/admin-dashboard.png` | Captured |
| Goods | `docs/screenshots/original/admin-goods.png` | `docs/screenshots/rewrite/admin-goods.png` | Captured |
| Cards | `docs/screenshots/original/admin-cards.png` | `docs/screenshots/rewrite/admin-cards.png` | Captured |
| Logs Redemptions | `docs/screenshots/original/admin-logs-redemptions.png` | `docs/screenshots/rewrite/admin-logs-redemptions.png` | Captured |
| Logs Downloads | `docs/screenshots/original/admin-logs-downloads.png` | `docs/screenshots/rewrite/admin-logs-downloads.png` | Captured |
| Logs Admin | `docs/screenshots/original/admin-logs-admin.png` | `docs/screenshots/rewrite/admin-logs-admin.png` | Captured |
| Settings | `docs/screenshots/original/admin-settings.png` | `docs/screenshots/rewrite/admin-settings.png` | Captured |
