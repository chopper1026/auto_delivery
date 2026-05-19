import Link from "next/link";
import { Search } from "lucide-react";
import { EmptyState } from "@/components/admin/empty-state";
import { AdminPagination } from "@/components/admin/pagination";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { countAdminLogs, getAdminLogs } from "@/lib/admin/logs";
import { formatDownloadResult } from "@/lib/display-labels";
import { getPagination, parsePageParam } from "@/lib/pagination";

const tabs = [
  { type: "redemptions", label: "兑换" },
  { type: "downloads", label: "下载" },
  { type: "admin", label: "后台" },
] as const;

type LogType = (typeof tabs)[number]["type"];

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function normalizeType(type?: string): LogType {
  return tabs.some((tab) => tab.type === type) ? (type as LogType) : "redemptions";
}

function tabHref(type: LogType, query: string) {
  const params = new URLSearchParams({ type });
  if (query) params.set("q", query);
  return `/admin/logs?${params.toString()}`;
}

function downloadVariant(result: string): BadgeProps["variant"] {
  if (result === "SUCCESS") return "default";
  if (result === "ALREADY_DOWNLOADED") return "warning";
  return "destructive";
}

function formatAdminAction(action: string) {
  const labels: Record<string, string> = {
    "goods.create_text": "新增文本货物",
    "goods.create_file": "新增文件货物",
    "goods.upload_files": "上传库存",
    "goods.disable": "停用货物",
    "goods.enable": "启用货物",
    "card.generate": "生成卡密",
    "card.delete": "删除卡密",
    "settings.update_service_base_url": "更新服务地址",
  };
  return labels[action] ?? action;
}

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; q?: string; page?: string | string[] }>;
}) {
  const params = await searchParams;
  const type = normalizeType(params.type);
  const query = params.q?.trim() ?? "";
  const totalLogs = await countAdminLogs({ type, query });
  const pagination = getPagination({ page: parsePageParam(params.page), totalItems: totalLogs });
  const logs = await getAdminLogs({ type, query, skip: pagination.skip, take: pagination.pageSize });
  const currentTab = tabs.find((tab) => tab.type === type);

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 border-b border-[var(--line)] pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--ink)]">交付日志</h2>
        </div>
        <form className="flex w-full max-w-md gap-2 md:justify-end">
          <input type="hidden" name="type" value={type} />
          <Input name="q" defaultValue={query} placeholder="搜索 IP、UA、动作" className="min-w-0" />
          <Button type="submit" variant="outline" size="icon" aria-label="搜索">
            <Search className="h-4 w-4" aria-hidden="true" />
          </Button>
        </form>
      </header>

      <div className="inline-flex rounded-lg border border-[var(--line)] bg-[var(--surface)] p-1">
        {tabs.map((tab) => (
          <Link
            key={tab.type}
            href={tabHref(tab.type, query)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              type === tab.type ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "text-[var(--muted-strong)] hover:bg-[var(--surface-muted)]"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <section className="overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]">
        <div className="border-b border-[var(--line)] px-4 py-3">
          <h3 className="font-semibold text-[var(--ink)]">{currentTab?.label}日志</h3>
        </div>

        {type === "redemptions" ? (
          logs.redemptions.length > 0 ? (
            <Table className="min-w-[1040px] table-fixed">
              <colgroup>
                <col className="w-[18%]" />
                <col className="w-[16%]" />
                <col className="w-[22%]" />
                <col className="w-[16%]" />
                <col className="w-[28%]" />
              </colgroup>
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
                    <TableCell className="font-mono text-[var(--ink)]">{log.cardKey.keyMask}</TableCell>
                    <TableCell className="truncate font-medium text-[var(--ink)]">{log.goods.name}</TableCell>
                    <TableCell className="font-mono text-xs">{log.ipAddress}</TableCell>
                    <TableCell className="max-w-sm truncate text-xs">{log.userAgent}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-4">
              <EmptyState message="暂无兑换日志。" />
            </div>
          )
        ) : null}

        {type === "downloads" ? (
          logs.downloads.length > 0 ? (
            <Table className="min-w-[1100px] table-fixed">
              <colgroup>
                <col className="w-[16%]" />
                <col className="w-[12%]" />
                <col className="w-[16%]" />
                <col className="w-[20%]" />
                <col className="w-[14%]" />
                <col className="w-[22%]" />
              </colgroup>
              <TableHeader>
                <TableRow>
                  <TableHead>时间</TableHead>
                  <TableHead>结果</TableHead>
                  <TableHead>卡密</TableHead>
                  <TableHead>货物</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>UA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.downloads.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{formatDate(log.createdAt)}</TableCell>
                    <TableCell>
                      <Badge variant={downloadVariant(log.result)}>{formatDownloadResult(log.result)}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-[var(--ink)]">{log.redemption?.cardKey.keyMask ?? "-"}</TableCell>
                    <TableCell className="truncate font-medium text-[var(--ink)]">{log.redemption?.goods.name ?? "-"}</TableCell>
                    <TableCell className="font-mono text-xs">{log.ipAddress}</TableCell>
                    <TableCell className="max-w-sm truncate text-xs">{log.userAgent}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-4">
              <EmptyState message="暂无下载日志。" />
            </div>
          )
        ) : null}

        {type === "admin" ? (
          logs.adminLogs.length > 0 ? (
            <Table className="min-w-[1040px] table-fixed">
              <colgroup>
                <col className="w-[18%]" />
                <col className="w-[20%]" />
                <col className="w-[18%]" />
                <col className="w-[16%]" />
                <col className="w-[28%]" />
              </colgroup>
              <TableHeader>
                <TableRow>
                  <TableHead>时间</TableHead>
                  <TableHead>动作</TableHead>
                  <TableHead>对象</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>UA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.adminLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{formatDate(log.createdAt)}</TableCell>
                    <TableCell className="font-medium text-[var(--ink)]">{formatAdminAction(log.action)}</TableCell>
                    <TableCell>
                      {log.entityType} {log.entityId ?? ""}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{log.ipAddress}</TableCell>
                    <TableCell className="max-w-sm truncate text-xs">{log.userAgent}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-4">
              <EmptyState message="暂无后台操作日志。" />
            </div>
          )
        ) : null}
        <AdminPagination
          basePath="/admin/logs"
          page={pagination.page}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          pageSize={pagination.pageSize}
          query={{ type, q: query }}
        />
      </section>
    </div>
  );
}
