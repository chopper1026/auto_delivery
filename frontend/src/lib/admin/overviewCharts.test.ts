import { describe, expect, it } from "vitest";
import {
  buildAnalyticsTotals,
  buildCardKeyStatusDistribution,
  buildDeliveryTrendBuckets,
  buildInventoryCompositionRows,
  buildInventoryWarnings,
  buildLineChartPoints,
} from "./overviewCharts";

describe("admin overview chart helpers", () => {
  it("builds stacked inventory percentages and handles empty totals", () => {
    expect(
      buildInventoryCompositionRows([
        { goodsId: "a", goodsName: "CPA 文件", total: 10, available: 6, reserved: 1, redeemed: 3 },
        { goodsId: "empty", goodsName: "空库存", total: 0, available: 0, reserved: 0, redeemed: 0 },
      ]),
    ).toEqual([
      {
        goodsId: "a",
        goodsName: "CPA 文件",
        total: 10,
        available: 6,
        reserved: 1,
        redeemed: 3,
        availablePercent: 60,
        reservedPercent: 10,
        redeemedPercent: 30,
        availableRatio: 0.6,
        reservedRatio: 0.1,
        redeemedRatio: 0.3,
      },
      {
        goodsId: "empty",
        goodsName: "空库存",
        total: 0,
        available: 0,
        reserved: 0,
        redeemed: 0,
        availablePercent: 0,
        reservedPercent: 0,
        redeemedPercent: 0,
        availableRatio: 0,
        reservedRatio: 0,
        redeemedRatio: 0,
      },
    ]);
  });

  it("ranks low available and high reserved goods in inventory warnings", () => {
    expect(
      buildInventoryWarnings([
        { goodsId: "stable", goodsName: "稳定库存", total: 100, available: 80, reserved: 5, redeemed: 15 },
        { goodsId: "low", goodsName: "账号池", total: 100, available: 12, reserved: 8, redeemed: 80 },
        { goodsId: "reserved", goodsName: "Proxy 包", total: 100, available: 50, reserved: 35, redeemed: 15 },
      ]),
    ).toEqual([
      {
        goodsId: "low",
        goodsName: "账号池",
        label: "可用库存偏低",
        ratioLabel: "12%",
        severity: "high",
        percent: 12,
      },
      {
        goodsId: "reserved",
        goodsName: "Proxy 包",
        label: "预占比例偏高",
        ratioLabel: "35%",
        severity: "medium",
        percent: 35,
      },
      {
        goodsId: "stable",
        goodsName: "稳定库存",
        label: "库存状态稳定",
        ratioLabel: "80%",
        severity: "normal",
        percent: 80,
      },
    ]);
  });

  it("builds seven date buckets including zero-count days", () => {
    const buckets = buildDeliveryTrendBuckets({
      now: new Date("2026-05-19T12:00:00.000Z"),
      redemptions: [new Date("2026-05-18T09:00:00.000Z"), new Date("2026-05-19T10:00:00.000Z")],
      downloads: [new Date("2026-05-19T11:00:00.000Z")],
    });

    expect(buckets).toEqual([
      { dateKey: "2026-05-13", label: "05-13", redemptions: 0, downloads: 0 },
      { dateKey: "2026-05-14", label: "05-14", redemptions: 0, downloads: 0 },
      { dateKey: "2026-05-15", label: "05-15", redemptions: 0, downloads: 0 },
      { dateKey: "2026-05-16", label: "05-16", redemptions: 0, downloads: 0 },
      { dateKey: "2026-05-17", label: "05-17", redemptions: 0, downloads: 0 },
      { dateKey: "2026-05-18", label: "05-18", redemptions: 1, downloads: 0 },
      { dateKey: "2026-05-19", label: "05-19", redemptions: 1, downloads: 1 },
    ]);
  });

  it("maps chart values to bounded SVG points", () => {
    expect(buildLineChartPoints([0, 50, 100], { width: 100, height: 50, maxValue: 100 })).toBe("0,50 50,25 100,0");
    expect(buildLineChartPoints([0, 0], { width: 100, height: 50, maxValue: 0 })).toBe("0,50 100,50");
  });

  it("builds card-key status distribution percentages", () => {
    expect(buildCardKeyStatusDistribution({ active: 8, redeemed: 1, expired: 1 })).toEqual({
      active: 8,
      redeemed: 1,
      expired: 1,
      total: 10,
      activePercent: 80,
      redeemedPercent: 10,
      expiredPercent: 10,
    });
  });

  it("builds aggregate totals for analytics section headers", () => {
    expect(
      buildAnalyticsTotals({
        fileInventory: [
          { goodsId: "a", goodsName: "CPA 文件", total: 10, available: 6, reserved: 1, redeemed: 3 },
          { goodsId: "b", goodsName: "Proxy 包", total: 5, available: 2, reserved: 1, redeemed: 2 },
        ],
        deliveryTrend: [
          { dateKey: "2026-05-18", label: "05-18", redemptions: 1, downloads: 0 },
          { dateKey: "2026-05-19", label: "05-19", redemptions: 2, downloads: 1 },
        ],
      }),
    ).toEqual({ inventoryTotal: 15, trendRedemptions: 3, trendDownloads: 1 });
  });
});
