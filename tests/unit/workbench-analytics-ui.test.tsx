import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WorkbenchAnalytics } from "@/components/admin/workbench-analytics";

describe("workbench analytics UI", () => {
  it("renders chart switchers as real buttons with selected state", () => {
    const markup = renderToStaticMarkup(
      <WorkbenchAnalytics
        fileInventory={[{ goodsId: "goods-a", goodsName: "CPA 文件", total: 3, available: 2, reserved: 0, redeemed: 1 }]}
        deliveryTrend={[
          { dateKey: "2026-05-13", label: "05-13", redemptions: 0, downloads: 0 },
          { dateKey: "2026-05-14", label: "05-14", redemptions: 0, downloads: 0 },
          { dateKey: "2026-05-15", label: "05-15", redemptions: 0, downloads: 0 },
          { dateKey: "2026-05-16", label: "05-16", redemptions: 0, downloads: 0 },
          { dateKey: "2026-05-17", label: "05-17", redemptions: 0, downloads: 0 },
          { dateKey: "2026-05-18", label: "05-18", redemptions: 1, downloads: 0 },
          { dateKey: "2026-05-19", label: "05-19", redemptions: 2, downloads: 1 },
        ]}
        cardKeyStatus={{ active: 6, redeemed: 3, expired: 1, total: 10, activePercent: 60, redeemedPercent: 30, expiredPercent: 10 }}
      />,
    );

    expect(markup.match(/type="button"/g)).toHaveLength(7);
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('aria-pressed="false"');
    expect(markup).toContain(">库存构成</button>");
    expect(markup).toContain(">百分比</button>");
    expect(markup).toContain(">面积图</button>");
  });
});
