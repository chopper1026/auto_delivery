# Frontend Structure Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `go-version` 分支上收敛 React 前端目录边界、共享组件归属和样式责任，让后续功能迭代更容易定位、测试和拆分。

**Architecture:** 保持当前 Vite + React + React Router + TanStack Query 架构，不回退到 Next.js，也不改变后端接口形态。前端继续以 `features/public` 和 `features/admin` 承载业务功能，以 `components/ui` 承载无业务语义的基础组件，并新增明确的跨领域共享层承载品牌、API、查询键和大组件拆分后的内部模块。

**Tech Stack:** React `19.2.6`、Vite `8.0.13`、TypeScript `6.0.3`、React Router `7.15.1`、TanStack Query `5.100.11`、Tailwind CSS `4.3.0`、Vitest `4.1.6`、Playwright `1.60.0`。

---

## Scope And Ground Rules

- Review target: `go-version` branch worktree at `.worktrees/go-react-rewrite`.
- Do not edit the main checkout at the repository root.
- Keep the production shape unchanged: Go serves the Vite build output from `frontend/dist`.
- Do not redesign visible UI as part of this cleanup. Preserve existing markup behavior and visual snapshots unless a task explicitly updates tests for a structural rename.
- Prefer moves and narrow extractions over broad rewrites.
- Every implementation task should end with `npm run typecheck` and the focused Vitest files listed in that task.

## Current Assessment

The current front-end structure is mostly sound:

- `frontend/src/App.tsx` is route-only and uses route-level lazy imports.
- Business code is organized by domain under `frontend/src/features/public/...` and `frontend/src/features/admin/...`.
- Reusable primitive UI lives under `frontend/src/components/ui`.
- Pure UI/business helper logic lives under `frontend/src/lib` and `frontend/src/lib/admin`.

The remaining structure issues are cleanup-oriented, not blockers:

1. `frontend/src/features/public/shared/AnimatedBrandWord.tsx` is consumed by admin screens, so admin depends on the public feature domain.
2. `AnimatedBrandWord.tsx` imports `tegaki` through a relative `node_modules` path, which is brittle.
3. `frontend/src/styles.css` still contains old page-level selectors that no longer match the feature-folder structure.
4. Several feature files are large enough to slow reviews and future changes:
   - `frontend/src/features/admin/dashboard/WorkbenchAnalytics.tsx`
   - `frontend/src/features/admin/cards/CardKeyForm.tsx`
   - `frontend/src/features/admin/goods/GoodsActions.tsx`
   - `frontend/src/features/public/shared/public-pages.module.css`
5. `frontend/src/api.ts` and `frontend/src/types.ts` are still acceptable at the current size, but should be split once the structure cleanup is complete.

## Target Frontend Structure

```text
frontend/src/
  App.tsx
  main.tsx
  styles.css
  api/
    client.ts
    admin.ts
    public.ts
    queryKeys.ts
  components/
    brand/
      AnimatedBrandWord.tsx
    ui/
      ...
  features/
    admin/
      auth/
      cards/
        CardKeyForm.tsx
        CardKeyGoodsPicker.tsx
        GeneratedCardKeyResult.tsx
      dashboard/
        WorkbenchAnalytics.tsx
        analytics/
          AnalyticsShell.tsx
          CardKeyStatusChart.tsx
          DeliveryTrendChart.tsx
          InventoryCompositionChart.tsx
          InventoryWarnings.tsx
      goods/
        GoodsActions.tsx
        GoodsExportMenu.tsx
        GoodsDetailDialog.tsx
        GoodsUploadDialog.tsx
        GoodsDeleteDialog.tsx
      logs/
      settings/
      shared/
      shell/
    public/
      receipt/
      redeem/
      shared/
        public-pages.module.css
  lib/
    admin/
    format.ts
    receiptReturn.ts
    utils.ts
  types/
    admin.ts
    public.ts
    shared.ts
```

This target is a direction, not a requirement to complete in one commit. Implement in the priority order below.

## Priority Order

1. P0: Fix cross-domain ownership and brittle package imports.
2. P1: Remove empty legacy directories and stale structure references that can mislead future work.
3. P2: Split high-churn large feature components into focused same-feature modules.
4. P3: Split API/types only after the component boundaries have stabilized.
5. P4: Prune legacy global CSS selectors and move feature-specific CSS closer to feature code.

