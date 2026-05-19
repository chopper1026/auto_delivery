import { Archive, CheckCircle2, Clock3, Download, PackageOpen, TicketCheck } from "lucide-react";
import { StatCard } from "@/components/admin/stat-card";
import { WorkbenchAnalytics } from "@/components/admin/workbench-analytics";
import { getOverviewStats } from "@/lib/admin/overview";

export default async function AdminOverviewPage() {
  const stats = await getOverviewStats();

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 border-b border-[var(--line)] pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--ink)]">工作台</h2>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard label="卡密总数" value={stats.totalCardKeys} icon={Archive} />
        <StatCard label="可兑换" value={stats.activeCardKeys} icon={TicketCheck} />
        <StatCard label="已兑换" value={stats.redeemedCardKeys} icon={CheckCircle2} />
        <StatCard label="已过期" value={stats.expiredCardKeys} icon={Clock3} />
        <StatCard label="今日兑换" value={stats.todaysRedemptions} icon={PackageOpen} />
        <StatCard label="今日下载" value={stats.todaysDownloads} icon={Download} />
      </section>

      <WorkbenchAnalytics
        fileInventory={stats.fileInventory}
        deliveryTrend={stats.deliveryTrend}
        cardKeyStatus={stats.cardKeyStatus}
      />
    </div>
  );
}
