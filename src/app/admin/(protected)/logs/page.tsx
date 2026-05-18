import Link from "next/link";
import { EmptyState } from "@/components/admin/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAdminLogs } from "@/lib/admin/logs";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: "redemptions" | "downloads" | "admin"; q?: string }>;
}) {
  const params = await searchParams;
  const type = params.type ?? "redemptions";
  const query = params.q ?? "";
  const logs = await getAdminLogs({ type, query, take: 80 });
  const tabs = [
    { type: "redemptions", label: "兑换日志" },
    { type: "downloads", label: "下载日志" },
    { type: "admin", label: "后台操作" },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.36em] text-cyan-300">Logs</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight">日志</h2>
      </div>
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.type}
            href={`/admin/logs?type=${tab.type}`}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              type === tab.type ? "bg-cyan-300 text-slate-950" : "bg-slate-900 text-slate-300 hover:text-white"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
      <form className="max-w-md">
        <input type="hidden" name="type" value={type} />
        <Input name="q" defaultValue={query} placeholder="按 IP、UA、动作搜索" />
      </form>

      <Card>
        <CardHeader>
          <CardTitle>{tabs.find((tab) => tab.type === type)?.label}</CardTitle>
        </CardHeader>
        <CardContent>
          {type === "redemptions" ? (
            logs.redemptions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>时间</TableHead>
                    <TableHead>卡密</TableHead>
                    <TableHead>货物</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>UA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.redemptions.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{formatDate(log.redeemedAt)}</TableCell>
                      <TableCell className="font-mono">{log.cardKey.keyMask}</TableCell>
                      <TableCell>{log.goods.name}</TableCell>
                      <TableCell>{log.ipAddress}</TableCell>
                      <TableCell className="max-w-sm truncate">{log.userAgent}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState message="暂无兑换日志。" />
            )
          ) : null}

          {type === "downloads" ? (
            logs.downloads.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>时间</TableHead>
                    <TableHead>结果</TableHead>
                    <TableHead>卡密</TableHead>
                    <TableHead>货物</TableHead>
                    <TableHead>IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.downloads.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{formatDate(log.createdAt)}</TableCell>
                      <TableCell>
                        <Badge variant={log.result === "SUCCESS" ? "default" : "warning"}>{log.result}</Badge>
                      </TableCell>
                      <TableCell className="font-mono">{log.redemption?.cardKey.keyMask ?? "-"}</TableCell>
                      <TableCell>{log.redemption?.goods.name ?? "-"}</TableCell>
                      <TableCell>{log.ipAddress}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState message="暂无下载日志。" />
            )
          ) : null}

          {type === "admin" ? (
            logs.adminLogs.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>时间</TableHead>
                    <TableHead>动作</TableHead>
                    <TableHead>对象</TableHead>
                    <TableHead>IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.adminLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{formatDate(log.createdAt)}</TableCell>
                      <TableCell>{log.action}</TableCell>
                      <TableCell>
                        {log.entityType} {log.entityId ?? ""}
                      </TableCell>
                      <TableCell>{log.ipAddress}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState message="暂无后台操作日志。" />
            )
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
