import { useQuery } from "@tanstack/react-query";
import { Archive, CheckCircle2, Clock3, Download, PackageOpen, TicketCheck } from "lucide-react";
import { adminApi } from "@/api/admin";
import { queryKeys } from "@/api/queryKeys";
import { StatCard } from "./StatCard";
import { WorkbenchAnalytics } from "./WorkbenchAnalytics";

export function DashboardPage() {
  const overview = useQuery({ queryKey: queryKeys.overview, queryFn: adminApi.overview });
  const stats = overview.data;

  return (
    <div className="space-y-5">
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
