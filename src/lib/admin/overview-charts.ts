export type InventoryCounts = {
  goodsId: string;
  goodsName: string;
  total: number;
  available: number;
  reserved: number;
  redeemed: number;
};

function toRatio(value: number, total: number) {
  if (total <= 0) return 0;
  return value / total;
}

function toPercent(value: number, total: number) {
  return Math.round(toRatio(value, total) * 100);
}

export function buildInventoryCompositionRows(items: InventoryCounts[]) {
  return items.map((item) => ({
    ...item,
    availablePercent: toPercent(item.available, item.total),
    reservedPercent: toPercent(item.reserved, item.total),
    redeemedPercent: toPercent(item.redeemed, item.total),
    availableRatio: toRatio(item.available, item.total),
    reservedRatio: toRatio(item.reserved, item.total),
    redeemedRatio: toRatio(item.redeemed, item.total),
  }));
}

export function buildInventoryWarnings(items: InventoryCounts[]) {
  return buildInventoryCompositionRows(items)
    .map((item) => {
      if (item.total <= 0 || item.availableRatio < 0.2) {
        return {
          goodsId: item.goodsId,
          goodsName: item.goodsName,
          label: "可用库存偏低",
          ratioLabel: `${item.availablePercent}%`,
          severity: "high" as const,
          percent: item.availablePercent,
          score: 300 - item.availablePercent,
        };
      }

      if (item.reservedRatio >= 0.3) {
        return {
          goodsId: item.goodsId,
          goodsName: item.goodsName,
          label: "预占比例偏高",
          ratioLabel: `${item.reservedPercent}%`,
          severity: "medium" as const,
          percent: item.reservedPercent,
          score: 200 + item.reservedPercent,
        };
      }

      return {
        goodsId: item.goodsId,
        goodsName: item.goodsName,
        label: "库存状态稳定",
        ratioLabel: `${item.availablePercent}%`,
        severity: "normal" as const,
        percent: item.availablePercent,
        score: item.availablePercent,
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((item) => ({
      goodsId: item.goodsId,
      goodsName: item.goodsName,
      label: item.label,
      ratioLabel: item.ratioLabel,
      severity: item.severity,
      percent: item.percent,
    }));
}

export type DeliveryTrendBucket = {
  dateKey: string;
  label: string;
  redemptions: number;
  downloads: number;
};

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function dateLabel(key: string) {
  return key.slice(5);
}

export function buildDeliveryTrendBuckets(input: {
  now?: Date;
  redemptions: Date[];
  downloads: Date[];
}): DeliveryTrendBucket[] {
  const today = startOfUtcDay(input.now ?? new Date());
  const buckets: DeliveryTrendBucket[] = [];

  for (let index = 6; index >= 0; index -= 1) {
    const day = new Date(today);
    day.setUTCDate(today.getUTCDate() - index);
    const key = dateKey(day);
    buckets.push({ dateKey: key, label: dateLabel(key), redemptions: 0, downloads: 0 });
  }

  const byKey = new Map(buckets.map((bucket) => [bucket.dateKey, bucket]));
  for (const redeemedAt of input.redemptions) {
    const bucket = byKey.get(dateKey(startOfUtcDay(redeemedAt)));
    if (bucket) bucket.redemptions += 1;
  }
  for (const downloadedAt of input.downloads) {
    const bucket = byKey.get(dateKey(startOfUtcDay(downloadedAt)));
    if (bucket) bucket.downloads += 1;
  }

  return buckets;
}

export function buildLineChartPoints(
  values: number[],
  options: { width: number; height: number; maxValue: number },
) {
  if (values.length === 0) return "";
  const denominator = Math.max(options.maxValue, 1);
  const xStep = values.length > 1 ? options.width / (values.length - 1) : 0;

  return values
    .map((value, index) => {
      const x = Math.round(index * xStep);
      const y = Math.round(options.height - (value / denominator) * options.height);
      return `${x},${y}`;
    })
    .join(" ");
}

export function buildCardKeyStatusDistribution(input: { active: number; redeemed: number; expired: number }) {
  const total = input.active + input.redeemed + input.expired;
  return {
    ...input,
    total,
    activePercent: toPercent(input.active, total),
    redeemedPercent: toPercent(input.redeemed, total),
    expiredPercent: toPercent(input.expired, total),
  };
}

export function buildAnalyticsTotals(input: {
  fileInventory: InventoryCounts[];
  deliveryTrend: DeliveryTrendBucket[];
}) {
  return {
    inventoryTotal: input.fileInventory.reduce((sum, item) => sum + item.total, 0),
    trendRedemptions: input.deliveryTrend.reduce((sum, item) => sum + item.redemptions, 0),
    trendDownloads: input.deliveryTrend.reduce((sum, item) => sum + item.downloads, 0),
  };
}
