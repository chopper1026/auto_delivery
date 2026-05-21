import { CircleGauge } from "lucide-react";
import { ChartCard, formatNumber } from "./AnalyticsShell";
import { chartAvailable, chartExpired, chartReserved } from "./chartColors";
import type { CardKeyStatusSummary } from "./types";

export function CardKeyStatusChart({ status, className = "xl:col-span-5" }: { status: CardKeyStatusSummary; className?: string }) {
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
