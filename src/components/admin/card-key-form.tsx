"use client";

import { useActionState, useMemo, useState } from "react";
import { Check, Clipboard, KeyRound, Wand2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { generateCardKeyAction, type GenerateCardKeyState } from "@/app/admin/(protected)/cards/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type GoodsOption = {
  id: string;
  name: string;
  type: "TEXT" | "FILE";
  available: number;
};

const initialState: GenerateCardKeyState = {};

function copyWithTextareaFallback(text: string) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, text.length);
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);
  return copied;
}

export function CardKeyForm({ csrfToken, goods }: { csrfToken: string; goods: GoodsOption[] }) {
  const [state, formAction, pending] = useActionState(generateCardKeyAction, initialState);
  const [selectedGoodsId, setSelectedGoodsId] = useState(goods[0]?.id ?? "");
  const [copied, setCopied] = useState(false);
  const selected = useMemo(
    () => goods.find((item) => item.id === selectedGoodsId) ?? goods[0],
    [goods, selectedGoodsId],
  );

  async function copyGeneratedKey() {
    if (!state.plaintextKey) return;
    const fallbackCopied = copyWithTextareaFallback(state.plaintextKey);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
    if (!navigator.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(state.plaintextKey);
    } catch {
      if (!fallbackCopied) setCopied(false);
    }
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
        <form action={formAction} className="grid gap-3 lg:grid-cols-[minmax(220px,320px)_120px_140px_max-content] lg:items-end">
          <input type="hidden" name="csrfToken" value={csrfToken} />
          <div className="space-y-2">
            <Label htmlFor="goodsId">关联货物</Label>
            <Select
              id="goodsId"
              name="goodsId"
              value={selectedGoodsId}
              onChange={(event) => setSelectedGoodsId(event.target.value)}
              required
            >
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
              key={selected?.id ?? "empty"}
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
              <option value="3m">3 分钟</option>
              <option value="1d">1 天</option>
              <option value="3d">3 天</option>
              <option value="7d">7 天</option>
              <option value="never">永不过期</option>
            </Select>
          </div>
          <Button type="submit" disabled={pending || goods.length === 0} className="w-full lg:w-32">
            <KeyRound className="h-4 w-4" aria-hidden="true" />
            {pending ? "生成中" : "生成"}
          </Button>
        </form>

        <AnimatePresence mode="popLayout">
          {state.plaintextKey ? (
            <motion.div
              className="mt-4 rounded-lg border border-[var(--primary)]/20 bg-[var(--primary-soft)] p-4"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              <p className="text-sm font-medium text-[var(--primary)]">完整卡密只显示一次</p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                <code className="min-w-0 flex-1 break-all rounded-lg bg-[var(--surface)] px-3 py-2 font-mono text-base font-semibold text-[var(--ink)]">
                  {state.plaintextKey}
                </code>
                <Button type="button" variant="outline" onClick={copyGeneratedKey}>
                  {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Clipboard className="h-4 w-4" aria-hidden="true" />}
                  {copied ? "已复制" : "复制"}
                </Button>
              </div>
            </motion.div>
          ) : null}
          {state.error ? (
            <motion.p
              className="mt-4 rounded-lg border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              {state.error}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>
    </section>
  );
}
