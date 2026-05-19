"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Archive, Check, ChevronDown, Clipboard, FileText, KeyRound, Search, Wand2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { generateCardKeyAction, type GenerateCardKeyState } from "@/app/admin/(protected)/cards/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  filterGoodsForCardKey,
  getInitialCardKeyGoodsId,
  isCardKeyGoodsSelectable,
  type CardKeyGoodsFilter,
  type CardKeyGoodsPickerItem,
  type FilteredCardKeyGoods,
} from "@/lib/admin/goods-picker";
import { cn } from "@/lib/utils";

type GoodsOption = CardKeyGoodsPickerItem;

const initialState: GenerateCardKeyState = {};
const pickerWidth = 560;
const pickerEstimatedHeight = 440;
const goodsFilters: Array<{ value: CardKeyGoodsFilter; label: string }> = [
  { value: "ALL", label: "全部" },
  { value: "TEXT", label: "文本" },
  { value: "FILE", label: "文件" },
  { value: "GENERATABLE", label: "可生成" },
];

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

function formatGoodsMeta(goods: GoodsOption) {
  if (goods.type === "TEXT") return "文本货物，不占用文件库存";
  return `可用 ${goods.inventory.available} / 预占 ${goods.inventory.reserved} / 已兑 ${goods.inventory.redeemed}`;
}

function GoodsIcon({ type }: { type: GoodsOption["type"] }) {
  return type === "TEXT" ? <FileText className="h-4 w-4" aria-hidden="true" /> : <Archive className="h-4 w-4" aria-hidden="true" />;
}

