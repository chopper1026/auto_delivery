import { Archive, CheckCircle2, Clock3, Download, PackageOpen, TicketCheck } from "lucide-react";
import { EmptyState } from "@/components/admin/empty-state";
import { StatCard } from "@/components/admin/stat-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

      <section className="overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]">
        <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] px-4 py-3">
          <div>
            <h3 className="font-semibold text-[var(--ink)]">文件库存</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">按货物聚合的库存状态</p>
          </div>
        </div>
        {stats.fileInventory.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>货物</TableHead>
                <TableHead className="text-right">总数</TableHead>
                <TableHead className="text-right">可用</TableHead>
                <TableHead className="text-right">预占</TableHead>
                <TableHead className="text-right">已兑换</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.fileInventory.map((item) => (
                <TableRow key={item.goodsId}>
                  <TableCell className="font-medium text-[var(--ink)]">{item.goodsName}</TableCell>
                  <TableCell className="text-right tabular-nums">{item.total}</TableCell>
                  <TableCell className="text-right tabular-nums text-[var(--primary)]">{item.available}</TableCell>
                  <TableCell className="text-right tabular-nums">{item.reserved}</TableCell>
                  <TableCell className="text-right tabular-nums">{item.redeemed}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="p-4">
            <EmptyState message="还没有文件类货物库存。" />
          </div>
        )}
      </section>
    </div>
  );
}
