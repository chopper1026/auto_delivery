import { useQuery } from "@tanstack/react-query";
import { Archive, ChevronDown, FileText, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { adminApi } from "@/api/admin";
import { queryKeys } from "@/api/queryKeys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  buildGoodsOptions,
  filterGoodsForCardKey,
  isCardKeyGoodsSelectable,
  type CardKeyGoodsFilter,
  type CardKeyGoodsPickerItem,
  type FilteredCardKeyGoods,
} from "@/lib/admin/goodsPicker";
import { cn } from "@/lib/utils";

const pickerWidth = 560;
const pickerEstimatedHeight = 440;
const goodsFilters: Array<{ value: CardKeyGoodsFilter; label: string }> = [
  { value: "ALL", label: "全部" },
  { value: "TEXT", label: "文本" },
  { value: "FILE", label: "文件" },
  { value: "GENERATABLE", label: "可生成" },
];

function formatGoodsMeta(goods: CardKeyGoodsPickerItem) {
  if (goods.type === "TEXT") return "文本货物，不占用文件库存";
  return `可用 ${goods.inventory.available} / 预占 ${goods.inventory.reserved} / 已兑 ${goods.inventory.redeemed}`;
}

function GoodsIcon({ type }: { type: CardKeyGoodsPickerItem["type"] }) {
  return type === "TEXT" ? <FileText className="h-4 w-4" aria-hidden="true" /> : <Archive className="h-4 w-4" aria-hidden="true" />;
}

export function CardKeyGoodsPicker({
  goods,
  selectedGoodsId,
  onSelectGoodsId,
  onSelectGoods,
}: {
  goods: CardKeyGoodsPickerItem[];
  selectedGoodsId: string;
  onSelectGoodsId: (goodsId: string) => void;
  onSelectGoods?: (goods: CardKeyGoodsPickerItem) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [goodsQuery, setGoodsQuery] = useState("");
  const [goodsFilter, setGoodsFilter] = useState<CardKeyGoodsFilter>("ALL");
  const [pickerPosition, setPickerPosition] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);
  const pickerTriggerRef = useRef<HTMLDivElement>(null);
  const pickerPanelRef = useRef<HTMLDivElement>(null);
  const remoteGoods = useQuery({
    queryKey: queryKeys.cardGoodsOptions(goodsQuery.trim()),
    queryFn: () => adminApi.cardGoodsOptions({ q: goodsQuery.trim(), limit: 200 }),
    enabled: pickerOpen,
    staleTime: 30_000,
  });
  const pickerGoods = useMemo(() => (remoteGoods.data ? buildGoodsOptions(remoteGoods.data.items) : goods), [goods, remoteGoods.data]);
  const selected = useMemo(
    () => pickerGoods.find((item) => item.id === selectedGoodsId) ?? goods.find((item) => item.id === selectedGoodsId) ?? goods.find(isCardKeyGoodsSelectable) ?? goods[0],
    [goods, pickerGoods, selectedGoodsId],
  );
  const filteredGoods = useMemo(() => filterGoodsForCardKey(pickerGoods, { query: goodsQuery, filter: goodsFilter }), [pickerGoods, goodsFilter, goodsQuery]);

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
    onSelectGoodsId(item.id);
    onSelectGoods?.(item);
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

  return (
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
                      className="admin-filter-search-input"
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
    </div>
  );
}