export function CardKeyForm({ csrfToken, goods }: { csrfToken: string; goods: GoodsOption[] }) {
  const [state, formAction, pending] = useActionState(generateCardKeyAction, initialState);
  const [selectedGoodsId, setSelectedGoodsId] = useState(() => getInitialCardKeyGoodsId(goods));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [goodsQuery, setGoodsQuery] = useState("");
  const [goodsFilter, setGoodsFilter] = useState<CardKeyGoodsFilter>("ALL");
  const [pickerPosition, setPickerPosition] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const pickerTriggerRef = useRef<HTMLDivElement>(null);
  const pickerPanelRef = useRef<HTMLDivElement>(null);
  const selected = useMemo(
    () => goods.find((item) => item.id === selectedGoodsId) ?? goods.find(isCardKeyGoodsSelectable) ?? goods[0],
    [goods, selectedGoodsId],
  );
  const selectedSelectable = selected ? isCardKeyGoodsSelectable(selected) : false;
  const filteredGoods = useMemo(
    () => filterGoodsForCardKey(goods, { query: goodsQuery, filter: goodsFilter }),
    [goods, goodsFilter, goodsQuery],
  );

  function getPickerPosition() {
    const rect = pickerTriggerRef.current?.getBoundingClientRect();
    if (!rect) return null;

    const gutter = 12;
    const width = Math.min(pickerWidth, window.innerWidth - gutter * 2);
    const left = Math.min(Math.max(gutter, rect.left), Math.max(gutter, window.innerWidth - width - gutter));
    const belowTop = rect.bottom + 8;
    const hasRoomBelow = belowTop + pickerEstimatedHeight <= window.innerHeight - gutter;
    const top = hasRoomBelow ? belowTop : Math.max(gutter, Math.min(rect.top - pickerEstimatedHeight - 8, window.innerHeight - pickerEstimatedHeight - gutter));
    const maxHeight = Math.min(pickerEstimatedHeight, window.innerHeight - top - gutter);

    return { top, left, width, maxHeight };
  }

  function togglePicker() {
    if (pickerOpen) {
      setPickerOpen(false);
      return;
    }

    const position = getPickerPosition();
    if (!position) return;
    setGoodsQuery("");
    setPickerPosition(position);
    setPickerOpen(true);
  }

  function selectGoods(item: FilteredCardKeyGoods) {
    if (!item.selectable) return;
    setSelectedGoodsId(item.id);
    setGoodsQuery("");
    setPickerOpen(false);
  }

  useEffect(() => {
    if (!pickerOpen) return;

    function updatePickerPosition() {
      const position = getPickerPosition();
      if (position) setPickerPosition(position);
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (!pickerTriggerRef.current?.contains(target) && !pickerPanelRef.current?.contains(target)) {
        setPickerOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPickerOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", updatePickerPosition);
    window.addEventListener("scroll", updatePickerPosition, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updatePickerPosition);
      window.removeEventListener("scroll", updatePickerPosition, true);
    };
  }, [pickerOpen]);

  async function copyGeneratedKey() {
    const text = state.deliveryMessage ?? state.plaintextKey;
    if (!text) return;
    const fallbackCopied = copyWithTextareaFallback(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
    if (!navigator.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(text);
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
        <form action={formAction} className="grid gap-3 lg:grid-cols-[minmax(280px,420px)_120px_140px_max-content] lg:items-end">
          <input type="hidden" name="csrfToken" value={csrfToken} />
          <input type="hidden" name="goodsId" value={selected?.id ?? ""} />
          <div className="space-y-2 lg:min-w-0">
            <Label>关联货物</Label>
            <div ref={pickerTriggerRef}>
              <button
                type="button"
                onClick={togglePicker}
                disabled={goods.length === 0}
                aria-haspopup="dialog"
                aria-expanded={pickerOpen}
                className="flex min-h-14 w-full items-center justify-between gap-3 rounded-lg border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-2 text-left transition hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:bg-[var(--surface-muted)] disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
              >
                {selected ? (
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-muted)] text-[var(--muted-strong)]">
                      <GoodsIcon type={selected.type} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-[var(--ink)]">{selected.name}</span>
                      <span className="mt-0.5 block truncate text-xs text-[var(--muted)]">{formatGoodsMeta(selected)}</span>
                      {selected.note ? <span className="mt-0.5 block truncate text-xs text-[var(--muted-strong)]">{selected.note}</span> : null}
                    </span>
                  </span>
                ) : (
                  <span className="text-sm text-[var(--muted)]">暂无可用货物</span>
                )}
                <ChevronDown className={cn("h-4 w-4 shrink-0 text-[var(--muted-strong)] transition-transform", pickerOpen ? "rotate-180" : "")} aria-hidden="true" />
              </button>
            </div>
          </div>
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
          <Button type="submit" disabled={pending || !selected || !selectedSelectable} className="w-full lg:w-32">
            <KeyRound className="h-4 w-4" aria-hidden="true" />
            {pending ? "生成中" : "生成"}
          </Button>
        </form>

        {pickerOpen && pickerPosition && typeof document !== "undefined"
          ? createPortal(
              <div
                ref={pickerPanelRef}
                role="dialog"
                aria-label="选择关联货物"
                style={{
                  top: pickerPosition.top,
                  left: pickerPosition.left,
                  width: pickerPosition.width,
                  maxHeight: pickerPosition.maxHeight,
                }}
                className="fixed z-50 flex flex-col overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]"
              >
                <div className="border-b border-[var(--line)] p-3">
                  <div className="flex items-center gap-2">
                    <div className="relative min-w-0 flex-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" aria-hidden="true" />
                      <Input
                        value={goodsQuery}
                        onChange={(event) => setGoodsQuery(event.target.value)}
                        placeholder="搜索货物名称或备注"
                        className="pl-9"
                        autoFocus
                      />
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => setPickerOpen(false)} aria-label="关闭货物选择">
                      <X className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {goodsFilters.map((filter) => (
                      <button
                        key={filter.value}
                        type="button"
                        onClick={() => setGoodsFilter(filter.value)}
                        className={cn(
                          "rounded-lg border px-3 py-1.5 text-xs font-semibold transition",
                          goodsFilter === filter.value
                            ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                            : "border-[var(--line)] text-[var(--muted-strong)] hover:bg-[var(--surface-muted)]",
                        )}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-2">
                  {filteredGoods.length > 0 ? (
                    <div className="space-y-1">
                      {filteredGoods.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          disabled={!item.selectable}
                          onClick={() => selectGoods(item)}
                          className={cn(
                            "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition",
                            selected?.id === item.id && "bg-[var(--primary-soft)]",
                            item.selectable ? "hover:bg-[var(--surface-muted)]" : "cursor-not-allowed opacity-55",
                          )}
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-muted)] text-[var(--muted-strong)]">
                              <GoodsIcon type={item.type} />
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-[var(--ink)]">{item.name}</span>
                              <span className="mt-0.5 block truncate text-xs text-[var(--muted)]">{formatGoodsMeta(item)}</span>
                              {item.note ? <span className="mt-0.5 block truncate text-xs text-[var(--muted-strong)]">{item.note}</span> : null}
                            </span>
                          </span>
                          <span className="flex shrink-0 flex-col items-end gap-1">
                            <span className="rounded-md bg-[var(--surface-muted)] px-2 py-1 text-xs text-[var(--muted-strong)]">
                              {item.type === "TEXT" ? "文本" : "文件"}
                            </span>
                            {!item.selectable ? <span className="text-xs text-[var(--danger)]">无可用库存</span> : null}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="px-3 py-8 text-center text-sm text-[var(--muted)]">没有匹配的货物。</p>
                  )}
                </div>
              </div>,
              document.body,
            )
          : null}

        <AnimatePresence mode="popLayout">
          {state.plaintextKey ? (
            <motion.div
              className="mt-4 rounded-lg border border-[var(--primary)]/20 bg-[var(--primary-soft)] p-4"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              <p className="text-sm font-medium text-[var(--primary)]">完整卡密只显示一次，可直接复制客户文案</p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                <code className="min-w-0 flex-1 break-all rounded-lg bg-[var(--surface)] px-3 py-2 font-mono text-base font-semibold text-[var(--ink)]">
                  {state.plaintextKey}
                </code>
                <Button type="button" variant="outline" onClick={copyGeneratedKey}>
                  {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Clipboard className="h-4 w-4" aria-hidden="true" />}
                  {copied ? "已复制" : "复制给客户"}
                </Button>
              </div>
              {state.deliveryMessage ? (
                <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3 text-sm leading-6 text-[var(--ink)]">
                  {state.deliveryMessage}
                </pre>
              ) : null}
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
