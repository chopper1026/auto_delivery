# Go/React 1:1 功能与样式还原 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 `go-react-rewrite` 重构分支上，用 React + Go/Gin + PostgreSQL + Redis 1:1 还原原 Next.js 版本的业务功能、交互细节和视觉样式。

**Architecture:** 保持最终生产形态为单个 Go/Gin 服务：后端提供 JSON API 和下载流，前端由 Vite React 构建为静态资源并由 Go 服务托管。原 Next.js/Prisma 代码只作为规格基线，不重新引入 Next.js runtime、Server Actions 或 Prisma。

**Tech Stack:** React `19.2.6`、Vite `8.0.13`、TypeScript `6.0.3`、React Router `7.15.1`、TanStack Query `5.100.11`、Go `1.26.3`、Gin `1.12.0`、pgx `5.9.2`、go-redis `9.19.0`、PostgreSQL `18.4`、Redis `8.6.3`、Docker Compose。

---

## Scope And Ground Rules

- 实施工作目录：`/Users/chopper1026/codespace/auto_delivery/.worktrees/go-react-rewrite`
- 原版规格目录：`/Users/chopper1026/codespace/auto_delivery`
- 不回退到底层 Next.js；只用原 Next.js 代码作为功能、样式、测试、文案基线。
- 数据库允许空库重建，不做旧生产数据迁移。
- 所有用户可见页面必须和原版在布局、颜色、间距、组件状态、文案上尽量一致。
- 所有业务规则必须和原版一致：卡密一次兑换、文件 ZIP 一次成功下载、文件库存预留、删除限制、CSRF、限流、审计日志、系统设置。
- 每个任务完成后运行该任务列出的验证命令；最终必须运行完整验收命令。

## Original-To-New File Map

| 原 Next.js 规格文件 | 新 React/Go 目标文件 |
| --- | --- |
| `src/app/page.tsx` | `frontend/src/pages/public/RedeemPage.tsx` |
| `src/app/receipt/[token]/page.tsx` | `frontend/src/pages/public/ReceiptPage.tsx` |
| `src/app/download/already-downloaded/page.tsx` | `frontend/src/pages/public/AlreadyDownloadedPage.tsx` |
| `src/app/admin/login/page.tsx` | `frontend/src/pages/admin/LoginPage.tsx` |
| `src/app/admin/(protected)/layout.tsx` | `frontend/src/pages/admin/AdminShell.tsx` |
| `src/app/admin/(protected)/page.tsx` | `frontend/src/pages/admin/DashboardPage.tsx` |
| `src/app/admin/(protected)/goods/page.tsx` | `frontend/src/pages/admin/GoodsPage.tsx` |
| `src/app/admin/(protected)/cards/page.tsx` | `frontend/src/pages/admin/CardsPage.tsx` |
| `src/app/admin/(protected)/logs/page.tsx` | `frontend/src/pages/admin/LogsPage.tsx` |
| `src/app/admin/(protected)/settings/page.tsx` | `frontend/src/pages/admin/SettingsPage.tsx` |
| `src/components/ui/*` | `frontend/src/components/ui/*` |
| `src/components/admin/*` | `frontend/src/components/admin/*` |
| `src/components/public/*` | `frontend/src/components/public/*` |
| `src/lib/admin/*` | `frontend/src/lib/admin/*` and `backend/internal/api/*` |
| `src/lib/card-keys/*` | `frontend/src/lib/cardKey.ts`, `backend/internal/security`, `backend/internal/api/card_handlers.go` |
| `src/lib/goods/service.ts` | `backend/internal/api/goods_handlers.go` |
| `src/lib/redemption/service.ts` | `backend/internal/api/public_handlers.go` |
| `src/lib/settings/service.ts` | `backend/internal/api/admin_handlers.go` |

> Current structure note: the implemented `go-version` frontend now uses `frontend/src/features/...` for route-level business code instead of `frontend/src/pages/...` and `frontend/src/components/admin|public/...`.

---

## Task 1: Build The Parity Matrix And Screenshot Baseline

**Files:**
- Create: `docs/parity-matrix.md`
- Create: `docs/screenshots/original/README.md`
- Create: `docs/screenshots/rewrite/README.md`

- [x] **Step 1: Create parity matrix skeleton**

Add `docs/parity-matrix.md` with sections:

```markdown
# Auto Delivery 1:1 Parity Matrix

## Public Pages

| Page | Original Route | Rewrite Route | Functional Parity | Visual Parity | Notes |
| --- | --- | --- | --- | --- | --- |
| Redeem | `/` | `/` | Pending | Pending | Card-key formatting, error state, responsive ticket layout |
| Receipt Text | `/receipt/:token` | `/receipt/:token` | Pending | Pending | Copy text, return confirmation |
| Receipt File | `/receipt/:token` | `/receipt/:token` | Pending | Pending | ZIP block, one-time download state |
| Already Downloaded | `/download/already-downloaded` | `/download/already-downloaded` | Pending | Pending | Receipt link and return link |

## Admin Pages

| Page | Original Route | Rewrite Route | Functional Parity | Visual Parity | Notes |
| --- | --- | --- | --- | --- | --- |
| Login | `/admin/login` | `/admin/login` | Pending | Pending | Login panel and error state |
| Dashboard | `/admin` | `/admin` | Pending | Pending | Stats, charts, warnings |
| Goods | `/admin/goods` | `/admin/goods` | Pending | Pending | Search, filter, pagination, dialogs |
| Cards | `/admin/cards` | `/admin/cards` | Pending | Pending | Generate form, copy delivery message, filters |
| Logs | `/admin/logs` | `/admin/logs` | Pending | Pending | Redemptions, downloads, admin tabs |
| Settings | `/admin/settings` | `/admin/settings` | Pending | Pending | Service URL and template form |

## Backend Rules

| Rule | Original Source | Rewrite Source | Status | Notes |
| --- | --- | --- | --- | --- |
| File card generation reserves inventory with row locks | `src/lib/card-keys/service.ts` | `backend/internal/api/card_handlers.go` | Pending | Include concurrency test |
| File ZIP can be successfully downloaded once | `src/lib/redemption/service.ts` | `backend/internal/api/public_handlers.go` | Pending | Include interrupted download claim test |
| Settings affect generated delivery message | `src/lib/settings/service.ts` | `backend/internal/api/admin_handlers.go` | Pending | Fix hard-coded localhost default |
```

