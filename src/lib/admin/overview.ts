import { CardKeyStatus, DownloadResult, GoodsFileStatus, GoodsType } from "@/generated/prisma/enums";
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
}> {
  const today = startOfToday();
  const now = new Date();
  const [totalCardKeys, activeCardKeys, redeemedCardKeys, expiredCardKeys, todaysRedemptions, todaysDownloads, fileGoods] =
    await Promise.all([
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
  };
}
