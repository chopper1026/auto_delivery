import { Archive, CirclePlay, FileText, PauseCircle, Upload } from "lucide-react";
import { NewGoodsDialog } from "@/components/admin/new-goods-dialog";
import { AdminPagination } from "@/components/admin/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdminSession } from "@/lib/admin/auth";
import { formatGoodsStatus, formatGoodsType } from "@/lib/display-labels";
import { countGoods, listGoodsWithInventory } from "@/lib/goods/service";
import { getPagination, parsePageParam } from "@/lib/pagination";
import { rotateCsrfToken } from "@/lib/security/csrf";
import { disableGoodsAction, enableGoodsAction, uploadGoodsFilesAction } from "./actions";

export default async function AdminGoodsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const params = await searchParams;
  const { token } = await requireAdminSession();
  const csrfToken = await rotateCsrfToken(token);
  const totalGoods = await countGoods();
  const pagination = getPagination({ page: parsePageParam(params.page), totalItems: totalGoods });
  const goods = await listGoodsWithInventory({ skip: pagination.skip, take: pagination.pageSize });

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 border-b border-[var(--line)] pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--ink)]">库存管理</h2>
        </div>
        <NewGoodsDialog csrfToken={csrfToken} />
      </header>

      <section className="overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]">
        <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] px-4 py-3">
          <div>
            <h3 className="font-semibold text-[var(--ink)]">库存工作区</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">文件货物可在行内上传 JSON，货物可按状态启用或停用。</p>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>货物</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>库存</TableHead>
              <TableHead className="min-w-64">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {goods.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-muted)] text-[var(--muted-strong)]">
                      {item.type === "TEXT" ? <FileText className="h-4 w-4" aria-hidden="true" /> : <Archive className="h-4 w-4" aria-hidden="true" />}
                    </span>
                    <span className="font-medium text-[var(--ink)]">{item.name}</span>
                  </div>
                </TableCell>
                <TableCell>{formatGoodsType(item.type)}</TableCell>
                <TableCell>
                  <Badge variant={item.status === "ACTIVE" ? "default" : "secondary"}>{formatGoodsStatus(item.status)}</Badge>
                </TableCell>
                <TableCell>
                  {item.type === "FILE" ? (
                    <div className="flex flex-wrap gap-1.5 text-xs">
                      <span className="rounded-md bg-[var(--surface-muted)] px-2 py-1">总 {item.inventory.total}</span>
                      <span className="rounded-md bg-[var(--primary-soft)] px-2 py-1 text-[var(--primary)]">可用 {item.inventory.available}</span>
                      <span className="rounded-md bg-[var(--accent)]/35 px-2 py-1 text-[var(--accent-ink)]">预占 {item.inventory.reserved}</span>
                      <span className="rounded-md bg-[var(--surface-muted)] px-2 py-1">已兑 {item.inventory.redeemed}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-[var(--muted)]">文本内容</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                    {item.type === "FILE" ? (
                      <form action={uploadGoodsFilesAction} className="flex shrink-0 items-center gap-2">
                        <input type="hidden" name="csrfToken" value={csrfToken} />
                        <input type="hidden" name="goodsId" value={item.id} />
                        <Input name="files" type="file" accept=".json,application/json" multiple required className="w-56 min-w-0 max-w-full" />
                        <Button type="submit" variant="outline" size="sm">
                          <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                          上传
                        </Button>
                      </form>
                    ) : null}
                    {item.status === "ACTIVE" ? (
                      <form action={disableGoodsAction}>
                        <input type="hidden" name="csrfToken" value={csrfToken} />
                        <input type="hidden" name="goodsId" value={item.id} />
                        <Button type="submit" variant="outline" size="sm" className="text-[var(--danger)] hover:bg-[var(--danger-soft)]">
                          <PauseCircle className="h-3.5 w-3.5" aria-hidden="true" />
                          停用
                        </Button>
                      </form>
                    ) : (
                      <form action={enableGoodsAction}>
                        <input type="hidden" name="csrfToken" value={csrfToken} />
                        <input type="hidden" name="goodsId" value={item.id} />
                        <Button type="submit" variant="outline" size="sm">
                          <CirclePlay className="h-3.5 w-3.5" aria-hidden="true" />
                          启用
                        </Button>
                      </form>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {goods.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-[var(--muted)]">
                  还没有货物。
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
        <AdminPagination
          basePath="/admin/goods"
          page={pagination.page}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          pageSize={pagination.pageSize}
        />
      </section>
    </div>
  );
}