- [x] **Step 2: Capture original screenshot set**

Run the original app from the main checkout on a non-conflicting port, then capture screenshots for:

```text
/
/receipt/:textToken
/receipt/:fileToken before download
/download/already-downloaded?receipt=:fileToken
/admin/login
/admin
/admin/goods
/admin/cards
/admin/logs?type=redemptions
/admin/logs?type=downloads
/admin/logs?type=admin
/admin/settings
```

Save screenshots under `docs/screenshots/original/`.

- [x] **Step 3: Capture rewrite screenshot set**

Run the rewrite app from `.worktrees/go-react-rewrite` and capture the same screenshot set under `docs/screenshots/rewrite/`.

- [x] **Step 4: Update matrix**

For each row in `docs/parity-matrix.md`, mark:

```text
Missing
Partial
Matched
```

Use `Missing` unless both functional behavior and visual layout have been verified.

- [x] **Step 5: Verify**

Run:

```bash
test -f docs/parity-matrix.md
test -d docs/screenshots/original
test -d docs/screenshots/rewrite
```

Expected: exit code `0`.

---

## Task 2: Split The React Frontend Into Parity-Oriented Modules

**Files:**
- Modify: `frontend/src/App.tsx`
- Create: `frontend/src/pages/public/RedeemPage.tsx`
- Create: `frontend/src/pages/public/ReceiptPage.tsx`
- Create: `frontend/src/pages/public/AlreadyDownloadedPage.tsx`
- Create: `frontend/src/pages/admin/LoginPage.tsx`
- Create: `frontend/src/pages/admin/AdminShell.tsx`
- Create: `frontend/src/pages/admin/DashboardPage.tsx`
- Create: `frontend/src/pages/admin/GoodsPage.tsx`
- Create: `frontend/src/pages/admin/CardsPage.tsx`
- Create: `frontend/src/pages/admin/LogsPage.tsx`
- Create: `frontend/src/pages/admin/SettingsPage.tsx`
- Create: `frontend/src/components/ui/`
- Create: `frontend/src/components/admin/`
- Create: `frontend/src/components/public/`
- Create: `frontend/src/lib/`

- [x] **Step 1: Move route components out of `App.tsx`**

Keep `frontend/src/App.tsx` limited to route definitions:

```tsx
import { Navigate, Route, Routes } from "react-router-dom";
import { AlreadyDownloadedPage } from "./pages/public/AlreadyDownloadedPage";
import { ReceiptPage } from "./pages/public/ReceiptPage";
import { RedeemPage } from "./pages/public/RedeemPage";
import { AdminShell } from "./pages/admin/AdminShell";
import { CardsPage } from "./pages/admin/CardsPage";
import { DashboardPage } from "./pages/admin/DashboardPage";
import { GoodsPage } from "./pages/admin/GoodsPage";
import { LoginPage } from "./pages/admin/LoginPage";
import { LogsPage } from "./pages/admin/LogsPage";
import { SettingsPage } from "./pages/admin/SettingsPage";

export default function App() {
  return (
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
  );
}
```

- [x] **Step 2: Create shared helpers**

Create `frontend/src/lib/format.ts`:

```ts
export function cx(...parts: Array<string | false | undefined | null>) {
  return parts.filter(Boolean).join(" ");
}

export function formatDateTime(value?: string | Date | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
```

- [x] **Step 3: Verify no behavior changed**

Run:

```bash
npm run typecheck
npm run build
```

Expected: both exit code `0`.

---

## Task 3: Port Original Design Tokens And UI Components

**Files:**
- Modify: `frontend/src/styles.css`
- Create: `frontend/src/components/ui/button.tsx`
- Create: `frontend/src/components/ui/badge.tsx`
- Create: `frontend/src/components/ui/dialog.tsx`
- Create: `frontend/src/components/ui/confirm-dialog.tsx`
- Create: `frontend/src/components/ui/input.tsx`
- Create: `frontend/src/components/ui/label.tsx`
- Create: `frontend/src/components/ui/select.tsx`
- Create: `frontend/src/components/ui/table.tsx`
- Create: `frontend/src/components/ui/textarea.tsx`
- Create: `frontend/src/components/ui/alert.tsx`

- [x] **Step 1: Port CSS variables**

Copy the semantic CSS variables from original `src/app/globals.css` into `frontend/src/styles.css`, preserving variable names such as:

