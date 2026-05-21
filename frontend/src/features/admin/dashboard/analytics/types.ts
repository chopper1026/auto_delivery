import type { DeliveryTrendBucket, InventoryCounts } from "@/lib/admin/overviewCharts";

export type CardKeyStatusSummary = {
  active: number;
  redeemed: number;
  expired: number;
  total: number;
  activePercent: number;
  redeemedPercent: number;
  expiredPercent: number;
};

export type WorkbenchAnalyticsProps = {
  fileInventory: InventoryCounts[];
  deliveryTrend: DeliveryTrendBucket[];
  cardKeyStatus: CardKeyStatusSummary;
};

export type AnalyticsPanel = "inventory" | "trend" | "status";
export type InventoryChartMode = "stacked" | "percent";
export type TrendChartMode = "line" | "area";

export type SegmentOption<T extends string> = {
  value: T;
  label: string;
};
