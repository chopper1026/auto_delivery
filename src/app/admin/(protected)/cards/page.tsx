import { Archive, Trash2 } from "lucide-react";
import { CardKeyForm } from "@/components/admin/card-key-form";
import { AdminPagination } from "@/components/admin/pagination";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdminSession } from "@/lib/admin/auth";
import { countCardKeys, listCardKeys } from "@/lib/card-keys/service";
import { formatCardKeyStatus, formatGoodsType } from "@/lib/display-labels";
import { listGoodsWithInventory } from "@/lib/goods/service";
import { getPagination, parsePageParam } from "@/lib/pagination";
import { rotateCsrfToken } from "@/lib/security/csrf";
import { deleteCardKeyAction } from "./actions";

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

export default async function AdminCardsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const params = await searchParams;
  const { token } = await requireAdminSession();
  const csrfToken = await rotateCsrfToken(token);
  const [goods, totalCards] = await Promise.all([listGoodsWithInventory(), countCardKeys()]);
  const pagination = getPagination({ page: parsePageParam(params.page), totalItems: totalCards });
  const cards = await listCardKeys({ skip: pagination.skip, take: pagination.pageSize });
  const goodsOptions = goods
    .filter((item) => item.status === "ACTIVE")
    .map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      available: item.inventory.available,
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
        <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] px-4 py-3">
          <div>
            <h3 className="font-semibold text-[var(--ink)]">卡密状态表</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">完整卡密只在生成后展示，列表仅保留掩码。</p>
          </div>
        </div>
        <Table className="w-[1320px] max-w-full">
          <TableHeader>
            <TableRow>
              <TableHead>卡密</TableHead>
              <TableHead>货物</TableHead>
              <TableHead>交付</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>过期时间</TableHead>
              <TableHead className="w-32 pr-12">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cards.map((card) => (
              <TableRow key={card.id}>
                <TableCell className="font-mono font-medium text-[var(--ink)]">{card.keyMask}</TableCell>
                <TableCell className="w-32 pr-12">
                  <div className="flex items-center gap-2">
                    <Archive className="h-4 w-4 text-[var(--muted)]" aria-hidden="true" />
                    <span className="font-medium text-[var(--ink)]">{card.goods.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {card.goodsType === "FILE" ? `${formatGoodsType(card.goodsType)} ${card.fileQuantity} 个` : formatGoodsType(card.goodsType)}
                </TableCell>
                <TableCell>
                  <Badge variant={cardStatusVariant(card.status)}>{formatCardKeyStatus(card.status)}</Badge>
                </TableCell>
                <TableCell>{formatDate(card.expiresAt)}</TableCell>
                <TableCell>
                  <div className="flex justify-start">
                    {card.status === "ACTIVE" ? (
                      <form action={deleteCardKeyAction}>
                        <input type="hidden" name="csrfToken" value={csrfToken} />
                        <input type="hidden" name="cardKeyId" value={card.id} />
                        <Button type="submit" variant="ghost" size="sm">
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          删除
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {cards.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-[var(--muted)]">
                  还没有卡密。
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
        />
      </section>
    </div>
  );
}