---

## Task 1: Move Shared Brand Component Out Of Public Feature

**Files:**
- Create: `frontend/src/components/brand/AnimatedBrandWord.tsx`
- Modify: `frontend/src/features/admin/auth/LoginPage.tsx`
- Modify: `frontend/src/features/admin/shell/AdminNav.tsx`
- Modify: `frontend/src/features/public/redeem/RedeemPage.tsx`
- Modify: `frontend/src/features/admin/auth/LoginPage.test.tsx`
- Modify: `frontend/src/features/admin/shell/AdminNav.test.tsx`
- Modify: `frontend/src/features/admin/shell/AdminShell.test.tsx`
- Delete after move: `frontend/src/features/public/shared/AnimatedBrandWord.tsx`

- [ ] **Step 1: Move the component**

Move the file content from:

```text
frontend/src/features/public/shared/AnimatedBrandWord.tsx
```

to:

```text
frontend/src/components/brand/AnimatedBrandWord.tsx
```

Keep the component name and export unchanged:

```tsx
export function AnimatedBrandWord({ className }: { className?: string }) {
  // existing implementation
}
```

- [ ] **Step 2: Update imports**

Replace imports of:

```tsx
import { AnimatedBrandWord } from "@/features/public/shared/AnimatedBrandWord";
```

with:

```tsx
import { AnimatedBrandWord } from "@/components/brand/AnimatedBrandWord";
```

Also update relative imports from public pages if any remain.

- [ ] **Step 3: Update test mocks**

Replace Vitest mocks that target the old module path:

```tsx
vi.mock("@/features/public/shared/AnimatedBrandWord", () => ({
  AnimatedBrandWord: ({ className }: { className?: string }) => <span className={className}>AutoDelivery</span>,
}));
```

with:

```tsx
vi.mock("@/components/brand/AnimatedBrandWord", () => ({
  AnimatedBrandWord: ({ className }: { className?: string }) => <span className={className}>AutoDelivery</span>,
}));
```

- [ ] **Step 4: Verify**

Run:

```bash
npm test -- frontend/src/features/admin/auth/LoginPage.test.tsx frontend/src/features/admin/shell/AdminNav.test.tsx frontend/src/features/admin/shell/AdminShell.test.tsx --run
npm run typecheck
```

Expected: all commands pass.

## Task 2: Replace Direct `node_modules` Import With Package Export

**Files:**
- Modify: `frontend/src/components/brand/AnimatedBrandWord.tsx`

- [ ] **Step 1: Replace the import**

Change:

```tsx
import parisienne from "../../../../../node_modules/tegaki/dist/fonts/parisienne/bundle.mjs";
```

to:

```tsx
import parisienne from "tegaki/fonts/parisienne";
```

This uses the `tegaki` package export declared in `node_modules/tegaki/package.json`.

- [ ] **Step 2: Verify build resolution**

Run:

```bash
npm run typecheck
npm run build
```

Expected: TypeScript and Vite resolve `tegaki/fonts/parisienne` without direct knowledge of the package's internal `dist/` layout.

## Task 3: Remove Empty Legacy Structure

**Files:**
- Remove empty directories if present:
  - `frontend/src/pages/admin`
  - `frontend/src/pages/public`
  - `frontend/src/pages`
  - `frontend/src/components/admin`
  - `frontend/src/components/public`
- Modify: `docs/go-react-1to1-parity-plan.md`
- Modify: `docs/go-review-remediation-plan.md`
- Modify: `frontend/src/App.lazyRoutes.test.tsx`

- [ ] **Step 1: Remove empty directories**

Confirm the directories are empty:

```bash
find frontend/src/pages frontend/src/components/admin frontend/src/components/public -type f -print
```

Expected: no output.

Then remove only the empty directories:

```bash
rmdir frontend/src/pages/admin frontend/src/pages/public frontend/src/pages frontend/src/components/admin frontend/src/components/public
```

- [ ] **Step 2: Update docs that still describe the old target**

In `docs/go-react-1to1-parity-plan.md`, preserve historical notes where useful, but add a short note near the file map:

