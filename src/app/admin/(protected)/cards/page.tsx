import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CardKeyForm } from "@/components/admin/card-key-form";
import { requireAdminSession } from "@/lib/admin/auth";
import { listCardKeys } from "@/lib/card-keys/service";
import { listGoodsWithInventory } from "@/lib/goods/service";
import { rotateCsrfToken } from "@/lib/security/csrf";
import { deleteCardKeyAction } from "./actions";

function formatDate(date: Date | null) {
  if (!date) return "永不过期";
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default async function AdminCardsPage() {
  const { token } = await requireAdminSession();
  const csrfToken = await rotateCsrfToken(token);
  const [goods, cards] = await Promise.all([listGoodsWithInventory(), listCardKeys()]);
  const goodsOptions = goods
    .filter((item) => item.status === "ACTIVE")
    .map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      available: item.inventory.available,
    }));

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.36em] text-cyan-300">Card Keys</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight">卡密管理</h2>
      </div>

      <CardKeyForm csrfToken={csrfToken} goods={goodsOptions} />

      <Card>
        <CardHeader>
          <CardTitle>卡密列表</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>卡密</TableHead>
                <TableHead>货物</TableHead>
                <TableHead>数量</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>过期时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cards.map((card) => (
                <TableRow key={card.id}>
                  <TableCell className="font-mono text-white">{card.keyMask}</TableCell>
                  <TableCell>{card.goods.name}</TableCell>
                  <TableCell>{card.goodsType === "FILE" ? card.fileQuantity : "文本"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        card.status === "ACTIVE" ? "default" : card.status === "REDEEMED" ? "secondary" : "warning"
                      }
                    >
                      {card.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(card.expiresAt)}</TableCell>
                  <TableCell>
                    {card.status === "ACTIVE" ? (
                      <form action={deleteCardKeyAction}>
                        <input type="hidden" name="csrfToken" value={csrfToken} />
                        <input type="hidden" name="cardKeyId" value={card.id} />
                        <Button type="submit" variant="ghost" size="sm">
                          删除
                        </Button>
                      </form>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
              {cards.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-slate-500">
                    还没有卡密。
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
