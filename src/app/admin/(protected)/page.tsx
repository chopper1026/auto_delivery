import { EmptyState } from "@/components/admin/empty-state";
import { StatCard } from "@/components/admin/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getOverviewStats } from "@/lib/admin/overview";

export default async function AdminOverviewPage() {
  const stats = await getOverviewStats();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.36em] text-cyan-300">Overview</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight">概览</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="卡密总数" value={stats.totalCardKeys} />
        <StatCard label="有效卡密" value={stats.activeCardKeys} />
        <StatCard label="已兑换" value={stats.redeemedCardKeys} />
        <StatCard label="已过期" value={stats.expiredCardKeys} />
        <StatCard label="今日兑换" value={stats.todaysRedemptions} />
        <StatCard label="今日下载" value={stats.todaysDownloads} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>文件库存</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.fileInventory.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>货物</TableHead>
                  <TableHead>总数</TableHead>
                  <TableHead>可用</TableHead>
                  <TableHead>预占</TableHead>
                  <TableHead>已兑换</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.fileInventory.map((item) => (
                  <TableRow key={item.goodsId}>
                    <TableCell className="font-medium text-white">{item.goodsName}</TableCell>
                    <TableCell>{item.total}</TableCell>
                    <TableCell>{item.available}</TableCell>
                    <TableCell>{item.reserved}</TableCell>
                    <TableCell>{item.redeemed}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState message="还没有文件类货物库存。" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