```markdown
> Current structure note: the implemented `go-version` frontend now uses `frontend/src/features/...` for route-level business code instead of `frontend/src/pages/...` and `frontend/src/components/admin|public/...`.
```

In `docs/go-review-remediation-plan.md`, keep the target structure as the current source of truth and avoid adding any new `pages/*` examples.

- [ ] **Step 3: Update lazy route test**

Change `frontend/src/App.lazyRoutes.test.tsx` so it asserts the current intended paths directly:

```tsx
expect(appSource).toContain('import("./features/admin/shell/AdminShell")');
expect(appSource).toContain('import("./features/admin/goods/GoodsPage")');
expect(appSource).not.toContain('from "./pages/admin/');
expect(appSource).not.toContain('import("./pages/admin/');
```

- [ ] **Step 4: Verify**

Run:

```bash
npm test -- frontend/src/App.lazyRoutes.test.tsx --run
npm run typecheck
```

Expected: tests and typecheck pass.

## Task 4: Split Dashboard Analytics Into Focused Modules

**Files:**
- Modify: `frontend/src/features/admin/dashboard/WorkbenchAnalytics.tsx`
- Create: `frontend/src/features/admin/dashboard/analytics/types.ts`
- Create: `frontend/src/features/admin/dashboard/analytics/chartColors.ts`
- Create: `frontend/src/features/admin/dashboard/analytics/SegmentControl.tsx`
- Create: `frontend/src/features/admin/dashboard/analytics/AnalyticsShell.tsx`
- Create: `frontend/src/features/admin/dashboard/analytics/InventoryCompositionChart.tsx`
- Create: `frontend/src/features/admin/dashboard/analytics/DeliveryTrendChart.tsx`
- Create: `frontend/src/features/admin/dashboard/analytics/CardKeyStatusChart.tsx`
- Create: `frontend/src/features/admin/dashboard/analytics/InventoryWarnings.tsx`

- [ ] **Step 1: Extract shared analytics types**

Create `frontend/src/features/admin/dashboard/analytics/types.ts`:

```ts
import type { DeliveryTrendBucket, InventoryCounts } from "@/lib/admin/overviewCharts";

export type CardKeyStatusSummary = {
  active: number;
  redeemed: number;
  expired: number;
  total: number;
  activePercent: number;
  redeemedPercent: number;
  expiredPercent: number;
};

export type WorkbenchAnalyticsProps = {
  fileInventory: InventoryCounts[];
  deliveryTrend: DeliveryTrendBucket[];
  cardKeyStatus: CardKeyStatusSummary;
};

export type AnalyticsPanel = "inventory" | "trend" | "status";
export type InventoryChartMode = "stacked" | "percent";
export type TrendChartMode = "line" | "area";

export type SegmentOption<T extends string> = {
  value: T;
  label: string;
};
```

- [ ] **Step 2: Extract chart color constants**

Create `frontend/src/features/admin/dashboard/analytics/chartColors.ts`:

```ts
export const chartAvailable = "var(--primary)";
export const chartReserved = "var(--accent)";
export const chartRedeemed = "var(--line-strong)";
export const chartDownload = "var(--warning)";
export const chartExpired = "var(--danger)";
```

- [ ] **Step 3: Extract the segment control**

Move `SegmentControl` from `WorkbenchAnalytics.tsx` to `analytics/SegmentControl.tsx`, keeping the same props and behavior:

```tsx
import { cn } from "@/lib/utils";
import type { SegmentOption } from "./types";

export function SegmentControl<T extends string>({
  label,
  value,
  options,
  onChange,
  size = "sm",
}: {
  label: string;
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "inline-flex w-fit rounded-lg border border-[var(--line)] bg-[var(--surface-panel)] p-1 font-semibold text-[var(--muted-strong)]",
        size === "md" ? "text-sm" : "text-xs",
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-md transition-[background-color,color,box-shadow] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]",
              size === "md" ? "px-3 py-1.5" : "px-2.5 py-1.5",
              selected
                ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[0_8px_24px_-18px_oklch(0.19_0.021_165/.9)]"
                : "hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Extract charts one by one**

Move these functions out of `WorkbenchAnalytics.tsx` without changing rendered markup:

- `AnalyticsShell` -> `analytics/AnalyticsShell.tsx`
- `InventoryCompositionChart`, `InventoryStackedRows`, `InventoryPercentRows`, `MiniPercentBar`, `LegendItem` -> `analytics/InventoryCompositionChart.tsx`
- `DeliveryTrendChart` -> `analytics/DeliveryTrendChart.tsx`
- `CardKeyStatusChart`, `StatusRow` -> `analytics/CardKeyStatusChart.tsx`
- `InventoryWarnings`, `warningColor` -> `analytics/InventoryWarnings.tsx`

Keep `WorkbenchAnalytics.tsx` as the composition file only:

```tsx
import { useState } from "react";
import { AnalyticsShell } from "./analytics/AnalyticsShell";
import { CardKeyStatusChart } from "./analytics/CardKeyStatusChart";
import { DeliveryTrendChart } from "./analytics/DeliveryTrendChart";
import { InventoryCompositionChart } from "./analytics/InventoryCompositionChart";
import { InventoryWarnings } from "./analytics/InventoryWarnings";
import type { AnalyticsPanel, WorkbenchAnalyticsProps } from "./analytics/types";

function AnalyticsPanelContent({
  activePanel,
  fileInventory,
  deliveryTrend,
  cardKeyStatus,
}: WorkbenchAnalyticsProps & { activePanel: AnalyticsPanel }) {
  // keep existing panel ordering logic
}

export function WorkbenchAnalytics({ fileInventory, deliveryTrend, cardKeyStatus }: WorkbenchAnalyticsProps) {
  const [activePanel, setActivePanel] = useState<AnalyticsPanel>("inventory");

  return (
    <AnalyticsShell
      fileInventory={fileInventory}
      deliveryTrend={deliveryTrend}
      cardKeyStatus={cardKeyStatus}
      activePanel={activePanel}
      onPanelChange={setActivePanel}
    >
      <AnalyticsPanelContent
        activePanel={activePanel}
        fileInventory={fileInventory}
        deliveryTrend={deliveryTrend}
        cardKeyStatus={cardKeyStatus}
      />
    </AnalyticsShell>
  );
}
```

- [ ] **Step 5: Verify**

Run:

```bash
npm test -- frontend/src/lib/admin/overviewCharts.test.ts --run
npm run typecheck
npm run build
```

Expected: helper tests still pass, and the dashboard route still builds into lazy chunks.

## Task 5: Split Card Key Form Internals

**Files:**
- Modify: `frontend/src/features/admin/cards/CardKeyForm.tsx`
- Create: `frontend/src/features/admin/cards/CardKeyGoodsPicker.tsx`
- Create: `frontend/src/features/admin/cards/GeneratedCardKeyResult.tsx`
- Create: `frontend/src/features/admin/cards/cardKeyClipboard.ts`
- Modify: `frontend/src/features/admin/cards/CardKeyForm.test.tsx`
- Modify: `frontend/src/features/admin/cards/CardKeyForm.scale.test.tsx`

- [ ] **Step 1: Extract clipboard helpers**

Create `frontend/src/features/admin/cards/cardKeyClipboard.ts`:

```ts
export function copyWithTextareaFallback(text: string) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, text.length);
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);
  return copied;
}