```css
:root {
  --background: #f6f4ee;
  --foreground: #1f2933;
  --surface: #fffdf8;
  --surface-panel: #fbf7ef;
  --surface-muted: #efe7d8;
  --ink: #1f2933;
  --muted: #7b7163;
  --muted-strong: #5c5348;
  --line: #ded4c4;
  --primary: #176b87;
  --primary-foreground: #ffffff;
  --primary-soft: #dff2f6;
  --accent: #f2c078;
  --accent-ink: #6c3f00;
  --danger: #b42318;
  --danger-soft: #fee4e2;
  --success: #157f3b;
  --success-soft: #dcfae6;
  --warning: #b54708;
  --warning-soft: #fef0c7;
  --shadow: 0 16px 40px rgba(31, 41, 51, 0.08);
}
```

Use the exact original values if they differ from this snippet.

- [x] **Step 2: Port UI components**

Translate original `src/components/ui/*` from Next-compatible components to Vite React components. Keep public props compatible where possible:

```tsx
export function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "secondary" | "destructive" | "warningTonal" | "successTonal" | "dangerTonal";
  size?: "default" | "sm" | "lg" | "icon";
}) {
  return <button className={buttonVariants({ variant, size, className })} {...props} />;
}
```

- [x] **Step 3: Port dialog behavior**

Use standard React state and portals. The dialog must support:

```tsx
<Dialog open={open}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>标题</DialogTitle>
      <DialogDescription>说明</DialogDescription>
    </DialogHeader>
  </DialogContent>
</Dialog>
```

- [x] **Step 4: Verify**

Run:

```bash
npm run typecheck
npm run build
```

Expected: both exit code `0`.

---

## Task 4: Restore Public Redeem Page 1:1

**Files:**
- Modify: `frontend/src/pages/public/RedeemPage.tsx`
- Create: `frontend/src/components/public/AnimatedBrandWord.tsx`
- Create: `frontend/src/components/public/RedeemForm.tsx`
- Modify: `frontend/src/cardKey.ts`
- Test: `frontend/src/cardKey.test.ts`

- [x] **Step 1: Port card-key input tests**

Extend `frontend/src/cardKey.test.ts` with original behavior:

```ts
import { describe, expect, it } from "vitest";
import {
  applyCardKeyInputData,
  formatCardKeyInput,
  isAllowedCardKeyCompositionInput,
  isAllowedCardKeyInputData,
} from "./cardKey";

describe("card key input formatting", () => {
  it("normalizes pasted and typed card keys for redemption", () => {
    expect(formatCardKeyInput("ad abcd ef12 3456 7890")).toBe("AD-ABCD-EF12-3456-7890");
    expect(formatCardKeyInput("abcd ef12 3456 7890")).toBe("AD-ABCD-EF12-3456-7890");
    expect(formatCardKeyInput("AD-ABCD-EF12-3456-7890-extra")).toBe("AD-ABCD-EF12-3456-7890");
  });

  it("keeps partial prefix input predictable while typing", () => {
    expect(formatCardKeyInput("")).toBe("");
    expect(formatCardKeyInput("a")).toBe("A");
    expect(formatCardKeyInput("ad")).toBe("AD");
    expect(formatCardKeyInput("adx")).toBe("AD-X");
  });

  it("allows only ASCII card-key input data before it reaches the field", () => {
    expect(isAllowedCardKeyInputData("AD-ab12 34-56")).toBe(true);
    expect(isAllowedCardKeyInputData(null)).toBe(true);
    expect(isAllowedCardKeyInputData("中文")).toBe(false);
  });

  it("blocks IME composition input", () => {
    expect(isAllowedCardKeyCompositionInput({ inputType: "insertCompositionText", isComposing: true })).toBe(false);
    expect(isAllowedCardKeyCompositionInput({ inputType: "insertText", isComposing: false })).toBe(true);
  });

  it("applies typed or pasted ASCII data through the formatter", () => {
    expect(applyCardKeyInputData({ value: "AD-ABCD", data: "e", selectionStart: 7, selectionEnd: 7 })).toBe("AD-ABCD-E");
    expect(applyCardKeyInputData({ value: "", data: "中文AD12", selectionStart: 0, selectionEnd: 0 })).toBe("AD-12");
  });
});
```

- [x] **Step 2: Implement card-key helpers**

Update `frontend/src/cardKey.ts` to include:

```ts
function groupEveryFour(value: string) {
  return value.match(/.{1,4}/g) ?? [];
}

export function isAllowedCardKeyInputData(data: string | null): boolean {
  return data === null || /^[A-Za-z0-9\s-]*$/.test(data);
}

export function isAllowedCardKeyCompositionInput(input: { inputType?: string | null; isComposing?: boolean }): boolean {
  if (input.isComposing) return false;
  return !["insertCompositionText", "insertFromComposition", "deleteCompositionText"].includes(input.inputType ?? "");
}

export function applyCardKeyInputData(input: {
  value: string;
  data: string;
  selectionStart: number | null;
  selectionEnd: number | null;
}): string {
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? start;
  const nextValue = `${input.value.slice(0, start)}${input.data}${input.value.slice(end)}`;
  return formatCardKeyInput(nextValue);
}

export function formatCardKeyInput(input: string): string {
  const cleaned = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!cleaned) return "";
  if ("AD".startsWith(cleaned) && cleaned.length < 2) return cleaned;
  if (cleaned === "AD") return "AD";
  const body = (cleaned.startsWith("AD") ? cleaned.slice(2) : cleaned).slice(0, 16);
  if (!body) return "AD";
  return ["AD", ...groupEveryFour(body)].join("-");
}

export function isAllowedCardKey(value: string): boolean {
  return /^AD-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(formatCardKeyInput(value));
}
```

- [x] **Step 3: Port redeem page layout**

Use original public page structure and CSS classes from `src/app/page.tsx` and `src/components/public/public-pages.module.css`. The React page must include:

