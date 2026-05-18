import { GoodsFileStatus, GoodsStatus, GoodsType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";

export async function createTextGoods(input: { name: string; textContent: string }) {
  const name = input.name.trim();
  const textContent = input.textContent.trim();
  if (!name) throw new Error("Goods name is required.");
  if (!textContent) throw new Error("Text content is required.");

  return prisma.goods.create({
    data: {
      name,
      type: GoodsType.TEXT,
      textContent,
    },
  });
}

export async function createFileGoods(input: { name: string }) {
  const name = input.name.trim();
  if (!name) throw new Error("Goods name is required.");

  return prisma.goods.create({
    data: {
      name,
      type: GoodsType.FILE,
    },
  });
}

export async function registerGoodsFiles(
  goodsId: string,
  files: Array<{
    originalName: string;
    storedName: string;
    storagePath: string;
    sizeBytes: number;
    mimeType: string;
    sha256: string;
  }>,
): Promise<{ acceptedCount: number }> {
  const goods = await prisma.goods.findUnique({ where: { id: goodsId } });
  if (!goods || goods.type !== GoodsType.FILE) {
    throw new Error("File goods not found.");
  }

  await prisma.goodsFile.createMany({
    data: files.map((file) => ({
      goodsId,
      originalName: file.originalName,
      storedName: file.storedName,
      storagePath: file.storagePath,
      sizeBytes: file.sizeBytes,
      mimeType: file.mimeType,
      sha256: file.sha256,
      status: GoodsFileStatus.AVAILABLE,
    })),
  });

  return { acceptedCount: files.length };
}

export async function listGoodsWithInventory() {
  const goods = await prisma.goods.findMany({
    orderBy: { createdAt: "desc" },
    include: { files: { select: { status: true } } },
  });

  return goods.map((item) => {
    const counts = {
      total: item.files.length,
      available: 0,
      reserved: 0,
      redeemed: 0,
    };

    for (const file of item.files) {
      if (file.status === GoodsFileStatus.AVAILABLE) counts.available += 1;
      if (file.status === GoodsFileStatus.RESERVED) counts.reserved += 1;
      if (file.status === GoodsFileStatus.REDEEMED) counts.redeemed += 1;
    }

    return {
      ...item,
      files: undefined,
      inventory: counts,
    };
  });
}

export async function disableGoods(goodsId: string): Promise<void> {
  await prisma.goods.update({
    where: { id: goodsId },
    data: { status: GoodsStatus.DISABLED },
  });
}