export function copyText(text: string) {
  const fallbackCopied = copyWithTextareaFallback(text);
  if (!navigator.clipboard?.writeText) return Promise.resolve(fallbackCopied);

  return navigator.clipboard
    .writeText(text)
    .then(() => true)
    .catch(() => fallbackCopied);
}
```

- [ ] **Step 2: Extract generated result display**

Move `ResultCopyButton` and `GeneratedCardKeyResult` into `GeneratedCardKeyResult.tsx`, importing `copyText` from `cardKeyClipboard.ts`.

- [ ] **Step 3: Extract goods picker**

Move picker constants and picker rendering into `CardKeyGoodsPicker.tsx`:

```tsx
export function CardKeyGoodsPicker({
  goods,
  selectedGoodsId,
  onSelectGoodsId,
}: {
  goods: CardKeyGoodsPickerItem[];
  selectedGoodsId: string;
  onSelectGoodsId: (goodsId: string) => void;
}) {
  // existing picker state, remoteGoods query, positioning, filtering, portal rendering
}
```

`CardKeyForm.tsx` should keep only:

- generated result state
- selected goods ID state
- expiration and file quantity form submission
- generate mutation and query invalidation

- [ ] **Step 4: Verify**

Run:

```bash
npm test -- frontend/src/features/admin/cards/CardKeyForm.test.tsx frontend/src/features/admin/cards/CardKeyForm.scale.test.tsx frontend/src/lib/admin/goodsPicker.test.ts --run
npm run typecheck
```

Expected: existing form behavior and goods picker scale tests still pass.

## Task 6: Split Goods Row Actions Into Dialog And Menu Components

**Files:**
- Modify: `frontend/src/features/admin/goods/GoodsActions.tsx`
- Create: `frontend/src/features/admin/goods/GoodsExportMenu.tsx`
- Create: `frontend/src/features/admin/goods/GoodsDetailDialog.tsx`
- Create: `frontend/src/features/admin/goods/GoodsUploadDialog.tsx`
- Create: `frontend/src/features/admin/goods/GoodsDeleteDialog.tsx`
- Test: `frontend/src/lib/admin/goodsTableUi.test.ts`

- [ ] **Step 1: Extract export menu**

Move export-menu positioning, portal rendering, and `renderExportItem` into `GoodsExportMenu.tsx`:

```tsx
export function GoodsExportMenu({
  goodsId,
  unredeemedCount,
  redeemedCount,
}: {
  goodsId: string;
  unredeemedCount: number;
  redeemedCount: number;
}) {
  // existing export button, menu state, portal, and links
}
```

- [ ] **Step 2: Extract dialogs**

Move each dialog into its own file:

- `GoodsDetailDialog.tsx` receives `open`, `onOpenChange`, `goodsName`, `goodsType`, and detail sections.
- `GoodsUploadDialog.tsx` receives `open`, `onOpenChange`, `goodsId`, `goodsName`, `error`, `pending`, and `onSubmitFiles`.
- `GoodsDeleteDialog.tsx` receives `open`, `onOpenChange`, `goodsName`, `error`, `pending`, and `onConfirm`.

Keep `GoodsActions.tsx` responsible for mutations and high-level button composition.

- [ ] **Step 3: Verify**

Run:

```bash
npm test -- frontend/src/lib/admin/goodsTableUi.test.ts --run
npm run typecheck
```

Expected: detail-section logic still passes and `GoodsActions.tsx` remains behaviorally unchanged.

## Task 7: Introduce Query Key Helpers Before API Split

**Files:**
- Create: `frontend/src/api/queryKeys.ts`
- Modify: all files using literal React Query keys under `frontend/src/features`

- [ ] **Step 1: Create query key helpers**

Create `frontend/src/api/queryKeys.ts`:

```ts
import type { GoodsStatus, CardKeyStatus, LogType } from "@/types";

export const queryKeys = {
  session: ["session"] as const,
  overview: ["overview"] as const,
  settings: ["settings"] as const,
  receipt: (token: string) => ["receipt", token] as const,
  goods: (input: { q?: string; status?: GoodsStatus | ""; page?: number } = {}) =>
    ["goods", input.q ?? "", input.status ?? "", input.page ?? 1] as const,
  goodsRoot: ["goods"] as const,
  cardGoodsOptions: (query = "") => ["goods", "card-options", query] as const,
  cardGoodsOptionsRoot: ["goods", "card-options"] as const,
  cardKeys: (input: { q?: string; status?: CardKeyStatus | ""; page?: number } = {}) =>
    ["cardKeys", input.q ?? "", input.status ?? "", input.page ?? 1] as const,
  cardKeysRoot: ["cardKeys"] as const,
  logs: (input: { type: LogType; q?: string; page?: number }) => ["logs", input.type, input.q ?? "", input.page ?? 1] as const,
};
```

- [ ] **Step 2: Replace literal keys**

Examples:

```tsx
useQuery({ queryKey: ["overview"], queryFn: api.overview });
```

becomes:

```tsx
useQuery({ queryKey: queryKeys.overview, queryFn: api.overview });
```

and:

```tsx
queryClient.invalidateQueries({ queryKey: ["goods"] });
```

becomes:

```tsx
queryClient.invalidateQueries({ queryKey: queryKeys.goodsRoot });
```

- [ ] **Step 3: Verify**

Run:

```bash
npm test -- --run
npm run typecheck
```

Expected: all frontend tests pass.

## Task 8: Split API And DTO Modules By Domain

**Files:**
- Create: `frontend/src/api/client.ts`
- Create: `frontend/src/api/public.ts`
- Create: `frontend/src/api/admin.ts`
- Modify: `frontend/src/api.ts`
- Create: `frontend/src/types/shared.ts`
- Create: `frontend/src/types/public.ts`
- Create: `frontend/src/types/admin.ts`
- Modify: `frontend/src/types.ts`
- Modify: feature imports that currently use `@/api` and `@/types`

- [ ] **Step 1: Move fetch client and CSRF state**

Create `frontend/src/api/client.ts` with `apiFetch`, `setCsrfToken`, and `clearCsrfToken`.

Keep the same runtime behavior:

```ts
let csrfToken = window.localStorage.getItem("auto_delivery_csrf") ?? "";

