import { describe, expect, it } from "vitest";
import {
  filterGoodsForCardKey,
  getInitialCardKeyGoodsId,
  type CardKeyGoodsFilter,
  type CardKeyGoodsPickerItem,
} from "@/lib/admin/goods-picker";

const goods: CardKeyGoodsPickerItem[] = [
  {
    id: "file-empty",
    name: "CPA 空库存",
    note: "暂时没有可用文件",
    type: "FILE",
    inventory: { total: 8, available: 0, reserved: 3, redeemed: 5 },
  },
  {
    id: "text-guide",
    name: "教程文本",
    note: "新人交付说明",
    type: "TEXT",
    inventory: { total: 0, available: 0, reserved: 0, redeemed: 0 },
  },
  {
    id: "file-ready",
    name: "CPA 文件包",
    note: "三天有效",
    type: "FILE",
    inventory: { total: 12, available: 7, reserved: 2, redeemed: 3 },
  },
];

describe("goods picker", () => {
  it("searches goods by name and note while keeping unselectable file goods visible last", () => {
    const result = filterGoodsForCardKey(goods, { query: "cpa", filter: "ALL" });

    expect(result.map((item) => item.id)).toEqual(["file-ready", "file-empty"]);
    expect(result.map((item) => item.selectable)).toEqual([true, false]);
  });

  it.each<[CardKeyGoodsFilter, string[]]>([
    ["TEXT", ["text-guide"]],
    ["FILE", ["file-ready", "file-empty"]],
    ["GENERATABLE", ["text-guide", "file-ready"]],
  ])("filters goods with %s mode", (filter, expectedIds) => {
    const result = filterGoodsForCardKey(goods, { query: "", filter });

    expect(result.map((item) => item.id)).toEqual(expectedIds);
  });

  it("uses the first selectable goods as the initial selection", () => {
    expect(getInitialCardKeyGoodsId(goods)).toBe("text-guide");
  });
});
