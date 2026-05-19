import { Archive } from "lucide-react";
import { CardKeyForm } from "@/components/admin/card-key-form";
import { DeleteCardKeyButton } from "@/components/admin/delete-card-key-button";
import { AdminListFilters } from "@/components/admin/list-filters";
import { AdminPagination } from "@/components/admin/pagination";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CardKeyStatus } from "@/generated/prisma/enums";
import { requireAdminSession } from "@/lib/admin/auth";
import { countCardKeys, listCardKeys } from "@/lib/card-keys/service";
import { formatCardKeyStatus, formatGoodsType } from "@/lib/display-labels";
import { listGoodsWithInventory } from "@/lib/goods/service";
import { getPagination, parsePageParam } from "@/lib/pagination";
import { getFirstSearchParam } from "@/lib/search-params";
import { rotateCsrfToken } from "@/lib/security/csrf";

function formatDate(date: Date | null) {
  if (!date) return "永不过期";
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function cardStatusVariant(status: string): BadgeProps["variant"] {
  if (status === "ACTIVE") return "default";
  if (status === "REDEEMED") return "secondary";
  if (status === "DELETED") return "outline";
  return "warning";
}

const cardStatusOptions = [
  CardKeyStatus.ACTIVE,
  CardKeyStatus.REDEEMED,
  CardKeyStatus.EXPIRED,
  CardKeyStatus.DELETED,
].map((status) => ({
  value: status,
  label: formatCardKeyStatus(status),
}));

function parseCardStatus(value: string): CardKeyStatus | undefined {
  return Object.values(CardKeyStatus).includes(value as CardKeyStatus) ? (value as CardKeyStatus) : undefined;
}

export default async function AdminCardsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[]; q?: string | string[]; status?: string | string[] }>;
}) {
  const params = await searchParams;
  const { token } = await requireAdminSession();
  const csrfToken = await rotateCsrfToken(token);
  const query = getFirstSearchParam(params.q).trim();
  const status = parseCardStatus(getFirstSearchParam(params.status));
  const statusParam = status ?? "";
  const filters = { query, status };
  const [goods, totalCards] = await Promise.all([listGoodsWithInventory(), countCardKeys(filters)]);
  const pagination = getPagination({ page: parsePageParam(params.page), totalItems: totalCards });
  const cards = await listCardKeys({ ...filters, skip: pagination.skip, take: pagination.pageSize });
  const goodsOptions = goods
    .filter((item) => item.status === "ACTIVE")
    .map((item) => ({
      id: item.id,
      name: item.name,
      note: item.note,
      type: item.type,
      inventory: item.inventory,
    }));

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 border-b border-[var(--line)] pb-5 md:flex-row md:items-end">
        <div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--ink)]">卡密管理</h2>
        </div>
      </header>

      <CardKeyForm csrfToken={csrfToken} goods={goodsOptions} />

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
            {cards.map((card) => (
              <TableRow key={card.id}>
                <TableCell className="truncate font-mono font-medium text-[var(--ink)]">{card.keyMask}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Archive className="h-4 w-4 text-[var(--muted)]" aria-hidden="true" />
                    <span className="truncate font-medium text-[var(--ink)]">{card.goods.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {card.goodsType === "FILE" ? `${formatGoodsType(card.goodsType)} ${card.fileQuantity} 个` : formatGoodsType(card.goodsType)}
                </TableCell>
                <TableCell>
                  <Badge variant={cardStatusVariant(card.status)}>{formatCardKeyStatus(card.status)}</Badge>
                </TableCell>
                <TableCell>{formatDate(card.expiresAt)}</TableCell>
                <TableCell className="pl-2">
                  {card.status === "ACTIVE" ? (
                    <DeleteCardKeyButton cardKeyId={card.id} csrfToken={csrfToken} keyMask={card.keyMask} />
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
            {cards.length === 0 ? (
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
