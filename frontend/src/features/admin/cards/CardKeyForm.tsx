import { useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Wand2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { adminApi } from "@/api/admin";
import { queryKeys } from "@/api/queryKeys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { getInitialCardKeyGoodsId, isCardKeyGoodsSelectable, type CardKeyGoodsPickerItem } from "@/lib/admin/goodsPicker";
import { CardKeyGoodsPicker } from "./CardKeyGoodsPicker";
import { GeneratedCardKeyResult } from "./GeneratedCardKeyResult";

function getSelectedGoods(goods: CardKeyGoodsPickerItem[], selectedGoodsId: string) {
  return goods.find((item) => item.id === selectedGoodsId) ?? goods.find(isCardKeyGoodsSelectable) ?? goods[0] ?? null;
}

export function CardKeyForm({ goods }: { goods: CardKeyGoodsPickerItem[] }) {
  const queryClient = useQueryClient();
  const [generated, setGenerated] = useState<{ plaintextKey: string; keyMask: string; deliveryMessage?: string } | null>(null);
  const [selectedGoodsId, setSelectedGoodsId] = useState(() => getInitialCardKeyGoodsId(goods));
  const [selectedGoods, setSelectedGoods] = useState<CardKeyGoodsPickerItem | null>(() => getSelectedGoods(goods, getInitialCardKeyGoodsId(goods)));
  const selected = useMemo(() => selectedGoods ?? getSelectedGoods(goods, selectedGoodsId), [goods, selectedGoods, selectedGoodsId]);
  const selectedSelectable = selected ? isCardKeyGoodsSelectable(selected) : false;
  const generate = useMutation({
    mutationFn: adminApi.generateCardKey,
    onSuccess: (result) => {
      setGenerated(result);
      queryClient.invalidateQueries({ queryKey: queryKeys.cardKeysRoot });
      queryClient.invalidateQueries({ queryKey: queryKeys.goodsRoot });
      queryClient.invalidateQueries({ queryKey: queryKeys.cardGoodsOptionsRoot });
    },
  });

  useEffect(() => {
    const current = goods.find((item) => item.id === selectedGoodsId);
    if (current) {
      setSelectedGoods(current);
      return;
    }

    if (!selectedGoods || selectedGoods.id !== selectedGoodsId) {
      const initialGoodsId = getInitialCardKeyGoodsId(goods);
      setSelectedGoodsId(initialGoodsId);
      setSelectedGoods(getSelectedGoods(goods, initialGoodsId));
    }
  }, [goods, selectedGoods, selectedGoodsId]);

  function handleSelectGoods(item: CardKeyGoodsPickerItem) {
    setSelectedGoodsId(item.id);
    setSelectedGoods(item);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !selectedSelectable) return;
    const form = new FormData(event.currentTarget);
    generate.mutate({
      goodsId: selected.id,
      expiration: String(form.get("expiration") ?? "3d"),
      fileQuantity: selected.type === "FILE" ? Number(form.get("fileQuantity") ?? 1) : 0,
    });
  }

  return (
    <section className="overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]">
      <div className="border-b border-[var(--line)] px-4 py-3">
        <div className="flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-[var(--primary)]" aria-hidden="true" />
          <h3 className="font-semibold text-[var(--ink)]">生成卡密</h3>
        </div>
      </div>
      <div className="p-4">
        <form onSubmit={submit} className="grid gap-3 lg:grid-cols-[minmax(280px,420px)_120px_140px_max-content] lg:items-end">
          <CardKeyGoodsPicker goods={goods} selectedGoodsId={selectedGoodsId} onSelectGoodsId={setSelectedGoodsId} onSelectGoods={handleSelectGoods} />
          <div className="space-y-2">
            <Label htmlFor="fileQuantity">文件数量</Label>
            <Input
              key={selected?.id ?? "empty"}
              id="fileQuantity"
              name="fileQuantity"
              type="number"
              min={selected?.type === "FILE" ? 1 : 0}
              max={selected?.type === "FILE" ? selected.inventory.available : undefined}
              defaultValue={selected?.type === "FILE" ? 1 : 0}
              required={selected?.type === "FILE"}
              disabled={selected?.type !== "FILE" || !selectedSelectable}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expiration">有效期</Label>
            <Select id="expiration" name="expiration" defaultValue="3d">
              <option value="3m">3 分钟</option>
              <option value="1d">1 天</option>
              <option value="3d">3 天</option>
              <option value="7d">7 天</option>
              <option value="never">永不过期</option>
            </Select>
          </div>
          <Button type="submit" disabled={generate.isPending || !selected || !selectedSelectable} className="w-full lg:w-32">
            <KeyRound className="h-4 w-4" aria-hidden="true" />
            {generate.isPending ? "生成中" : "生成"}
          </Button>
        </form>

        <AnimatePresence mode="popLayout">
          {generated ? (
            <motion.div className="mt-4" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
              <GeneratedCardKeyResult plaintextKey={generated.plaintextKey} keyMask={generated.keyMask} deliveryMessage={generated.deliveryMessage} />
            </motion.div>
          ) : null}
          {generate.error ? (
            <motion.p
              className="mt-4 rounded-lg border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              {generate.error.message}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>
    </section>
  );
}