```tsx
<main className="publicPage">
  <div className="ambientLine" />
  <section className="redeemShell">
    <AnimatedBrandWord />
    <RedeemForm />
  </section>
</main>
```

- [x] **Step 4: Verify**

Run:

```bash
npm run test -- frontend/src/cardKey.test.ts
npm run typecheck
npm run build
```

Expected: all exit code `0`.

---

## Task 5: Restore Receipt And Already-Downloaded Pages

**Files:**
- Modify: `frontend/src/pages/public/ReceiptPage.tsx`
- Modify: `frontend/src/pages/public/AlreadyDownloadedPage.tsx`
- Create: `frontend/src/components/public/CopyTextButton.tsx`
- Create: `frontend/src/components/public/DownloadButton.tsx`
- Create: `frontend/src/components/public/ReceiptReturnButton.tsx`
- Create: `frontend/src/lib/receiptReturn.ts`
- Test: `frontend/src/lib/receiptReturn.test.ts`

- [x] **Step 1: Port receipt-return tests**

Create `frontend/src/lib/receiptReturn.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getReceiptReturnDialog } from "./receiptReturn";

describe("receipt return dialog", () => {
  it("asks text-goods users to save content before returning", () => {
    expect(getReceiptReturnDialog({ kind: "TEXT" })?.title).toBe("返回兑换页？");
  });

  it("warns file-goods users when file has not been downloaded", () => {
    expect(getReceiptReturnDialog({ kind: "FILE", downloaded: false })?.title).toBe("文件还没有下载");
  });

  it("does not warn after file download is completed", () => {
    expect(getReceiptReturnDialog({ kind: "FILE", downloaded: true })).toBeNull();
  });
});
```

- [x] **Step 2: Implement return dialog model**

Create `frontend/src/lib/receiptReturn.ts`:

```ts
export type ReceiptReturnState =
  | { kind: "TEXT"; downloaded?: boolean }
  | { kind: "FILE"; downloaded: boolean };

export type ReceiptReturnDialog = {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  tone: "warning";
};

export function getReceiptReturnDialog(receipt: ReceiptReturnState): ReceiptReturnDialog | null {
  if (receipt.kind === "TEXT") {
    return {
      title: "返回兑换页？",
      description: "请确认已经保存文本内容。返回后如果需要再次查看，请使用当前收货链接。",
      confirmLabel: "确认返回",
      cancelLabel: "继续查看",
      tone: "warning",
    };
  }

  if (receipt.downloaded) return null;

  return {
    title: "文件还没有下载",
    description: "每个卡密只能成功下载一次。确认返回兑换页后，请确保不再需要当前下载入口。",
    confirmLabel: "确认返回",
    cancelLabel: "继续下载",
    tone: "warning",
  };
}
```

- [x] **Step 3: Restore receipt visual structure**

Port the original receipt card structure:

```tsx
<article className="receipt">
  <header className="receiptHeader">...</header>
  <div className="receiptContent">...</div>
  <footer className="receiptFooter">...</footer>
</article>
```

Text goods must include copy button and monospace pre block. File goods must include ZIP panel, file count badge, note block, download button, and downloaded warning.

- [x] **Step 4: Restore already-downloaded page**

The page must support `?receipt=:token` and render both:

```tsx
<Link to={`/receipt/${encodeURIComponent(receipt)}`}>查看收货页</Link>
<Link to="/">返回兑换页</Link>
```

- [x] **Step 5: Verify**

Run:

```bash
npm run test -- frontend/src/lib/receiptReturn.test.ts
npm run typecheck
npm run build
```

Expected: all exit code `0`.

---

## Task 6: Fix Settings Backend And Delivery Message Parity

**Files:**
- Modify: `backend/internal/migrations/001_init.sql`
- Modify: `backend/internal/api/admin_handlers.go`
- Modify: `backend/internal/api/card_handlers.go`
- Test: `backend/internal/api/settings_test.go`
- Test: `backend/internal/api/card_handlers_test.go`

- [x] **Step 1: Add delivery message tests**

Extend `backend/internal/api/card_handlers_test.go`:

```go
func TestBuildDeliveryMessageUsesDefaultTemplateWithRealNewlines(t *testing.T) {
	created := time.Date(2026, 5, 20, 10, 30, 0, 0, time.Local)
	message := buildDeliveryMessage(settingsResponse{
		ServiceBaseURL: "https://example.com",
	}, "AD-AAAA-BBBB-CCCC-DDDD", nil, created)
	if !strings.Contains(message, "\n卡密：AD-AAAA-BBBB-CCCC-DDDD\n") {
		t.Fatalf("message should contain real newlines, got %q", message)
	}
	if strings.Contains(message, `\n`) {
		t.Fatalf("message should not contain literal slash-n, got %q", message)
	}
}
```

- [x] **Step 2: Replace hard-coded migration defaults**

In `backend/internal/migrations/001_init.sql`, replace the hard-coded `http://localhost:3000` default with a neutral default only for empty DB bootstrapping:

```sql
INSERT INTO system_settings (key, value)
VALUES
  ('card_key_delivery_message_template', E'卡密：{{cardKey}}\n兑换地址：{{redeemUrl}}\n创建时间：{{createdAt}}\n过期时间：{{expiresAt}}\n\n注意事项：卡密仅可兑换一次，请在有效期内及时兑换，兑换后立刻保存，过期或自身未保存导致的损失自负。')
ON CONFLICT (key) DO NOTHING;
```

Do not insert `service_base_url` in migration. Let runtime fallback to `APP_BASE_URL`.

