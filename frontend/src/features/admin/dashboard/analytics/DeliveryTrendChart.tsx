import { useId, useState } from "react";
import { ChartLine } from "lucide-react";
import { buildLineChartPoints, type DeliveryTrendBucket } from "@/lib/admin/overviewCharts";
import { ChartCard } from "./AnalyticsShell";
import { chartAvailable, chartDownload } from "./chartColors";
import { LegendItem } from "./InventoryCompositionChart";
import { SegmentControl } from "./SegmentControl";
import type { SegmentOption, TrendChartMode } from "./types";

const trendModeOptions: SegmentOption<TrendChartMode>[] = [
  { value: "line", label: "折线图" },
  { value: "area", label: "面积图" },
];

export function DeliveryTrendChart({ buckets, className = "xl:col-span-5" }: { buckets: DeliveryTrendBucket[]; className?: string }) {
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
