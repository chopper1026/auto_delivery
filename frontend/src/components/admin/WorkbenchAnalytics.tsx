"use client";

import { useId, useState, type ReactNode } from "react";
import { AlertTriangle, BarChart3, ChartLine, CircleGauge, FolderOpen } from "lucide-react";
import { EmptyState } from "./EmptyState";
import {
  buildAnalyticsTotals,
  buildInventoryCompositionRows,
  buildInventoryWarnings,
  buildLineChartPoints,
  type DeliveryTrendBucket,
  type InventoryCounts,
} from "../../lib/admin/overviewCharts";
import { cn } from "../../lib/utils";

type CardKeyStatus = {
  active: number;
  redeemed: number;
  expired: number;
  total: number;
  activePercent: number;
  redeemedPercent: number;
  expiredPercent: number;
};

type WorkbenchAnalyticsProps = {
  fileInventory: InventoryCounts[];
  deliveryTrend: DeliveryTrendBucket[];
  cardKeyStatus: CardKeyStatus;
};

type AnalyticsPanel = "inventory" | "trend" | "status";
type InventoryChartMode = "stacked" | "percent";
type TrendChartMode = "line" | "area";

type SegmentOption<T extends string> = {
  value: T;
  label: string;
};

const numberFormatter = new Intl.NumberFormat("zh-CN");
const chartAvailable = "var(--primary)";
const chartReserved = "var(--accent)";
const chartRedeemed = "var(--line-strong)";
const chartDownload = "var(--warning)";
const chartExpired = "var(--danger)";

const analyticsPanelOptions: SegmentOption<AnalyticsPanel>[] = [
  { value: "inventory", label: "库存构成" },
  { value: "trend", label: "交付趋势" },
  { value: "status", label: "卡密状态" },
];

const inventoryModeOptions: SegmentOption<InventoryChartMode>[] = [
  { value: "stacked", label: "堆叠条" },
  { value: "percent", label: "百分比" },
];