- [x] **Step 3: Normalize and validate service URL**

Add a helper in `backend/internal/api/admin_handlers.go`:

```go
func normalizeServiceBaseURL(value string) (string, error) {
	trimmed := strings.TrimSpace(value)
	parsed, err := url.Parse(trimmed)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return "", errors.New("service address must be a valid URL")
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return "", errors.New("service address must use http or https")
	}
	parsed.RawQuery = ""
	parsed.Fragment = ""
	parsed.Path = strings.TrimRight(parsed.Path, "/")
	return parsed.String(), nil
}
```

- [x] **Step 4: Make settings update fail loudly**

In `handleUpdateSettings`, return `400` for invalid URL and `500` for DB errors. Empty delivery template should write the default template, not silently skip.

- [x] **Step 5: Verify**

Run:

```bash
cd backend
go test ./internal/api -run 'TestBuildDeliveryMessage|TestNormalizeServiceBaseURL'
go test ./...
```

Expected: both exit code `0`.

---

## Task 7: Restore Goods API Search, Filter, Pagination, Export Audit

**Files:**
- Modify: `backend/internal/api/goods_handlers.go`
- Modify: `backend/internal/api/types.go`
- Modify: `frontend/src/api.ts`
- Test: `backend/internal/api/goods_integration_test.go`

- [x] **Step 1: Define paginated response types**

Add to `backend/internal/api/types.go`:

```go
type PaginatedGoodsResponse struct {
	Items      []Goods `json:"items"`
	Page       int     `json:"page"`
	PageSize   int     `json:"pageSize"`
	TotalItems int     `json:"totalItems"`
	TotalPages int     `json:"totalPages"`
}
```

- [x] **Step 2: Accept query params**

`GET /api/admin/goods` must accept:

```text
q
status=ACTIVE|DISABLED
page=1
pageSize=10
```

Build SQL with parameterized conditions only. Do not string-concatenate user input into SQL.

- [x] **Step 3: Return pagination metadata**

Return:

```json
{
  "items": [],
  "page": 1,
  "pageSize": 10,
  "totalItems": 0,
  "totalPages": 1
}
```

- [x] **Step 4: Write export audit log**

After successful `handleExportGoodsFiles`, call:

```go
action := "goods.export_unredeemed"
if scope == "REDEEMED" {
	action = "goods.export_redeemed"
}
a.writeAudit(c.Request.Context(), currentAdmin(c).ID, action, "Goods", c.Param("id"), clientIP(c), userAgent(c), fmt.Sprintf(`{"count":%d}`, len(entries)))
```

- [x] **Step 5: Verify**

Run:

```bash
cd backend
go test ./...
```

Expected: exit code `0`.

---

## Task 8: Restore Card-Key API Search, Filter, Pagination

**Files:**
- Modify: `backend/internal/api/card_handlers.go`
- Modify: `backend/internal/api/types.go`
- Modify: `frontend/src/api.ts`
- Test: `backend/internal/api/card_handlers_integration_test.go`

- [x] **Step 1: Define paginated response**

Add:

```go
type PaginatedCardKeysResponse struct {
	Items      []CardKey `json:"items"`
	Page       int       `json:"page"`
	PageSize   int       `json:"pageSize"`
	TotalItems int       `json:"totalItems"`
	TotalPages int       `json:"totalPages"`
}
```

- [x] **Step 2: Accept query params**

`GET /api/admin/card-keys` must accept:

```text
q
status=ACTIVE|REDEEMED|EXPIRED|DELETED
page=1
pageSize=10
```

Search behavior:

- `q` matches goods name case-insensitively.
- `q` also matches visible key suffix from `key_mask`.

- [x] **Step 3: Keep deletion semantics**

Deletion must remain:

- `REDEEMED` returns `409`.
- `ACTIVE`, `EXPIRED`, `DELETED` deletion requests should not release redeemed files.
- Deleting an unredeemed file card releases `RESERVED` files back to `AVAILABLE`.

- [x] **Step 4: Verify**

Run:

```bash
cd backend
go test ./...
```

Expected: exit code `0`.

---

## Task 9: Restore Dashboard Analytics API

**Files:**
- Modify: `backend/internal/api/admin_handlers.go`
- Modify: `backend/internal/api/types.go`
- Create: `frontend/src/lib/admin/overviewCharts.ts`
- Test: `frontend/src/lib/admin/overviewCharts.test.ts`

- [x] **Step 1: Define overview response**

Add Go response fields equivalent to original `getOverviewStats()`:

```go
type OverviewResponse struct {
	TotalCardKeys    int                 `json:"totalCardKeys"`
	ActiveCardKeys   int                 `json:"activeCardKeys"`
	RedeemedCardKeys int                 `json:"redeemedCardKeys"`
	ExpiredCardKeys  int                 `json:"expiredCardKeys"`
	TodaysRedemptions int                `json:"todaysRedemptions"`
	TodaysDownloads  int                 `json:"todaysDownloads"`
	FileInventory    []FileInventoryStat `json:"fileInventory"`
	DeliveryTrend    []DeliveryTrendDay  `json:"deliveryTrend"`
}
```

- [x] **Step 2: Count expired cards like original**

Expired count must include:

```sql
status = 'EXPIRED' OR (status = 'ACTIVE' AND expires_at < now())
```

- [x] **Step 3: Port chart helper tests**

Create `frontend/src/lib/admin/overviewCharts.test.ts` from original `tests/unit/admin-overview-charts.test.ts` and make helper output match exactly.

- [x] **Step 4: Verify**

Run:

```bash
npm run test -- frontend/src/lib/admin/overviewCharts.test.ts
cd backend && go test ./...
```

Expected: both exit code `0`.

---

## Task 10: Restore Logs API And Logs Page

**Files:**
- Modify: `backend/internal/api/admin_handlers.go`
- Modify: `backend/internal/api/types.go`
- Modify: `frontend/src/pages/admin/LogsPage.tsx`
- Create: `frontend/src/lib/displayLabels.ts`
- Test: `frontend/src/lib/displayLabels.test.ts`

- [x] **Step 1: Port display label tests**

Create `frontend/src/lib/displayLabels.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatCardKeyStatus, formatDownloadResult, formatGoodsFileStatus, formatGoodsStatus, formatGoodsType } from "./displayLabels";

describe("display labels", () => {
  it("formats goods labels", () => {
    expect(formatGoodsType("TEXT")).toBe("文本");
    expect(formatGoodsType("FILE")).toBe("文件");
    expect(formatGoodsStatus("ACTIVE")).toBe("启用");
    expect(formatGoodsStatus("DISABLED")).toBe("停用");
  });

  it("formats card-key and download statuses", () => {
    expect(formatCardKeyStatus("ACTIVE")).toBe("可兑换");
    expect(formatCardKeyStatus("REDEEMED")).toBe("已兑换");
    expect(formatCardKeyStatus("EXPIRED")).toBe("已过期");
    expect(formatCardKeyStatus("DELETED")).toBe("已删除");
    expect(formatDownloadResult("SUCCESS")).toBe("成功");
    expect(formatDownloadResult("ALREADY_DOWNLOADED")).toBe("重复下载");
    expect(formatDownloadResult("NOT_FOUND")).toBe("链接无效");
    expect(formatDownloadResult("ERROR")).toBe("异常");
  });
});
```

- [x] **Step 2: Add API modes**

`GET /api/admin/logs` supports:

```text
type=redemptions|downloads|admin
q=<search>
page=1
pageSize=10
```

- [x] **Step 3: Return mode-specific rows**

Use response shape:

```json
{
  "type": "downloads",
  "items": [],
  "page": 1,
  "pageSize": 10,
  "totalItems": 0,
  "totalPages": 1
}
```

Each item type must include only fields the page needs.

- [x] **Step 4: Restore tabbed UI**

`LogsPage.tsx` must render three tabs:

```text
兑换
下载
后台
```

Each tab preserves `q` when switching. Search placeholder: `搜索 IP、UA、动作`。

- [x] **Step 5: Verify**

Run:

```bash
npm run test -- frontend/src/lib/displayLabels.test.ts
npm run typecheck
npm run build
cd backend && go test ./...
```

Expected: all exit code `0`.

---

## Task 11: Restore Admin Layout And Login Page Visuals

**Files:**
- Modify: `frontend/src/pages/admin/LoginPage.tsx`
- Modify: `frontend/src/pages/admin/AdminShell.tsx`
- Create: `frontend/src/components/admin/AdminNav.tsx`
- Test: `frontend/src/components/admin/AdminNav.test.tsx`

- [x] **Step 1: Port admin nav tests**

Create `frontend/src/components/admin/AdminNav.test.tsx` to verify nav labels and hrefs:

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AdminNav } from "./AdminNav";

describe("AdminNav", () => {
  it("renders the five admin destinations", () => {
    render(
      <MemoryRouter>
        <AdminNav />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: /工作台/ })).toHaveAttribute("href", "/admin");
    expect(screen.getByRole("link", { name: /货物/ })).toHaveAttribute("href", "/admin/goods");
    expect(screen.getByRole("link", { name: /卡密/ })).toHaveAttribute("href", "/admin/cards");
    expect(screen.getByRole("link", { name: /日志/ })).toHaveAttribute("href", "/admin/logs");
    expect(screen.getByRole("link", { name: /设置/ })).toHaveAttribute("href", "/admin/settings");
  });
});
```

- [x] **Step 2: Restore login page CSS**

Port original `src/app/admin/login/login.module.css` into global class names or component-scoped classes under `frontend/src/styles.css`. Preserve:

- background treatment
- login panel width
- input height
- button states
- error message position

- [x] **Step 3: Restore shell layout**

The shell must include:

- side brand
- five nav links
- current admin block
- open redeem page button
- logout button
- responsive mobile behavior equivalent to original

- [x] **Step 4: Verify**

Run:

```bash
npm run test -- frontend/src/components/admin/AdminNav.test.tsx
npm run typecheck
npm run build
```

Expected: all exit code `0`.

---

## Task 12: Restore Dashboard Page Visuals And Analytics

**Files:**
- Modify: `frontend/src/pages/admin/DashboardPage.tsx`
- Create: `frontend/src/components/admin/StatCard.tsx`
- Create: `frontend/src/components/admin/WorkbenchAnalytics.tsx`
- Modify: `frontend/src/api.ts`

- [x] **Step 1: Match original stat cards**

Render original stat card set:

```text
总卡密
可兑换
已兑换
已过期
今日兑换
今日下载
```

- [x] **Step 2: Restore analytics panels**

`WorkbenchAnalytics` must render:

- file inventory composition rows
- inventory warnings
- card-key status distribution
- 7-day delivery trend

- [x] **Step 3: Verify visual and build**

Run:

```bash
npm run test -- frontend/src/lib/admin/overviewCharts.test.ts
npm run typecheck
npm run build
```

Expected: all exit code `0`.

---

## Task 13: Restore Goods Page 1:1

**Files:**
- Modify: `frontend/src/pages/admin/GoodsPage.tsx`
- Create: `frontend/src/components/admin/NewGoodsDialog.tsx`
- Create: `frontend/src/components/admin/GoodsActions.tsx`
- Create: `frontend/src/components/admin/ListFilters.tsx`
- Create: `frontend/src/components/admin/Pagination.tsx`
- Create: `frontend/src/lib/admin/goodsTableUi.ts`
- Test: `frontend/src/lib/admin/goodsTableUi.test.ts`

- [x] **Step 1: Port goods detail tests**

Create `frontend/src/lib/admin/goodsTableUi.test.ts` from original behavior:

```ts
import { describe, expect, it } from "vitest";
import { buildGoodsDetailSections, GOODS_TABLE_COLUMN_WIDTHS } from "./goodsTableUi";

