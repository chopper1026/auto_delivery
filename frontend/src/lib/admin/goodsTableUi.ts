export const GOODS_TABLE_COLUMN_WIDTHS = {
  goods: 24,
  type: 10,
  status: 10,
  inventory: 20,
  actions: 36,
} as const;

type GoodsDetailInput = {
  type: "TEXT" | "FILE";
  note: string | null;
  textContent: string | null;
};

export type GoodsDetailSection = {
  label: string;
  content: string;
  empty: boolean;
};

function normalizeDetailContent(value: string | null, emptyText: string): GoodsDetailSection["content"] {
  const trimmed = value?.trim();
  return trimmed || emptyText;
}

export function buildGoodsDetailSections(goods: GoodsDetailInput): GoodsDetailSection[] {
  const sections: GoodsDetailSection[] = [];
  const note = goods.note?.trim();

  if (note) {
    sections.push({
      label: "备注",
      content: note,
      empty: false,
    });
  }

  if (goods.type === "TEXT") {
    sections.push({
      label: "文本内容",
      content: normalizeDetailContent(goods.textContent, "暂无文本内容"),
      empty: !goods.textContent?.trim(),
    });
    return sections;
  }

  if (sections.length > 0) {
    return sections;
  }

  return [
    {
      label: "备注",
      content: normalizeDetailContent(goods.note, "暂无备注"),
      empty: !goods.note?.trim(),
    },
  ];
}
