import { Archive, FileText } from "lucide-react";
import { GoodsActions } from "@/components/admin/goods-actions";
import { AdminListFilters } from "@/components/admin/list-filters";
import { NewGoodsDialog } from "@/components/admin/new-goods-dialog";
import { AdminPagination } from "@/components/admin/pagination";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GoodsStatus } from "@/generated/prisma/enums";
import { requireAdminSession } from "@/lib/admin/auth";
import { GOODS_TABLE_COLUMN_WIDTHS } from "@/lib/admin/goods-table-ui";
import { formatGoodsStatus, formatGoodsType } from "@/lib/display-labels";
import { countGoods, listGoodsWithInventory } from "@/lib/goods/service";
import { getPagination, parsePageParam } from "@/lib/pagination";
import { getFirstSearchParam } from "@/lib/search-params";
import { rotateCsrfToken } from "@/lib/security/csrf";

const goodsStatusOptions = [GoodsStatus.ACTIVE, GoodsStatus.DISABLED].map((status) => ({
  value: status,
  label: formatGoodsStatus(status),
}));

function parseGoodsStatus(value: string): GoodsStatus | undefined {
  return value === GoodsStatus.ACTIVE || value === GoodsStatus.DISABLED ? value : undefined;
}

export default async function AdminGoodsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[]; q?: string | string[]; status?: string | string[] }>;
}) {
  const params = await searchParams;
  const { token } = await requireAdminSession();
  const csrfToken = await rotateCsrfToken(token);
  const query = getFirstSearchParam(params.q).trim();
  const status = parseGoodsStatus(getFirstSearchParam(params.status));
  const statusParam = status ?? "";
  const filters = { query, status };
  const totalGoods = await countGoods(filters);
  const pagination = getPagination({ page: parsePageParam(params.page), totalItems: totalGoods });
  const goods = await listGoodsWithInventory({ ...filters, skip: pagination.skip, take: pagination.pageSize });

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 border-b border-[var(--line)] pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--ink)]">库存管理</h2>
        </div>
        <NewGoodsDialog csrfToken={csrfToken} />
      </header>

      <section className="overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]">
        <div className="border-b border-[var(--line)] px-4 py-3">
          <div>
            <h3 className="font-semibold text-[var(--ink)]">库存工作区</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">文件货物可在行内上传 JSON，货物可按状态启用或停用。</p>
          </div>
          <AdminListFilters
            action="/admin/goods"
            query={query}
            status={statusParam}
            searchPlaceholder="搜索货物名称"
            statusOptions={goodsStatusOptions}
            resetHref="/admin/goods"
            className="mt-3 max-w-2xl"
          />
        </div>
        <Table className="min-w-[1120px] table-fixed">
          <colgroup>
            <col style={{ width: `${GOODS_TABLE_COLUMN_WIDTHS.goods}%` }} />
            <col style={{ width: `${GOODS_TABLE_COLUMN_WIDTHS.type}%` }} />
            <col style={{ width: `${GOODS_TABLE_COLUMN_WIDTHS.status}%` }} />
            <col style={{ width: `${GOODS_TABLE_COLUMN_WIDTHS.inventory}%` }} />
            <col style={{ width: `${GOODS_TABLE_COLUMN_WIDTHS.actions}%` }} />
          </colgroup>
          <TableHeader>
            <TableRow>
              <TableHead>货物</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>库存</TableHead>
              <TableHead className="min-w-[260px]">操作</TableHead>
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
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-[var(--ink)]">{item.name}</span>
                    </span>
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
                  <GoodsActions
                    csrfToken={csrfToken}
                    goodsId={item.id}
                    goodsName={item.name}
                    goodsType={item.type}
                    goodsNote={item.note}
                    textContent={item.textContent}
                    inventory={item.inventory}
                    usage={item.usage}
                    status={item.status}
                  />
                </TableCell>
              </TableRow>
            ))}
            {goods.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-[var(--muted)]">
                  {query || status ? "没有匹配的货物。" : "还没有货物。"}
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
          query={{ q: query, status: statusParam }}
        />
      </section>
    </div>
  );
}
