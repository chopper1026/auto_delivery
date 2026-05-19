import crypto from "node:crypto";
import path from "node:path";
import { CardKeyStatus, DownloadResult, GoodsFileStatus, GoodsStatus, GoodsType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { hashLookupSecret, maskSecret } from "@/lib/security/hash";
import { sanitizeZipEntryName } from "@/lib/storage/files";
import { zipRoot } from "@/lib/storage/paths";
import { createZipFromFiles } from "@/lib/storage/zip";

export class CardKeyNotRedeemableError extends Error {
  constructor() {
    super("Card key is not redeemable.");
    this.name = "CardKeyNotRedeemableError";
  }
}

function createToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export async function redeemCardKey(input: {
  plaintextKey: string;
  ipAddress: string;
  userAgent: string;
}): Promise<{ receiptToken: string; goodsType: "TEXT" | "FILE" }> {
  const keyHash = hashLookupSecret(input.plaintextKey.trim().toUpperCase());
  const receiptToken = createToken();
  const receiptTokenHash = hashLookupSecret(receiptToken);

  return prisma.$transaction(async (tx) => {
    const card = await tx.cardKey.findUnique({
      where: { keyHash },
      include: { goods: true },
    });

    if (
      !card ||
      card.status !== CardKeyStatus.ACTIVE ||
      card.goods.status !== GoodsStatus.ACTIVE ||
      (card.expiresAt && card.expiresAt <= new Date())
    ) {
      if (card?.expiresAt && card.expiresAt <= new Date() && card.status === CardKeyStatus.ACTIVE) {
        await tx.cardKey.update({ where: { id: card.id }, data: { status: CardKeyStatus.EXPIRED } });
      }
      throw new CardKeyNotRedeemableError();
    }

    if (card.goodsType === GoodsType.TEXT) {
      await tx.redemption.create({
        data: {
          cardKeyId: card.id,
          goodsId: card.goodsId,
          receiptTokenHash,
          receiptTokenMask: maskSecret(receiptToken),
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        },
      });

      await tx.cardKey.update({
        where: { id: card.id },
        data: { status: CardKeyStatus.REDEEMED, redeemedAt: new Date() },
      });

      return { receiptToken, goodsType: "TEXT" as const };
    }

    const reservedFiles = await tx.goodsFile.findMany({
      where: {
        reservedByCardKeyId: card.id,
        status: GoodsFileStatus.RESERVED,
      },
      orderBy: { createdAt: "asc" },
    });

    if (reservedFiles.length !== card.fileQuantity) {
      throw new CardKeyNotRedeemableError();
    }

    const redemption = await tx.redemption.create({
      data: {
        cardKeyId: card.id,
        goodsId: card.goodsId,
        receiptTokenHash,
        receiptTokenMask: maskSecret(receiptToken),
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });

    const zipPath = path.join(zipRoot, `${redemption.id}.zip`);
    const zip = await createZipFromFiles(
      reservedFiles.map((file) => ({
        path: file.storagePath,
        entryName: sanitizeZipEntryName(file.originalName),
      })),
      zipPath,
    );

    await tx.redemptionFile.createMany({
      data: reservedFiles.map((file) => ({
        redemptionId: redemption.id,
        goodsFileId: file.id,
        originalName: file.originalName,
      })),
    });

    await tx.goodsFile.updateMany({
      where: { id: { in: reservedFiles.map((file) => file.id) } },
      data: {
        status: GoodsFileStatus.REDEEMED,
        redeemedByRedemptionId: redemption.id,
        redeemedAt: new Date(),
      },
    });

    await tx.cardKey.update({
      where: { id: card.id },
      data: { status: CardKeyStatus.REDEEMED, redeemedAt: new Date() },
    });

    await tx.redemption.update({
      where: { id: redemption.id },
      data: { zipPath, zipSizeBytes: zip.sizeBytes },
    });

    return { receiptToken, goodsType: "FILE" as const };
  });
}

export async function getReceiptByToken(token: string): Promise<
  | { kind: "TEXT"; goodsName: string; textContent: string; redeemedAt: Date }
  | { kind: "FILE"; goodsName: string; goodsNote: string | null; redeemedAt: Date; downloaded: boolean; fileQuantity: number }
  | null
> {
  const redemption = await prisma.redemption.findUnique({
    where: { receiptTokenHash: hashLookupSecret(token) },
    include: { goods: true, cardKey: { select: { fileQuantity: true } } },
  });

  if (!redemption) return null;

  if (redemption.goods.type === GoodsType.TEXT) {
    return {
      kind: "TEXT",
      goodsName: redemption.goods.name,
      textContent: redemption.goods.textContent ?? "",
      redeemedAt: redemption.redeemedAt,
    };
  }

  return {
    kind: "FILE",
    goodsName: redemption.goods.name,
    goodsNote: redemption.goods.note,
    redeemedAt: redemption.redeemedAt,
    downloaded: redemption.downloadCount > 0,
    fileQuantity: redemption.cardKey.fileQuantity,
  };
}

export async function consumeDownload(input: {
  receiptToken: string;
  ipAddress: string;
  userAgent: string;
}): Promise<
  | { result: "SUCCESS"; zipPath: string; filename: string }
  | { result: "ALREADY_DOWNLOADED" | "NOT_FOUND" | "ERROR" }
> {
  const receiptTokenHash = hashLookupSecret(input.receiptToken);
  const redemption = await prisma.redemption.findUnique({
    where: { receiptTokenHash },
    include: { goods: { select: { name: true } } },
  });

  if (!redemption) {
    await prisma.downloadLog.create({
      data: {
        receiptTokenHash,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        result: DownloadResult.NOT_FOUND,
      },
    });
    return { result: "NOT_FOUND" };
  }

  if (!redemption.zipPath) {
    await prisma.downloadLog.create({
      data: {
        redemptionId: redemption.id,
        receiptTokenHash,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        result: DownloadResult.ERROR,
      },
    });
    return { result: "ERROR" };
  }

  const updated = await prisma.redemption.updateMany({
    where: { id: redemption.id, downloadCount: 0 },
    data: {
      downloadCount: { increment: 1 },
      firstDownloadedAt: new Date(),
    },
  });

  if (updated.count === 0) {
    await prisma.downloadLog.create({
      data: {
        redemptionId: redemption.id,
        receiptTokenHash,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        result: DownloadResult.ALREADY_DOWNLOADED,
      },
    });
    return { result: "ALREADY_DOWNLOADED" };
  }

  await prisma.downloadLog.create({
    data: {
      redemptionId: redemption.id,
      receiptTokenHash,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      result: DownloadResult.SUCCESS,
    },
  });

  return {
    result: "SUCCESS",
    zipPath: redemption.zipPath,
    filename: `${sanitizeZipEntryName(redemption.goods.name)}.zip`,
  };
}
