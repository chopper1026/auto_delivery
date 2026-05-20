import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../api";
import { PageTitle } from "../../components/admin/PageTitle";
import { Badge, type BadgeProps } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { formatDownloadResult } from "../../lib/displayLabels";
import { formatDateTime } from "../../lib/format";
import { cn } from "../../lib/utils";
import type { LogType } from "../../types";

const tabs: Array<{ type: LogType; label: string }> = [
  { type: "redemptions", label: "兑换" },
  { type: "downloads", label: "下载" },
  { type: "admin", label: "后台" },
];

function normalizeType(value: string | null): LogType {
  return value === "downloads" || value === "admin" || value === "redemptions" ? value : "redemptions";
}

function parsePage(value: string | null) {
  const page = Number(value ?? "1");
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
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
    "goods.export_unredeemed": "导出未兑库存",
    "goods.export_redeemed": "导出已兑库存",
    "goods.disable": "停用货物",
    "goods.enable": "启用货物",
    "card_key.generate": "生成卡密",
    "card_key.delete": "删除卡密",
    "settings.update": "更新系统设置",
  };
  return labels[action] ?? action;
}

export function LogsPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const type = normalizeType(params.get("type"));
  const query = params.get("q")?.trim() ?? "";
  const page = parsePage(params.get("page"));
  const logs = useQuery({ queryKey: ["logs", type, query, page], queryFn: () => api.logs({ type, q: query, page }) });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextQuery = String(form.get("q") ?? "").trim();
    const nextParams = new URLSearchParams({ type });
    if (nextQuery) nextParams.set("q", nextQuery);
    navigate(`/admin/logs?${nextParams.toString()}`);
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 border-b border-[var(--line)] pb-5 md:flex-row md:items-end md:justify-between">
        <PageTitle title="交付日志" description="按兑换、下载和后台操作查看系统记录。" />
        <form className="flex w-full max-w-md gap-2 md:justify-end" onSubmit={submit}>
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
            to={tabHref(tab.type, query)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition",
              type === tab.type ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "text-[var(--muted-strong)] hover:bg-[var(--surface-muted)]",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <section className="overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]">
        <div className="border-b border-[var(--line)] px-4 py-3">
          <h3 className="font-semibold text-[var(--ink)]">{tabs.find((tab) => tab.type === type)?.label}日志</h3>
        </div>

        {logs.data?.type === "redemptions" ? (
          logs.data.items.length > 0 ? (
            <Table className="min-w-[1040px] table-fixed">
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
                {logs.data.items.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{formatDateTime(log.redeemedAt)}</TableCell>
                    <TableCell className="font-mono text-[var(--ink)]">{log.cardKeyMask}</TableCell>
                    <TableCell className="truncate font-medium text-[var(--ink)]">{log.goodsName}</TableCell>
                    <TableCell className="font-mono text-xs">{log.ipAddress}</TableCell>
                    <TableCell className="max-w-sm truncate text-xs">{log.userAgent}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="p-4 text-sm text-[var(--muted)]">暂无兑换日志。</p>
          )
        ) : null}

        {logs.data?.type === "downloads" ? (
          logs.data.items.length > 0 ? (
            <Table className="min-w-[1100px] table-fixed">
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
                {logs.data.items.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{formatDateTime(log.createdAt)}</TableCell>
                    <TableCell>
                      <Badge variant={downloadVariant(log.result)}>{formatDownloadResult(log.result)}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-[var(--ink)]">{log.cardKeyMask || "-"}</TableCell>
                    <TableCell className="truncate font-medium text-[var(--ink)]">{log.goodsName || "-"}</TableCell>
                    <TableCell className="font-mono text-xs">{log.ipAddress}</TableCell>
                    <TableCell className="max-w-sm truncate text-xs">{log.userAgent}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="p-4 text-sm text-[var(--muted)]">暂无下载日志。</p>
          )
        ) : null}

        {logs.data?.type === "admin" ? (
          logs.data.items.length > 0 ? (
            <Table className="min-w-[1040px] table-fixed">
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
                {logs.data.items.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{formatDateTime(log.createdAt)}</TableCell>
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
            <p className="p-4 text-sm text-[var(--muted)]">暂无后台操作日志。</p>
          )
        ) : null}

        <div className="flex items-center justify-between border-t border-[var(--line)] px-4 py-3 text-sm text-[var(--muted)]">
          <span>
            共 {logs.data?.totalItems ?? 0} 条，第 {logs.data?.page ?? page} / {logs.data?.totalPages ?? 1} 页
          </span>
          <div className="flex gap-2">
            <Link className={cn("secondary", page <= 1 && "pointer-events-none opacity-50")} to={`/admin/logs?${new URLSearchParams({ type, q: query, page: String(Math.max(1, page - 1)) })}`}>
              上一页
            </Link>
            <Link
              className={cn("secondary", logs.data && page >= logs.data.totalPages && "pointer-events-none opacity-50")}
              to={`/admin/logs?${new URLSearchParams({ type, q: query, page: String(page + 1) })}`}
            >
              下一页
            </Link>
          </div>
        </div>
      </section>
    </section>
  );
}
