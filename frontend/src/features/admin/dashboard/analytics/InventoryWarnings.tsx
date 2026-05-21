import { AlertTriangle } from "lucide-react";
import { EmptyState } from "../../shared/EmptyState";
import { buildInventoryWarnings, type InventoryCounts } from "@/lib/admin/overviewCharts";
import { ChartCard } from "./AnalyticsShell";
import { chartAvailable, chartExpired } from "./chartColors";

function warningColor(severity: "high" | "medium" | "normal") {
  if (severity === "high") return chartExpired;
  if (severity === "medium") return "var(--warning)";
  return chartAvailable;
}

export function InventoryWarnings({ items, className = "xl:col-span-7" }: { items: InventoryCounts[]; className?: string }) {
  const warnings = buildInventoryWarnings(items).slice(0, 4);

  return (
    <ChartCard
      className={className}
      icon={<AlertTriangle className="h-4 w-4" aria-hidden="true" />}
      title="库存预警"
      meta="按风险排序"
    >
      <div className="grid min-h-[250px] gap-3 px-4 py-5">
        {warnings.length > 0 ? (
          warnings.map((item) => {
            const color = warningColor(item.severity);
            return (
              <div key={item.goodsId} className="grid gap-3 rounded-lg border border-[var(--line)] bg-[var(--surface-panel)] px-4 py-3 sm:grid-cols-[1fr_140px_76px] sm:items-center">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[var(--ink)]">{item.goodsName}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">{item.label}</p>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]">
                  <div className="h-full rounded-full" style={{ width: `${item.percent}%`, backgroundColor: color }} />
                </div>
                <b className="text-right tabular-nums" style={{ color }}>
                  {item.ratioLabel}
                </b>
              </div>
            );
          })
        ) : (
          <EmptyState message="还没有库存预警数据。" />
        )}
      </div>
    </ChartCard>
  );
}