export function setCsrfToken(token: string) {
  csrfToken = token;
  window.localStorage.setItem("auto_delivery_csrf", token);
}

export function clearCsrfToken() {
  csrfToken = "";
  window.localStorage.removeItem("auto_delivery_csrf");
}
```

- [ ] **Step 2: Split public API methods**

Move public methods into `frontend/src/api/public.ts`:

```ts
export const publicApi = {
  redeem(cardKey: string) {
    return apiFetch<{ receiptToken: string; receiptPath: string; goodsType: "TEXT" | "FILE" }>("/api/public/redeem", {
      method: "POST",
      body: JSON.stringify({ cardKey }),
    });
  },
  receipt(token: string) {
    return apiFetch<Receipt>(`/api/public/receipt/${encodeURIComponent(token)}`);
  },
};
```

- [ ] **Step 3: Split admin API methods**

Move admin methods into `frontend/src/api/admin.ts`:

```ts
export const adminApi = {
  login,
  session,
  logout,
  overview,
  goods,
  cardGoodsOptions,
  createGoods,
  updateGoods,
  deleteGoods,
  uploadFiles,
  cardKeys,
  generateCardKey,
  deleteCardKey,
  logs,
  settings,
  updateSettings,
};
```

Use the current method bodies from `frontend/src/api.ts` without changing endpoint paths.

- [ ] **Step 4: Keep compatibility export**

Keep `frontend/src/api.ts` as a short compatibility barrel:

```ts
export { clearCsrfToken, setCsrfToken } from "./api/client";
export { adminApi } from "./api/admin";
export { publicApi } from "./api/public";

