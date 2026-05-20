import { useQuery } from "@tanstack/react-query";
import { Archive, CheckCircle2, Clock3, Download, PackageOpen, TicketCheck } from "lucide-react";
import { api } from "../../api";
import { StatCard } from "../../components/admin/StatCard";
import { WorkbenchAnalytics } from "../../components/admin/WorkbenchAnalytics";

export function DashboardPage() {
  const overview = useQuery({ queryKey: ["overview"], queryFn: api.overview });
  const stats = overview.data;

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 border-b border-[var(--line)] pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--ink)]">工作台</h2>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard label="卡密总数" value={stats?.totalCardKeys ?? 0} icon={Archive} />
        <StatCard label="可兑换" value={stats?.activeCardKeys ?? 0} icon={TicketCheck} />
        <StatCard label="已兑换" value={stats?.redeemedCardKeys ?? 0} icon={CheckCircle2} />
        <StatCard label="已过期" value={stats?.expiredCardKeys ?? 0} icon={Clock3} />
        <StatCard label="今日兑换" value={stats?.todaysRedemptions ?? 0} icon={PackageOpen} />
        <StatCard label="今日下载" value={stats?.todaysDownloads ?? 0} icon={Download} />
      </section>

      <WorkbenchAnalytics
        fileInventory={stats?.fileInventory ?? []}
        deliveryTrend={stats?.deliveryTrend ?? []}
        cardKeyStatus={stats?.cardKeyStatus ?? { active: 0, redeemed: 0, expired: 0, total: 0, activePercent: 0, redeemedPercent: 0, expiredPercent: 0 }}
      />
    </div>
  );
}
