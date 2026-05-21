import { useQuery } from "@tanstack/react-query";
import { Archive, FileText } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { adminApi } from "@/api/admin";
import { queryKeys } from "@/api/queryKeys";
import { AdminListFilters } from "../shared/ListFilters";
import { AdminPagination } from "../shared/Pagination";
import { GoodsActions } from "./GoodsActions";
import { NewGoodsDialog } from "./NewGoodsDialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GOODS_TABLE_COLUMN_WIDTHS } from "@/lib/admin/goodsTableUi";
import { formatGoodsStatus, formatGoodsType } from "@/lib/displayLabels";
import type { GoodsStatus } from "@/types/shared";

const goodsStatusOptions = (["ACTIVE", "DISABLED"] as GoodsStatus[]).map((status) => ({
  value: status,
  label: formatGoodsStatus(status),
}));

function parseGoodsStatus(value: string | null): GoodsStatus | undefined {
  return value === "ACTIVE" || value === "DISABLED" ? value : undefined;
}

function parsePage(value: string | null) {
  const page = Number(value ?? "1");
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

export function GoodsPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q")?.trim() ?? "";
  const status = parseGoodsStatus(searchParams.get("status"));
  const statusParam = status ?? "";
  const page = parsePage(searchParams.get("page"));
  const goods = useQuery({
    queryKey: queryKeys.goods({ q: query, status: statusParam, page }),
    queryFn: () => adminApi.goods({ q: query, status, page }),
  });
  const items = goods.data?.items ?? [];
  const currentPage = goods.data?.page ?? page;
  const totalPages = goods.data?.totalPages ?? 1;
  const totalItems = goods.data?.totalItems ?? 0;
  const pageSize = goods.data?.pageSize ?? 10;

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]">
        <div className="border-b border-[var(--line)] px-4 py-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="font-semibold text-[var(--ink)]">库存工作区</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">文件货物可在行内上传 JSON，货物可按状态启用或停用。</p>
            </div>
            <NewGoodsDialog />
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
            {goods.isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-[var(--muted)]">
                  读取货物中
                </TableCell>
              </TableRow>
            ) : null}
            {goods.isError ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-[var(--danger)]">
                  {goods.error.message}
                </TableCell>
              </TableRow>
            ) : null}
            {!goods.isLoading && !goods.isError
              ? items.map((item) => (
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
                ))
              : null}
            {!goods.isLoading && !goods.isError && items.length === 0 ? (
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
          page={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          query={{ q: query, status: statusParam }}
        />
      </section>
    </div>
  );
}
