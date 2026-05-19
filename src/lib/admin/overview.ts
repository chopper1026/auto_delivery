import { CardKeyStatus, DownloadResult, GoodsFileStatus, GoodsType } from "@/generated/prisma/enums";
import { buildCardKeyStatusDistribution, buildDeliveryTrendBuckets } from "@/lib/admin/overview-charts";
import { prisma } from "@/lib/db";

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export async function getOverviewStats(): Promise<{
  totalCardKeys: number;
  activeCardKeys: number;
  redeemedCardKeys: number;
  expiredCardKeys: number;
  todaysRedemptions: number;
  todaysDownloads: number;
  fileInventory: Array<{
    goodsId: string;
    goodsName: string;
    total: number;
    available: number;
    reserved: number;
    redeemed: number;
  }>;
  cardKeyStatus: ReturnType<typeof buildCardKeyStatusDistribution>;
  deliveryTrend: ReturnType<typeof buildDeliveryTrendBuckets>;
}> {
  const today = startOfToday();
  const now = new Date();
  const trendStart = new Date(today);
  trendStart.setDate(today.getDate() - 6);

  const [
    totalCardKeys,
    activeCardKeys,
    redeemedCardKeys,
    expiredCardKeys,
    todaysRedemptions,
    todaysDownloads,
    fileGoods,
    recentRedemptions,
    recentDownloads,
  ] = await Promise.all([
    prisma.cardKey.count(),
    prisma.cardKey.count({ where: { status: CardKeyStatus.ACTIVE } }),
    prisma.cardKey.count({ where: { status: CardKeyStatus.REDEEMED } }),
    prisma.cardKey.count({
      where: {
        OR: [{ status: CardKeyStatus.EXPIRED }, { status: CardKeyStatus.ACTIVE, expiresAt: { lt: now } }],
      },
    }),
    prisma.redemption.count({ where: { redeemedAt: { gte: today } } }),
    prisma.downloadLog.count({ where: { createdAt: { gte: today }, result: DownloadResult.SUCCESS } }),
    prisma.goods.findMany({
      where: { type: GoodsType.FILE },
      include: { files: { select: { status: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.redemption.findMany({
      where: { redeemedAt: { gte: trendStart } },
      select: { redeemedAt: true },
    }),
    prisma.downloadLog.findMany({
      where: { createdAt: { gte: trendStart }, result: DownloadResult.SUCCESS },
      select: { createdAt: true },
    }),
  ]);

  return {
    totalCardKeys,
    activeCardKeys,
    redeemedCardKeys,
    expiredCardKeys,
    todaysRedemptions,
    todaysDownloads,
    fileInventory: fileGoods.map((goods) => ({
      goodsId: goods.id,
      goodsName: goods.name,
      total: goods.files.length,
      available: goods.files.filter((file) => file.status === GoodsFileStatus.AVAILABLE).length,
      reserved: goods.files.filter((file) => file.status === GoodsFileStatus.RESERVED).length,
      redeemed: goods.files.filter((file) => file.status === GoodsFileStatus.REDEEMED).length,
    })),
    cardKeyStatus: buildCardKeyStatusDistribution({
      active: activeCardKeys,
      redeemed: redeemedCardKeys,
      expired: expiredCardKeys,
    }),
    deliveryTrend: buildDeliveryTrendBuckets({
      now,
      redemptions: recentRedemptions.map((item) => item.redeemedAt),
      downloads: recentDownloads.map((item) => item.createdAt),
    }),
  };
}