const trendModeOptions: SegmentOption<TrendChartMode>[] = [
  { value: "line", label: "折线图" },
  { value: "area", label: "面积图" },
];

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function AnalyticsShell({
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

function ChartCard({
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

function SegmentControl<T extends string>({
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

function InventoryCompositionChart({ items, className = "xl:col-span-7" }: { items: InventoryCounts[]; className?: string }) {
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

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function DeliveryTrendChart({ buckets, className = "xl:col-span-5" }: { buckets: DeliveryTrendBucket[]; className?: string }) {
  const [mode, setMode] = useState<TrendChartMode>("line");
  const rawGradientId = useId();
  const areaGradientId = `${rawGradientId.replace(/:/g, "")}-delivery-trend-area`;
  const redemptions = buckets.map((bucket) => bucket.redemptions);
  const downloads = buckets.map((bucket) => bucket.downloads);
  const maxValue = Math.max(...redemptions, ...downloads, 1);
  const chartWidth = 440;
  const chartHeight = 150;
  const redemptionPoints = buildLineChartPoints(redemptions, { width: chartWidth, height: chartHeight, maxValue });
  const downloadPoints = buildLineChartPoints(downloads, { width: chartWidth, height: chartHeight, maxValue });
  const areaPoints = redemptionPoints ? `${redemptionPoints} ${chartWidth},${chartHeight} 0,${chartHeight}` : "";

  return (
    <ChartCard
      className={className}
      icon={<ChartLine className="h-4 w-4" aria-hidden="true" />}
      title="近 7 日交付趋势"
      actions={<SegmentControl label="交付趋势图表类型" value={mode} options={trendModeOptions} onChange={setMode} />}
    >
      <div className="px-4 py-5">
        <svg className="h-[260px] w-full" viewBox="0 0 520 240" role="img" aria-label="近 7 日兑换和下载趋势">
          <defs>
            <linearGradient id={areaGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.2" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.03" />
            </linearGradient>
          </defs>
          <g className="text-xs" fill="var(--muted)">
            {[maxValue, Math.round(maxValue * 0.75), Math.round(maxValue * 0.5), Math.round(maxValue * 0.25), 0].map((label, index) => (
              <text key={`${label}-${index}`} x="6" y={34 + index * 38}>
                {label}
              </text>
            ))}
          </g>
          <g stroke="var(--line)">
            {Array.from({ length: 5 }).map((_, index) => (
              <line key={index} x1="52" x2="492" y1={30 + index * 38} y2={30 + index * 38} />
            ))}
          </g>
          <g transform="translate(52 30)">
            {mode === "area" && areaPoints ? <polygon points={areaPoints} fill={`url(#${areaGradientId})`} /> : null}
            <polyline points={redemptionPoints} fill="none" stroke={chartAvailable} strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.2" />
            <polyline points={downloadPoints} fill="none" stroke={chartDownload} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.6" />
          </g>
          <g fill="var(--muted)" fontSize="12">
            {buckets.map((bucket, index) => {
              const x = buckets.length > 1 ? 52 + Math.round((chartWidth / (buckets.length - 1)) * index) : 52;
              return (
                <text key={bucket.dateKey} x={x - 16} y="220">
                  {bucket.label}
                </text>
              );
            })}
          </g>
        </svg>
        <div className="mt-2 flex flex-wrap justify-center gap-5 text-sm text-[var(--muted-strong)]">
          <LegendItem color={chartAvailable} label="兑换" />
          <LegendItem color={chartDownload} label="下载" />
        </div>
      </div>
    </ChartCard>
  );
}

function CardKeyStatusChart({ status, className = "xl:col-span-5" }: { status: CardKeyStatus; className?: string }) {
  const redeemedEnd = status.activePercent + status.redeemedPercent;
  const donut = `conic-gradient(${chartAvailable} 0 ${status.activePercent}%, ${chartReserved} ${status.activePercent}% ${redeemedEnd}%, ${chartExpired} ${redeemedEnd}% 100%)`;

  return (
    <ChartCard
      className={className}
      icon={<CircleGauge className="h-4 w-4" aria-hidden="true" />}
      title="卡密状态分布"
      meta={`总计：${formatNumber(status.total)}`}
    >
      <div className="grid min-h-[250px] gap-5 px-4 py-6 sm:grid-cols-[180px_1fr] sm:items-center">
        <div className="mx-auto grid h-40 w-40 place-items-center rounded-full" style={{ background: donut }}>
          <div className="grid h-28 w-28 place-items-center rounded-full border border-[var(--line)] bg-[var(--surface)] text-center">
            <span>
              <b className="block text-3xl tracking-tight text-[var(--ink)]">{status.activePercent}%</b>
              <span className="text-xs text-[var(--muted)]">可兑换</span>
            </span>
          </div>
        </div>
        <div className="space-y-4 text-sm">
          <StatusRow color={chartAvailable} label="可兑换" value={status.active} percent={status.activePercent} />
          <StatusRow color={chartReserved} label="已兑换" value={status.redeemed} percent={status.redeemedPercent} />
          <StatusRow color={chartExpired} label="已过期" value={status.expired} percent={status.expiredPercent} />
        </div>
      </div>
    </ChartCard>
  );
}

function StatusRow({ color, label, value, percent }: { color: string; label: string; value: number; percent: number }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-[var(--ink)]">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
          {label}
        </span>
        <b className="tabular-nums">{formatNumber(value)}</b>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--surface-muted)]">
        <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function warningColor(severity: "high" | "medium" | "normal") {
  if (severity === "high") return chartExpired;
  if (severity === "medium") return "var(--warning)";
  return chartAvailable;
}

function InventoryWarnings({ items, className = "xl:col-span-7" }: { items: InventoryCounts[]; className?: string }) {
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

function AnalyticsPanelContent({
  activePanel,
  fileInventory,
  deliveryTrend,
  cardKeyStatus,
}: WorkbenchAnalyticsProps & { activePanel: AnalyticsPanel }) {
  if (activePanel === "trend") {
    return (
      <div className="grid gap-4 xl:grid-cols-12">
        <DeliveryTrendChart buckets={deliveryTrend} className="xl:col-span-7" />
        <InventoryCompositionChart items={fileInventory} className="xl:col-span-5" />
        <CardKeyStatusChart status={cardKeyStatus} className="xl:col-span-5" />
        <InventoryWarnings items={fileInventory} className="xl:col-span-7" />
      </div>
    );
  }

  if (activePanel === "status") {
    return (
      <div className="grid gap-4 xl:grid-cols-12">
        <CardKeyStatusChart status={cardKeyStatus} className="xl:col-span-5" />
        <DeliveryTrendChart buckets={deliveryTrend} className="xl:col-span-7" />
        <InventoryCompositionChart items={fileInventory} className="xl:col-span-7" />
        <InventoryWarnings items={fileInventory} className="xl:col-span-5" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-12">
      <InventoryCompositionChart items={fileInventory} className="xl:col-span-7" />
      <DeliveryTrendChart buckets={deliveryTrend} className="xl:col-span-5" />
      <CardKeyStatusChart status={cardKeyStatus} className="xl:col-span-5" />
      <InventoryWarnings items={fileInventory} className="xl:col-span-7" />
    </div>
  );
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
