import type { GoodsStatus, GoodsType, Inventory } from "../../types";

export type CardKeyGoodsFilter = "ALL" | "TEXT" | "FILE" | "GENERATABLE";

export type CardKeyGoodsPickerItem = {
  id: string;
  name: string;
  note: string | null;
  type: GoodsType;
  inventory: Inventory;
};

type CardKeyGoodsSource = {
  id: string;
  name: string;
  note?: string | null;
  type: GoodsType;
  status: GoodsStatus;
  inventory: Inventory;
};

export type FilteredCardKeyGoods = CardKeyGoodsPickerItem & {
  selectable: boolean;
};

export function isCardKeyGoodsSelectable(goods: CardKeyGoodsPickerItem): boolean {
  return goods.type === "TEXT" || goods.inventory.available > 0;
}

export function buildGoodsOptions(goods: CardKeyGoodsSource[]): CardKeyGoodsPickerItem[] {
  return goods
    .filter((item) => item.status === "ACTIVE")
    .filter((item) => item.type === "TEXT" || item.inventory.available > 0)
    .map((item) => ({
      id: item.id,
      name: item.name,
      note: item.note ?? null,
      type: item.type,
      inventory: item.inventory,
    }));
}

function matchesSearch(goods: CardKeyGoodsPickerItem, query: string): boolean {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return true;

  return `${goods.name} ${goods.note ?? ""}`.toLocaleLowerCase().includes(normalizedQuery);
}

function matchesFilter(goods: CardKeyGoodsPickerItem, filter: CardKeyGoodsFilter): boolean {
  if (filter === "TEXT") return goods.type === "TEXT";
  if (filter === "FILE") return goods.type === "FILE";
  if (filter === "GENERATABLE") return isCardKeyGoodsSelectable(goods);
  return true;
}

export function filterGoodsForCardKey(goods: CardKeyGoodsPickerItem[], input: { query: string; filter: CardKeyGoodsFilter }): FilteredCardKeyGoods[] {
  return goods
    .filter((item) => matchesSearch(item, input.query) && matchesFilter(item, input.filter))
    .map((item) => ({ ...item, selectable: isCardKeyGoodsSelectable(item) }))
    .sort((a, b) => Number(b.selectable) - Number(a.selectable));
}

export function getInitialCardKeyGoodsId(goods: CardKeyGoodsPickerItem[]): string {
  return goods.find(isCardKeyGoodsSelectable)?.id ?? goods[0]?.id ?? "";
}