describe("goods table UI model", () => {
  it("keeps the goods column narrower than the actions column", () => {
    expect(GOODS_TABLE_COLUMN_WIDTHS.goods).toBeLessThan(GOODS_TABLE_COLUMN_WIDTHS.actions);
    expect(GOODS_TABLE_COLUMN_WIDTHS.actions).toBeGreaterThanOrEqual(34);
  });

  it("puts file goods notes in the details model", () => {
    expect(buildGoodsDetailSections({ type: "FILE", note: "下载后先解压。", textContent: null })).toEqual([
      { label: "备注", content: "下载后先解压。", empty: false },
    ]);
  });

  it("puts text goods content in the details model", () => {
    expect(buildGoodsDetailSections({ type: "TEXT", note: null, textContent: "账号：demo\n密码：123456" })).toEqual([
      { label: "文本内容", content: "账号：demo\n密码：123456", empty: false },
    ]);
  });
});
```

- [x] **Step 2: Restore filters and pagination**

Use URL search params:

```text
/admin/goods?q=<query>&status=ACTIVE&page=2
```

Changing query or status resets `page` to `1`.

- [x] **Step 3: Restore dialogs and actions**

Goods row actions must include:

- 详情
- 上传
- 导出文件 menu
- 启用/停用
- 删除 with confirm dialog

Delete button is disabled when `usage.cardKeys > 0 || usage.redemptions > 0`.

- [x] **Step 4: Verify**

Run:

```bash
npm run test -- frontend/src/lib/admin/goodsTableUi.test.ts
npm run typecheck
npm run build
```

Expected: all exit code `0`.

---

## Task 14: Restore Card-Key Page 1:1

**Files:**
- Modify: `frontend/src/pages/admin/CardsPage.tsx`
- Create: `frontend/src/components/admin/CardKeyForm.tsx`
- Create: `frontend/src/components/admin/DeleteCardKeyButton.tsx`
- Create: `frontend/src/lib/admin/goodsPicker.ts`
- Test: `frontend/src/lib/admin/goodsPicker.test.ts`
- Test: `frontend/src/components/admin/CardKeyForm.test.tsx`

- [x] **Step 1: Port goods picker tests**

Create tests for selectable goods:

```ts
import { describe, expect, it } from "vitest";
import { buildGoodsOptions } from "./goodsPicker";

