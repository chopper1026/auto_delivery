import { useQuery } from "@tanstack/react-query";
import { Archive } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { api } from "../../api";
import { CardKeyForm } from "../../components/admin/CardKeyForm";
import { DeleteCardKeyButton } from "../../components/admin/DeleteCardKeyButton";
import { AdminListFilters } from "../../components/admin/ListFilters";
import { AdminPagination } from "../../components/admin/Pagination";
import { Badge, type BadgeProps } from "../../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { buildGoodsOptions } from "../../lib/admin/goodsPicker";
import { formatCardKeyStatus, formatGoodsType } from "../../lib/displayLabels";
import { formatDateTime } from "../../lib/format";
import type { CardKeyStatus } from "../../types";

function formatExpiration(value?: string | null) {
  return value ? formatDateTime(value) : "永不过期";
}

function cardStatusVariant(status: string): BadgeProps["variant"] {
  if (status === "ACTIVE") return "default";
  if (status === "REDEEMED") return "secondary";
  if (status === "DELETED") return "outline";
  return "warning";
}

const cardStatusOptions = (["ACTIVE", "REDEEMED", "EXPIRED", "DELETED"] as CardKeyStatus[]).map((status) => ({
  value: status,
  label: formatCardKeyStatus(status),
}));

function parseCardStatus(value: string | null): CardKeyStatus | undefined {
  return value === "ACTIVE" || value === "REDEEMED" || value === "EXPIRED" || value === "DELETED" ? value : undefined;
}

function parsePage(value: string | null) {
  const page = Number(value ?? "1");
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

export function CardsPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q")?.trim() ?? "";
  const status = parseCardStatus(searchParams.get("status"));
  const statusParam = status ?? "";
  const page = parsePage(searchParams.get("page"));
  const goods = useQuery({ queryKey: ["goods", "card-form"], queryFn: () => api.goods({ pageSize: 100 }) });
  const cards = useQuery({
    queryKey: ["cardKeys", query, statusParam, page],
    queryFn: () => api.cardKeys({ q: query, status, page }),
  });
  const goodsOptions = buildGoodsOptions(goods.data?.items ?? []);
  const items = cards.data?.items ?? [];
  const currentPage = cards.data?.page ?? page;
  const totalPages = cards.data?.totalPages ?? 1;
  const totalItems = cards.data?.totalItems ?? 0;
  const pageSize = cards.data?.pageSize ?? 10;

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 border-b border-[var(--line)] pb-5 md:flex-row md:items-end">
        <div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--ink)]">卡密管理</h2>
        </div>
      </header>

      <CardKeyForm goods={goodsOptions} />

      <section className="overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]">
        <div className="border-b border-[var(--line)] px-4 py-3">
          <div>
            <h3 className="font-semibold text-[var(--ink)]">卡密状态表</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">完整卡密只在生成后展示，列表仅保留掩码。</p>
          </div>
          <AdminListFilters
            action="/admin/cards"
            query={query}
            status={statusParam}
            searchPlaceholder="搜索货物名称或卡密后四位"
            statusOptions={cardStatusOptions}
            resetHref="/admin/cards"
            className="mt-3 max-w-2xl"
          />
        </div>
        <Table className="min-w-[1000px] table-fixed">
          <colgroup>
            <col className="w-[18%]" />
            <col className="w-[22%]" />
            <col className="w-[12%]" />
            <col className="w-[12%]" />
            <col className="w-[24%]" />
            <col className="w-[12%]" />
          </colgroup>
          <TableHeader>
            <TableRow>
              <TableHead>卡密</TableHead>
              <TableHead>货物</TableHead>
              <TableHead>交付</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>过期时间</TableHead>
              <TableHead className="pl-2">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cards.isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-[var(--muted)]">
                  读取卡密中
                </TableCell>
              </TableRow>
            ) : null}
            {cards.isError ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-[var(--danger)]">
                  {cards.error.message}
                </TableCell>
              </TableRow>
            ) : null}
            {!cards.isLoading && !cards.isError
              ? items.map((card) => (
                  <TableRow key={card.id}>
                    <TableCell className="truncate font-mono font-medium text-[var(--ink)]">{card.keyMask}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Archive className="h-4 w-4 text-[var(--muted)]" aria-hidden="true" />
                        <span className="truncate font-medium text-[var(--ink)]">{card.goodsName}</span>
                      </div>
                    </TableCell>
                    <TableCell>{card.goodsType === "FILE" ? `${formatGoodsType(card.goodsType)} ${card.fileQuantity} 个` : formatGoodsType(card.goodsType)}</TableCell>
                    <TableCell>
                      <Badge variant={cardStatusVariant(card.status)}>{formatCardKeyStatus(card.status)}</Badge>
                    </TableCell>
                    <TableCell>{formatExpiration(card.expiresAt)}</TableCell>
                    <TableCell className="pl-2">{card.status === "ACTIVE" ? <DeleteCardKeyButton cardKeyId={card.id} keyMask={card.keyMask} /> : null}</TableCell>
                  </TableRow>
                ))
              : null}
            {!cards.isLoading && !cards.isError && items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-[var(--muted)]">
                  {query || status ? "没有匹配的卡密。" : "还没有卡密。"}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
        <AdminPagination
          basePath="/admin/cards"
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
