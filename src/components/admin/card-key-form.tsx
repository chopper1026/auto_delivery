"use client";

import { useActionState, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { generateCardKeyAction, type GenerateCardKeyState } from "@/app/admin/(protected)/cards/actions";

type GoodsOption = {
  id: string;
  name: string;
  type: "TEXT" | "FILE";
  available: number;
};

const initialState: GenerateCardKeyState = {};

export function CardKeyForm({ csrfToken, goods }: { csrfToken: string; goods: GoodsOption[] }) {
  const [state, formAction, pending] = useActionState(generateCardKeyAction, initialState);
  const [selectedGoodsId, setSelectedGoodsId] = useState(goods[0]?.id ?? "");
  const selected = useMemo(
    () => goods.find((item) => item.id === selectedGoodsId) ?? goods[0],
    [goods, selectedGoodsId],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>生成卡密</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4 lg:grid-cols-4">
          <input type="hidden" name="csrfToken" value={csrfToken} />
          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="goodsId">关联货物</Label>
            <Select id="goodsId" name="goodsId" value={selectedGoodsId} onChange={(event) => setSelectedGoodsId(event.target.value)} required>
              {goods.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}（{item.type === "TEXT" ? "文本" : `文件，可用 ${item.available}`}）
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fileQuantity">文件数量</Label>
            <Input
              id="fileQuantity"
              name="fileQuantity"
              type="number"
              min={selected?.type === "FILE" ? 1 : 0}
              defaultValue={selected?.type === "FILE" ? 1 : 0}
              disabled={selected?.type !== "FILE"}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expiration">有效期</Label>
            <Select id="expiration" name="expiration" defaultValue="3d">
              <option value="1d">1天</option>
              <option value="3d">3天</option>
              <option value="7d">7天</option>
              <option value="never">永不过期</option>
            </Select>
          </div>
          <div className="lg:col-span-4">
            <Button type="submit" disabled={pending || goods.length === 0}>
              {pending ? "生成中..." : "生成卡密"}
            </Button>
          </div>
        </form>
        {state.plaintextKey ? (
          <div className="mt-5 rounded-2xl border border-cyan-300/30 bg-cyan-300/10 p-4">
            <p className="text-sm text-cyan-100">完整卡密只显示这一次，请立即保存。</p>
            <code className="mt-2 block break-all text-xl font-black text-white">{state.plaintextKey}</code>
          </div>
        ) : null}
        {state.error ? <p className="mt-4 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-200">{state.error}</p> : null}
      </CardContent>
    </Card>
  );
}