describe("goods picker", () => {
  it("includes active text goods and file goods with available inventory", () => {
    const options = buildGoodsOptions([
      { id: "text", name: "文本", type: "TEXT", status: "ACTIVE", inventory: { total: 0, available: 0, reserved: 0, redeemed: 0 } },
      { id: "file", name: "文件", type: "FILE", status: "ACTIVE", inventory: { total: 3, available: 2, reserved: 1, redeemed: 0 } },
      { id: "disabled", name: "停用", type: "TEXT", status: "DISABLED", inventory: { total: 0, available: 0, reserved: 0, redeemed: 0 } },
    ]);
    expect(options.map((item) => item.id)).toEqual(["text", "file"]);
  });
});
```

- [x] **Step 2: Restore generate form**

The form must:

- list only active goods
- show file available inventory
- require file quantity for file goods
- allow expiration options `3m`, `1d`, `3d`, `7d`, `never`
- display inventory shortage error from backend

- [x] **Step 3: Restore generated result panel**

After generation, show:

- plaintext card key
- key mask
- delivery message
- copy delivery message button

- [x] **Step 4: Restore filters and pagination**

Use URL search params:

```text
/admin/cards?q=<query>&status=ACTIVE&page=2
```

- [x] **Step 5: Verify**

Run:

```bash
npm run test -- frontend/src/lib/admin/goodsPicker.test.ts
npm run test -- frontend/src/components/admin/CardKeyForm.test.tsx
npm run typecheck
npm run build
```

Expected: all exit code `0`.

---

## Task 15: Restore Settings Page 1:1

**Files:**
- Modify: `frontend/src/pages/admin/SettingsPage.tsx`
- Create: `frontend/src/components/admin/SettingsForm.tsx`
- Modify: `frontend/src/api.ts`

- [x] **Step 1: Restore settings form**

The form must include:

- 服务地址 input
- 交付文案模板 textarea
- 保存按钮
- success/error feedback

- [x] **Step 2: Show backend validation errors**

When backend returns `400`, show exact backend message near the form. Do not silently ignore failed saves.

- [x] **Step 3: Verify**

Run:

```bash
npm run typecheck
npm run build
```

Expected: both exit code `0`.

---

## Task 16: Add Real Backend Integration Tests

**Files:**
- Create: `backend/internal/testutil/testdb.go`
- Create: `backend/internal/api/admin_auth_integration_test.go`
- Create: `backend/internal/api/goods_integration_test.go`
- Create: `backend/internal/api/card_keys_integration_test.go`
- Create: `backend/internal/api/redemption_integration_test.go`
- Create: `backend/internal/api/settings_integration_test.go`

- [x] **Step 1: Create test DB helper**

Use environment variable `TEST_DATABASE_URL`. Refuse to run if database name or schema is not visibly test-scoped.

Required safety check:

```go
func IsSafeTestDatabaseURL(raw string) bool {
	parsed, err := url.Parse(raw)
	if err != nil {
		return false
	}
	dbName := strings.TrimPrefix(parsed.Path, "/")
	schema := parsed.Query().Get("search_path")
	return strings.Contains(dbName, "test") || strings.Contains(schema, "test")
}
```

- [x] **Step 2: Cover file delivery full flow**

Integration test must create:

- admin session
- file goods
- 2 JSON files
- file card key
- redemption
- first download success
- second download redirected to `/download/already-downloaded`

- [x] **Step 3: Cover concurrency reservation**

Run two concurrent card-key generations requesting the same limited inventory. Expected:

- one succeeds
- one fails with inventory conflict
- no file is reserved by two card keys

- [x] **Step 4: Cover interrupted download claim**

Claim a download, release it, claim again. Expected:

- first claim sets `IN_PROGRESS`
- release sets `AVAILABLE`
- second claim succeeds with a different claim token

- [x] **Step 5: Verify**

Run:

```bash
cd backend
TEST_DATABASE_URL='postgresql://auto_delivery:password@localhost:5432/auto_delivery_test?sslmode=disable' go test ./internal/api -run Integration
```

Expected: exit code `0`.

---

## Task 17: Add Browser E2E And Visual Smoke Tests

**Files:**
- Create: `tests/e2e/public-flow.spec.ts`
- Create: `tests/e2e/admin-flow.spec.ts`
- Create: `playwright.config.ts`
- Modify: `package.json`

- [x] **Step 1: Add scripts**

Add to `package.json`:

```json
{
  "scripts": {
    "e2e": "playwright test",
    "e2e:update": "playwright test --update-snapshots"
  }
}
```

- [x] **Step 2: Public full-flow E2E**

Test:

- login admin
- create text goods
- generate text card
- redeem card
- assert receipt text visible

- [x] **Step 3: File full-flow E2E**

Test:

- create file goods
- upload JSON files
- generate file card
- redeem card
- download ZIP
- second download goes to already-downloaded page

- [x] **Step 4: Admin page smoke**

Visit and screenshot:

```text
/admin
/admin/goods
/admin/cards
/admin/logs
/admin/settings
```

- [x] **Step 5: Verify**

Run:

```bash
npm run e2e
```

Expected: all tests pass.

---

## Task 18: Docker, README, And Final Cleanup

**Files:**
- Modify: `Dockerfile`
- Modify: `docker-compose.yml`
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `.dockerignore`
- Modify: `.gitignore`

- [x] **Step 1: Keep final runtime Node-free**

Verify final image still uses:

```dockerfile
FROM alpine:3.22
COPY --from=backend /out/auto-delivery /app/auto-delivery
COPY --from=frontend /src/frontend/dist /app/public
CMD ["/app/auto-delivery"]
```

- [x] **Step 2: README must describe only new stack**

Remove stale references to:

- Next.js runtime
- Prisma
- Server Actions
- `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`

Keep:

- React/Vite frontend
- Go/Gin backend
- embedded goose migrations
- PostgreSQL
- Redis
- Docker Compose
- backup instructions

- [x] **Step 3: Verify compose config**

Run:

```bash
POSTGRES_PASSWORD=review-postgres-password \
ADMIN_USERNAME=admin \
ADMIN_PASSWORD=change-this-password \
SECRET_PEPPER=replace-with-at-least-32-random-bytes \
APP_BASE_URL=http://localhost:18080 \
APP_PORT=18080 \
docker compose config
```

Expected: exit code `0`.

---

## Final Verification

Run from `/Users/chopper1026/codespace/auto_delivery/.worktrees/go-react-rewrite`:

```bash
cd backend
go test ./...
go run golang.org/x/vuln/cmd/govulncheck@latest ./...
```

Expected:

```text
go test ./... exits 0
govulncheck reports No vulnerabilities found
```

Run from `/Users/chopper1026/codespace/auto_delivery/.worktrees/go-react-rewrite`:

```bash
npm run test
npm run typecheck
npm run build
npm audit --audit-level=moderate
POSTGRES_PASSWORD=review-postgres-password ADMIN_USERNAME=admin ADMIN_PASSWORD=change-this-password SECRET_PEPPER=replace-with-at-least-32-random-bytes APP_BASE_URL=http://localhost:18080 APP_PORT=18080 docker compose config
docker build -t auto-delivery-go-react-final:latest .
```

Expected:

```text
all commands exit 0
npm audit reports 0 vulnerabilities at moderate level or higher
docker build completes
```

Manual acceptance:

- [ ] `/` visually matches original redeem page.
- [ ] Text receipt visually matches original and copy button works.
- [ ] File receipt visually matches original and ZIP download works once.
- [ ] Already-downloaded page visually matches original.
- [ ] Admin login visually matches original.
- [ ] Dashboard charts and stats match original.
- [ ] Goods page search/filter/pagination/dialogs/actions match original.
- [ ] Card page generation/search/filter/pagination/delete match original.
- [ ] Logs page redemptions/downloads/admin tabs match original.
- [ ] Settings page validation and save behavior match original.
- [ ] Docker deployment starts from empty DB and creates initial admin.
