import { ChartLine, FolderOpen } from "lucide-react";
import type { ReactNode } from "react";
import { buildAnalyticsTotals } from "@/lib/admin/overviewCharts";
import { cn } from "@/lib/utils";
import { SegmentControl } from "./SegmentControl";
import type { AnalyticsPanel, SegmentOption, WorkbenchAnalyticsProps } from "./types";

const numberFormatter = new Intl.NumberFormat("zh-CN");

const analyticsPanelOptions: SegmentOption<AnalyticsPanel>[] = [
  { value: "inventory", label: "库存构成" },
  { value: "trend", label: "交付趋势" },
  { value: "status", label: "卡密状态" },
];

export function formatNumber(value: number) {
  return numberFormatter.format(value);
}

export function AnalyticsShell({
  fileInventory,
  deliveryTrend,
  cardKeyStatus,
  activePanel,
  onPanelChange,
  children,
}: WorkbenchAnalyticsProps & {
  activePanel: AnalyticsPanel;
  onPanelChange: (panel: AnalyticsPanel) => void;
  children: ReactNode;
}) {
  const totals = buildAnalyticsTotals({ fileInventory, deliveryTrend });
  const availableTotal = fileInventory.reduce((sum, item) => sum + item.available, 0);
  const reservedTotal = fileInventory.reduce((sum, item) => sum + item.reserved, 0);
  const redeemedTotal = fileInventory.reduce((sum, item) => sum + item.redeemed, 0);
  const availableRate = totals.inventoryTotal > 0 ? Math.round((availableTotal / totals.inventoryTotal) * 10000) / 100 : 0;
  const reservedRate = totals.inventoryTotal > 0 ? Math.round((reservedTotal / totals.inventoryTotal) * 10000) / 100 : 0;
  const redeemedRate = totals.inventoryTotal > 0 ? Math.round((redeemedTotal / totals.inventoryTotal) * 10000) / 100 : 0;

  return (
    <section className="overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]">
      <div className="flex flex-col gap-3 border-b border-[var(--line)] px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <ChartLine className="h-5 w-5 text-[var(--muted)]" aria-hidden="true" />
          <h3 className="font-semibold text-[var(--ink)]">工作台分析</h3>
          <span className="text-sm text-[var(--muted)]">
            库存：{formatNumber(totals.inventoryTotal)} / 卡密：{formatNumber(cardKeyStatus.total)}
          </span>
        </div>
        <SegmentControl label="工作台分析视图" value={activePanel} options={analyticsPanelOptions} onChange={onPanelChange} size="md" />
      </div>

      <div className="grid divide-y divide-[var(--line)] border-b border-[var(--line)] sm:grid-cols-3 sm:divide-x sm:divide-y-0 xl:grid-cols-6">
        <MetricBlock label="文件库存" value={totals.inventoryTotal} detail="总文件数" icon={<FolderOpen className="h-4 w-4" />} />
        <MetricBlock label="可用库存" value={availableTotal} detail="可发放文件" />
        <MetricBlock label="预占库存" value={reservedTotal} detail="已绑定卡密" />
        <MetricBlock label="已兑库存" value={redeemedTotal} detail="已完成兑换" />
        <MetricBlock label="7 日兑换" value={totals.trendRedemptions} detail="趋势统计" />
        <MetricBlock label="7 日下载" value={totals.trendDownloads} detail="成功下载" />
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-[var(--line)] px-4 py-3 text-sm text-[var(--muted)]">
        <span className="font-semibold text-[var(--ink)]">库存健康</span>
        <span className="hidden h-5 w-px bg-[var(--line)] sm:block" />
        <span>
          可用率 <b className="text-[var(--primary)]">{availableRate.toFixed(2)}%</b>
        </span>
        <span>
          预占率 <b className="text-[var(--accent-ink)]">{reservedRate.toFixed(2)}%</b>
        </span>
        <span>
          已兑率 <b className="text-[var(--muted-strong)]">{redeemedRate.toFixed(2)}%</b>
        </span>
        <span className="rounded-full bg-[var(--primary-soft)] px-3 py-1 text-[var(--primary)]">
          可兑换卡密 <b>{cardKeyStatus.activePercent}%</b>
        </span>
      </div>

      <div className="bg-[var(--surface-panel)] p-4">{children}</div>
    </section>
  );
}

function MetricBlock({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: number;
  detail: string;
  icon?: ReactNode;
}) {
  return (
    <div className="min-w-0 bg-[var(--surface)] px-4 py-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)]">
        {icon ?? <span className="text-[var(--muted)]">#</span>}
        {label}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--ink)] tabular-nums">{formatNumber(value)}</p>
      <p className="mt-1 text-xs text-[var(--muted)]">{detail}</p>
    </div>
  );
}

export function ChartCard({
  icon,
  title,
  meta,
  actions,
  children,
  className = "",
}: {
  icon: ReactNode;
  title: string;
  meta?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface)]", className)}>
      <div className="flex flex-col gap-3 border-b border-[var(--line)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-[var(--muted)]">{icon}</span>
          <h4 className="truncate font-semibold text-[var(--ink)]">{title}</h4>
          {meta ? <span className="shrink-0 text-sm text-[var(--muted)]">{meta}</span> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
