import { CardKeyStatus, GoodsFileStatus, GoodsStatus, GoodsType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { generatePlaintextCardKey } from "@/lib/card-keys/generator";
import { hashLookupSecret, maskSecret } from "@/lib/security/hash";
import { calculateExpiresAt, type ExpirationOption } from "@/lib/time";

export class NotEnoughInventoryError extends Error {
  constructor() {
    super("Not enough available file inventory.");
    this.name = "NotEnoughInventoryError";
  }
}

export class CannotDeleteRedeemedCardKeyError extends Error {
  constructor() {
    super("Cannot delete a redeemed card key.");
    this.name = "CannotDeleteRedeemedCardKeyError";
  }
}

export type GenerateCardKeyInput = {
  goodsId: string;
  expiration: ExpirationOption;
  fileQuantity?: number;
};

export async function generateCardKey(input: GenerateCardKeyInput): Promise<{
  plaintextKey: string;
  keyMask: string;
  cardKeyId: string;
  expiresAt: Date | null;
}> {
  const plaintextKey = generatePlaintextCardKey();
  const keyMask = maskSecret(plaintextKey);
  const expiresAt = calculateExpiresAt(input.expiration);

  return prisma.$transaction(async (tx) => {
    const goods = await tx.goods.findUniqueOrThrow({ where: { id: input.goodsId } });
    if (goods.status !== GoodsStatus.ACTIVE) {
      throw new Error("Goods is disabled.");
    }

    if (goods.type === GoodsType.TEXT) {
      const card = await tx.cardKey.create({
        data: {
          keyHash: hashLookupSecret(plaintextKey),
          keyMask,
          goodsId: goods.id,
          goodsType: goods.type,
          fileQuantity: 0,
          expiresAt,
        },
      });
      return { plaintextKey, keyMask, cardKeyId: card.id, expiresAt };
    }

    const quantity = input.fileQuantity ?? 0;
    if (quantity < 1) {
      throw new NotEnoughInventoryError();
    }

    const availableFiles = await tx.goodsFile.findMany({
      where: { goodsId: goods.id, status: GoodsFileStatus.AVAILABLE },
      orderBy: { createdAt: "asc" },
      take: quantity,
      select: { id: true },
    });

    if (availableFiles.length < quantity) {
      throw new NotEnoughInventoryError();
    }

    const card = await tx.cardKey.create({
      data: {
        keyHash: hashLookupSecret(plaintextKey),
        keyMask,
        goodsId: goods.id,
        goodsType: goods.type,
        fileQuantity: quantity,
        expiresAt,
      },
    });

    await tx.goodsFile.updateMany({
      where: { id: { in: availableFiles.map((file) => file.id) } },
      data: {
        status: GoodsFileStatus.RESERVED,
        reservedByCardKeyId: card.id,
        reservedAt: new Date(),
      },
    });

    return { plaintextKey, keyMask, cardKeyId: card.id, expiresAt };
  });
}

export async function deleteUnredeemedCardKey(cardKeyId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const card = await tx.cardKey.findUniqueOrThrow({ where: { id: cardKeyId } });
    if (card.status === CardKeyStatus.REDEEMED) {
      throw new CannotDeleteRedeemedCardKeyError();
    }

    await tx.goodsFile.updateMany({
      where: {
        reservedByCardKeyId: card.id,
        status: GoodsFileStatus.RESERVED,
      },
      data: {
        status: GoodsFileStatus.AVAILABLE,
        reservedByCardKeyId: null,
        reservedAt: null,
      },
    });

    await tx.cardKey.update({
      where: { id: card.id },
      data: { status: CardKeyStatus.DELETED, deletedAt: new Date() },
    });
  });
}

export async function countCardKeys() {
  return prisma.cardKey.count();
}

export async function listCardKeys(input?: { skip?: number; take?: number }) {
  return prisma.cardKey.findMany({
    include: { goods: { select: { name: true, type: true } } },
    orderBy: { createdAt: "desc" },
    skip: input?.skip,
    take: input?.take,
  });
}