export const api = {
  ...publicApi,
  ...adminApi,
};
```

After feature imports are migrated, this barrel can remain for tests or be removed in a later cleanup.

- [ ] **Step 5: Split DTO types**

Move types without changing names:

- `types/shared.ts`: `GoodsType`, `GoodsStatus`, `CardKeyStatus`, `Inventory`, `Goods`, `CardKey`, pagination shapes.
- `types/public.ts`: `Receipt`.
- `types/admin.ts`: `AdminSession`, overview types, logs types, `Settings`.

Keep `frontend/src/types.ts` as a compatibility barrel:

```ts
export * from "./types/shared";
export * from "./types/public";
export * from "./types/admin";
```

- [ ] **Step 6: Verify**

Run:

```bash
npm test -- --run
npm run typecheck
npm run build
```

Expected: all frontend tests, typecheck, and production build pass.

## Task 9: Prune Legacy Global CSS

**Files:**
- Modify: `frontend/src/styles.css`
- Modify if needed: `frontend/src/features/public/shared/public-pages.module.css`
- Modify if needed: `frontend/src/features/admin/auth/login.module.css`

- [ ] **Step 1: Identify unused global selectors**

Run:

```bash
rg -n "\\b(ticket|receipt|login-panel|panel|table-panel|stat|admin-shell|sidebar|side-brand|nav-link|side-logout|admin-main|topbar|stat-grid|form-grid|key-form|settings-form|muted-badge|upload-line|generated|primary|secondary|ghost|danger|plain-link|public-screen)\\b" frontend/src --glob '!styles.css' --glob '!**/*.test.*'
```

Treat selectors with no source usage as removable, except `.secondary`, which is still used in `frontend/src/features/admin/logs/LogsPage.tsx`.

- [ ] **Step 2: Remove unused legacy page selectors**

Remove only selectors confirmed unused. Keep:

- Tailwind import
- font-face declarations
- `:root` tokens
- `@theme inline`
- base element reset
- `.brand-script`
- `.admin-filter-search-input`
- `.admin-sidebar-brand-word`
- `.centered`
- any global selector still used by source files

- [ ] **Step 3: Replace `.secondary` usage in logs**

In `frontend/src/features/admin/logs/LogsPage.tsx`, replace:

```tsx
className={cn("secondary", page <= 1 && "pointer-events-none opacity-50")}
```

with:

```tsx
className={cn(buttonVariants({ variant: "outline" }), page <= 1 && "pointer-events-none opacity-50")}
```

Then remove `.secondary` from `styles.css`.

- [ ] **Step 4: Verify**

Run:

```bash
npm test -- frontend/src/features/admin/logs/LogsPage.tsx --run
npm run typecheck
npm run build
```

If there is no focused `LogsPage` test file, run:

```bash
npm test -- --run
```

Expected: all frontend verification passes and generated CSS remains valid.

## Task 10: Final Verification And Review Checklist

**Files:**
- No required source changes unless verification exposes issues.

- [ ] **Step 1: Run full frontend verification**

Run:

```bash
npm test -- --run
npm run typecheck
npm run build
```

Expected: all pass.

- [ ] **Step 2: Inspect dependency direction**

Run:

```bash
rg -n "@/features/public|@/features/admin|node_modules" frontend/src --glob '!**/*.test.*'
```

Expected:

- `features/public` may import from `features/public`, `components`, `lib`, `api`, and `types`.
- `features/admin` may import from `features/admin`, `components`, `lib`, `api`, and `types`.
- No admin file imports from `@/features/public/...`.
- No source file imports from direct `node_modules/...`.

- [ ] **Step 3: Inspect large files**

Run:

```bash
wc -l frontend/src/features/admin/dashboard/WorkbenchAnalytics.tsx frontend/src/features/admin/cards/CardKeyForm.tsx frontend/src/features/admin/goods/GoodsActions.tsx frontend/src/styles.css
```

Expected direction:

- `WorkbenchAnalytics.tsx` is mostly orchestration.
- `CardKeyForm.tsx` no longer owns picker rendering and clipboard implementation.
- `GoodsActions.tsx` no longer owns every dialog and export menu detail.
- `styles.css` contains global foundations, not old page-level layout systems.

- [ ] **Step 4: Optional browser smoke**

If backend and database are running, perform a manual route smoke:

```bash
npm run dev
```

Visit:

```text
http://localhost:5173/
http://localhost:5173/admin/login
http://localhost:5173/admin
http://localhost:5173/admin/goods
http://localhost:5173/admin/cards
http://localhost:5173/admin/logs
http://localhost:5173/admin/settings
```

Expected: routes render, lazy chunks load, and no console errors appear from import path changes.

## Rollout Notes

- Prefer one commit per task. The first two tasks are low risk and should be done before any larger extraction.
- Do not combine CSS pruning with component extraction. CSS pruning should happen after imports and ownership are stable.
- Keep compatibility barrels (`frontend/src/api.ts`, `frontend/src/types.ts`) during the first pass. Removing them is a separate cleanup and is not required for this plan.
- If any task creates visual drift, stop that task and decide whether the drift is intentional before continuing.

## Self-Review

- Spec coverage: this plan covers the identified issues: shared brand ownership, brittle `node_modules` import, empty legacy directories, stale docs/tests, large feature files, API/type split readiness, and global CSS cleanup.
- Placeholder scan: no task uses unresolved placeholder markers, unspecified deferred work, or undefined future work as an implementation dependency.
- Type consistency: planned names use current domain names and existing exported type names unless the plan explicitly creates a compatibility barrel.
