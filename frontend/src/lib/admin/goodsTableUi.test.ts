import { describe, expect, it } from "vitest";
import { buildGoodsDetailSections, GOODS_TABLE_COLUMN_WIDTHS } from "./goodsTableUi";

describe("goods table UI model", () => {
  it("keeps the goods column narrower than the actions column", () => {
    expect(GOODS_TABLE_COLUMN_WIDTHS.goods).toBeLessThan(GOODS_TABLE_COLUMN_WIDTHS.actions);
    expect(GOODS_TABLE_COLUMN_WIDTHS.actions).toBeGreaterThanOrEqual(34);
  });

  it("puts file goods notes in the details model", () => {
    expect(
      buildGoodsDetailSections({
        type: "FILE",
        note: "下载后先解压。",
        textContent: null,
      }),
    ).toEqual([{ label: "备注", content: "下载后先解压。", empty: false }]);
  });

  it("puts text goods content in the details model", () => {
    expect(
      buildGoodsDetailSections({
        type: "TEXT",
        note: null,
        textContent: "账号：demo\n密码：123456",
      }),
    ).toEqual([{ label: "文本内容", content: "账号：demo\n密码：123456", empty: false }]);
  });

  it("keeps notes available in text goods details when present", () => {
    expect(
      buildGoodsDetailSections({
        type: "TEXT",
        note: "给客户前先核对有效期。",
        textContent: "激活码：A-001",
      }),
    ).toEqual([
      { label: "备注", content: "给客户前先核对有效期。", empty: false },
      { label: "文本内容", content: "激活码：A-001", empty: false },
    ]);
  });

  it("falls back to an empty note section for file goods without notes", () => {
    expect(
      buildGoodsDetailSections({
        type: "FILE",
        note: "   ",
        textContent: null,
      }),
    ).toEqual([{ label: "备注", content: "暂无备注", empty: true }]);
  });
});
