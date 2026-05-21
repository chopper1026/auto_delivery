import { useState } from "react";
import { BarChart3 } from "lucide-react";
import { EmptyState } from "../../shared/EmptyState";
import { buildInventoryCompositionRows, type InventoryCounts } from "@/lib/admin/overviewCharts";
import { ChartCard, formatNumber } from "./AnalyticsShell";
import { chartAvailable, chartRedeemed, chartReserved } from "./chartColors";
import { SegmentControl } from "./SegmentControl";
import type { InventoryChartMode, SegmentOption } from "./types";

const inventoryModeOptions: SegmentOption<InventoryChartMode>[] = [
  { value: "stacked", label: "堆叠条" },
  { value: "percent", label: "百分比" },
];

export function InventoryCompositionChart({ items, className = "xl:col-span-7" }: { items: InventoryCounts[]; className?: string }) {
  const [mode, setMode] = useState<InventoryChartMode>("stacked");
  const rows = buildInventoryCompositionRows(items);
  const total = items.reduce((sum, item) => sum + item.total, 0);

  return (
    <ChartCard
      className={className}
      icon={<BarChart3 className="h-4 w-4" aria-hidden="true" />}
      title="文件库存构成"
      meta={`总计：${formatNumber(total)}`}
      actions={<SegmentControl label="文件库存构成图表类型" value={mode} options={inventoryModeOptions} onChange={setMode} />}
    >
      {rows.length > 0 ? (
        <div className="px-4 py-5">
          {mode === "stacked" ? <InventoryStackedRows rows={rows} /> : <InventoryPercentRows rows={rows} />}
        </div>
      ) : (
        <div className="p-4">
          <EmptyState message="还没有文件类货物库存。" />
        </div>
      )}
    </ChartCard>
  );
}

function InventoryStackedRows({ rows }: { rows: ReturnType<typeof buildInventoryCompositionRows> }) {
  return (
    <>
      <div className="relative pl-0">
        <div className="pointer-events-none absolute inset-x-0 top-0 hidden h-full grid-cols-5 sm:grid">
          {Array.from({ length: 5 }).map((_, index) => (
            <span key={index} className={index === 0 ? "" : "border-l border-[var(--line)]"} />
          ))}
        </div>
        <div className="relative space-y-4">
          {rows.map((item) => (
            <div key={item.goodsId} className="grid gap-2 sm:grid-cols-[minmax(100px,156px)_1fr_64px] sm:items-center">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--ink)]">{item.goodsName}</p>
                <p className="text-xs text-[var(--muted)]">总 {formatNumber(item.total)}</p>
              </div>
              <div
                className="flex h-7 overflow-hidden rounded bg-[var(--surface-muted)] ring-1 ring-inset ring-[var(--line)]"
                aria-label={`${item.goodsName} 可用 ${item.available}，预占 ${item.reserved}，已兑换 ${item.redeemed}`}
              >
                <span style={{ width: `${item.availablePercent}%`, backgroundColor: chartAvailable }} title={`可用 ${item.available}`} />
                <span style={{ width: `${item.reservedPercent}%`, backgroundColor: chartReserved }} title={`预占 ${item.reserved}`} />
                <span style={{ width: `${item.redeemedPercent}%`, backgroundColor: chartRedeemed }} title={`已兑换 ${item.redeemed}`} />
              </div>
              <p className="text-right text-sm font-semibold text-[var(--primary)] tabular-nums">{item.availablePercent}%</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 text-xs text-[var(--muted)]">
        <div className="hidden flex-1 justify-between sm:flex">
          <span>0</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
        <div className="flex shrink-0 flex-wrap gap-4 text-[var(--muted-strong)]">
          <LegendItem color={chartAvailable} label="可用" />
          <LegendItem color={chartReserved} label="预占" />
          <LegendItem color={chartRedeemed} label="已兑换" />
        </div>
      </div>
    </>
  );
}

function InventoryPercentRows({ rows }: { rows: ReturnType<typeof buildInventoryCompositionRows> }) {
  return (
    <div className="grid gap-3">
      {rows.map((item) => (
        <div key={item.goodsId} className="rounded-lg border border-[var(--line)] bg-[var(--surface-panel)] p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--ink)]">{item.goodsName}</p>
              <p className="text-xs text-[var(--muted)]">总 {formatNumber(item.total)}</p>
            </div>
            <b className="text-sm text-[var(--primary)] tabular-nums">{item.availablePercent}% 可用</b>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <MiniPercentBar label="可用" value={item.available} percent={item.availablePercent} color={chartAvailable} />
            <MiniPercentBar label="预占" value={item.reserved} percent={item.reservedPercent} color={chartReserved} />
            <MiniPercentBar label="已兑换" value={item.redeemed} percent={item.redeemedPercent} color={chartRedeemed} />
          </div>
        </div>
      ))}
    </div>
  );
}

function MiniPercentBar({ label, value, percent, color }: { label: string; value: number; percent: number; color: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2 text-xs text-[var(--muted)]">
        <span>{label}</span>
        <span className="tabular-nums">
          {formatNumber(value)} / {percent}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]">
        <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
