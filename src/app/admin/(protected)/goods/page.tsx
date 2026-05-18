import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { requireAdminSession } from "@/lib/admin/auth";
import { rotateCsrfToken } from "@/lib/security/csrf";
import { listGoodsWithInventory } from "@/lib/goods/service";
import { createFileGoodsAction, createTextGoodsAction, disableGoodsAction, uploadGoodsFilesAction } from "./actions";

export default async function AdminGoodsPage() {
  const { token } = await requireAdminSession();
  const csrfToken = await rotateCsrfToken(token);
  const goods = await listGoodsWithInventory();

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.36em] text-cyan-300">Goods</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight">货物管理</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>添加文本货物</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createTextGoodsAction} className="space-y-4">
              <input type="hidden" name="csrfToken" value={csrfToken} />
              <div className="space-y-2">
                <Label htmlFor="text-name">货物名称</Label>
                <Input id="text-name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="text-content">文本内容</Label>
                <Textarea id="text-content" name="textContent" required />
              </div>
              <Button type="submit">添加文本货物</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>添加文件货物</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createFileGoodsAction} className="space-y-4">
              <input type="hidden" name="csrfToken" value={csrfToken} />
              <div className="space-y-2">
                <Label htmlFor="file-name">货物名称</Label>
                <Input id="file-name" name="name" placeholder="例如：cpa文件" required />
              </div>
              <Button type="submit">添加文件货物</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>货物列表</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>库存</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {goods.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium text-white">{item.name}</TableCell>
                  <TableCell>{item.type === "TEXT" ? "文本" : "文件"}</TableCell>
                  <TableCell>
                    <Badge variant={item.status === "ACTIVE" ? "default" : "secondary"}>
                      {item.status === "ACTIVE" ? "启用" : "停用"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {item.type === "FILE"
                      ? `总数 ${item.inventory.total} / 可用 ${item.inventory.available} / 预占 ${item.inventory.reserved} / 已兑 ${item.inventory.redeemed}`
                      : "文本货物"}
                  </TableCell>
                  <TableCell className="space-y-3">
                    {item.type === "FILE" ? (
                      <form action={uploadGoodsFilesAction} className="flex flex-col gap-2">
                        <input type="hidden" name="csrfToken" value={csrfToken} />
                        <input type="hidden" name="goodsId" value={item.id} />
                        <Input name="files" type="file" accept=".json,application/json" multiple required />
                        <Button type="submit" variant="outline" size="sm">
                          上传 JSON
                        </Button>
                      </form>
                    ) : null}
                    {item.status === "ACTIVE" ? (
                      <form action={disableGoodsAction}>
                        <input type="hidden" name="csrfToken" value={csrfToken} />
                        <input type="hidden" name="goodsId" value={item.id} />
                        <Button type="submit" variant="ghost" size="sm">
                          停用
                        </Button>
                      </form>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
              {goods.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-slate-500">
                    还没有货物。
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
