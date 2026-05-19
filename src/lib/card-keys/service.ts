import { CardKeyStatus, GoodsFileStatus, GoodsStatus, GoodsType } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
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

export type CardKeyListFilters = {
  query?: string;
  status?: CardKeyStatus;
};

function quoteSqlIdentifier(identifier: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error("Unsafe database identifier.");
  }
  return `"${identifier}"`;
}

function getDatabaseSchemaName() {
  return new URL(env.DATABASE_URL).searchParams.get("schema") || "public";
}

function qualifiedDatabaseName(name: string) {
  return `${quoteSqlIdentifier(getDatabaseSchemaName())}.${quoteSqlIdentifier(name)}`;
}

function buildCardKeyWhere(input?: CardKeyListFilters): Prisma.CardKeyWhereInput {
  const query = input?.query?.trim();
  const where: Prisma.CardKeyWhereInput = {};

  if (input?.status) {
    where.status = input.status;
  }

  if (query) {
    where.OR = [
      { goods: { name: { contains: query, mode: "insensitive" } } },
      { keyMask: { endsWith: query, mode: "insensitive" } },
    ];
  }

  return where;
}

export async function generateCardKey(input: GenerateCardKeyInput): Promise<{
  plaintextKey: string;
  keyMask: string;
  cardKeyId: string;
  createdAt: Date;
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
      return { plaintextKey, keyMask, cardKeyId: card.id, createdAt: card.createdAt, expiresAt };
    }

    const quantity = input.fileQuantity ?? 0;
    if (quantity < 1) {
      throw new NotEnoughInventoryError();
    }

    const goodsFileTable = qualifiedDatabaseName("GoodsFile");
    const goodsFileStatusType = qualifiedDatabaseName("GoodsFileStatus");
    const availableFiles = await tx.$queryRawUnsafe<Array<{ id: string }>>(
      `
        SELECT id
        FROM ${goodsFileTable}
        WHERE "goodsId" = $1
          AND status = $2::${goodsFileStatusType}
        ORDER BY "createdAt" ASC
        LIMIT $3
        FOR UPDATE SKIP LOCKED
      `,
      goods.id,
      GoodsFileStatus.AVAILABLE,
      quantity,
    );

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

    const reserved = await tx.goodsFile.updateMany({
      where: {
        id: { in: availableFiles.map((file) => file.id) },
        status: GoodsFileStatus.AVAILABLE,
      },
      data: {
        status: GoodsFileStatus.RESERVED,
        reservedByCardKeyId: card.id,
        reservedAt: new Date(),
      },
    });

    if (reserved.count !== quantity) {
      throw new NotEnoughInventoryError();
    }

    return { plaintextKey, keyMask, cardKeyId: card.id, createdAt: card.createdAt, expiresAt };
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

export async function countCardKeys(input?: CardKeyListFilters) {
  return prisma.cardKey.count({ where: buildCardKeyWhere(input) });
}

export async function listCardKeys(input?: CardKeyListFilters & { skip?: number; take?: number }) {
  return prisma.cardKey.findMany({
    where: buildCardKeyWhere(input),
    include: { goods: { select: { name: true, type: true } } },
    orderBy: { createdAt: "desc" },
    skip: input?.skip,
    take: input?.take,
  });
}
