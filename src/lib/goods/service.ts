import { GoodsFileStatus, GoodsStatus, GoodsType } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { sanitizeZipEntryName } from "@/lib/storage/files";

export type GoodsFileExportScope = "UNREDEEMED" | "REDEEMED";
export type GoodsListFilters = {
  query?: string;
  status?: GoodsStatus;
};

export type GoodsFileExportEntry = {
  originalName: string;
  storagePath: string;
  entryName: string;
  status: "AVAILABLE" | "RESERVED" | "REDEEMED";
  cardKeyMask: string | null;
  reservedAt: Date | null;
  redeemedAt: Date | null;
};

export class CannotDeleteGoodsInUseError extends Error {
  constructor() {
    super("Cannot delete goods that are referenced by card keys or redemptions.");
    this.name = "CannotDeleteGoodsInUseError";
  }
}

function escapeCsvValue(value: string | number | Date | null): string {
  if (value === null) return "";
  const text = value instanceof Date ? value.toISOString() : String(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}

function createManifestCsv(entries: GoodsFileExportEntry[]): string {
  const header = ["originalName", "status", "cardKeyMask", "reservedAt", "redeemedAt"];
  const rows = entries.map((entry) =>
    [entry.originalName, entry.status, entry.cardKeyMask, entry.reservedAt, entry.redeemedAt].map(escapeCsvValue).join(","),
  );
  return `${[header.join(","), ...rows].join("\n")}\n`;
}

function createUniqueEntryName(filename: string, seen: Map<string, number>): string {
  const sanitized = sanitizeZipEntryName(filename);
  const count = seen.get(sanitized) ?? 0;
  seen.set(sanitized, count + 1);
  if (count === 0) return sanitized;

  const dotIndex = sanitized.lastIndexOf(".");
  if (dotIndex <= 0) return `${sanitized}-${count + 1}`;
  return `${sanitized.slice(0, dotIndex)}-${count + 1}${sanitized.slice(dotIndex)}`;
}

function buildGoodsWhere(input?: GoodsListFilters): Prisma.GoodsWhereInput {
  const query = input?.query?.trim();
  const where: Prisma.GoodsWhereInput = {};

  if (input?.status) {
    where.status = input.status;
  }

  if (query) {
    where.name = { contains: query, mode: "insensitive" };
  }

  return where;
}

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

export async function createFileGoods(input: { name: string; note?: string }) {
  const name = input.name.trim();
  const note = input.note?.trim() || null;
  if (!name) throw new Error("Goods name is required.");

  return prisma.goods.create({
    data: {
      name,
      type: GoodsType.FILE,
      note,
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

export async function countGoods(input?: GoodsListFilters) {
  return prisma.goods.count({ where: buildGoodsWhere(input) });
}

export async function listGoodsWithInventory(input?: GoodsListFilters & { skip?: number; take?: number }) {
  const goods = await prisma.goods.findMany({
    where: buildGoodsWhere(input),
    orderBy: { createdAt: "desc" },
    skip: input?.skip,
    take: input?.take,
    include: {
      files: { select: { status: true } },
      _count: { select: { cardKeys: true, redemptions: true } },
    },
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
      _count: undefined,
      inventory: counts,
      usage: {
        cardKeys: item._count.cardKeys,
        redemptions: item._count.redemptions,
      },
    };
  });
}

export async function getGoodsFileExportPackage(goodsId: string, scope: GoodsFileExportScope): Promise<{
  goodsName: string;
  scope: GoodsFileExportScope;
  entries: GoodsFileExportEntry[];
  manifestCsv: string;
} | null> {
  const goods = await prisma.goods.findUnique({
    where: { id: goodsId },
    select: { id: true, name: true, type: true },
  });

  if (!goods || goods.type !== GoodsType.FILE) return null;

  const statuses =
    scope === "UNREDEEMED"
      ? [GoodsFileStatus.RESERVED, GoodsFileStatus.AVAILABLE]
      : [GoodsFileStatus.REDEEMED];

  const files = await prisma.goodsFile.findMany({
    where: { goodsId: goods.id, status: { in: statuses } },
    orderBy: [{ originalName: "asc" }, { createdAt: "asc" }],
    include: {
      reservedByCardKey: { select: { keyMask: true } },
      redeemedByRedemption: { select: { cardKey: { select: { keyMask: true } } } },
    },
  });

  const seenEntryNames = new Map<string, number>();
  const entries = files.map((file) => ({
    originalName: file.originalName,
    storagePath: file.storagePath,
    entryName: createUniqueEntryName(file.originalName, seenEntryNames),
    status: file.status as "AVAILABLE" | "RESERVED" | "REDEEMED",
    cardKeyMask: file.reservedByCardKey?.keyMask ?? file.redeemedByRedemption?.cardKey.keyMask ?? null,
    reservedAt: file.reservedAt,
    redeemedAt: file.redeemedAt,
  }));

  return {
    goodsName: goods.name,
    scope,
    entries,
    manifestCsv: createManifestCsv(entries),
  };
}

export async function disableGoods(goodsId: string): Promise<void> {
  await prisma.goods.update({
    where: { id: goodsId },
    data: { status: GoodsStatus.DISABLED },
  });
}

export async function enableGoods(goodsId: string): Promise<void> {
  await prisma.goods.update({
    where: { id: goodsId },
    data: { status: GoodsStatus.ACTIVE },
  });
}

export async function deleteGoods(goodsId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const goods = await tx.goods.findUnique({
      where: { id: goodsId },
      select: {
        id: true,
        _count: { select: { cardKeys: true, redemptions: true } },
      },
    });

    if (!goods) {
      throw new Error("Goods not found.");
    }

    if (goods._count.cardKeys > 0 || goods._count.redemptions > 0) {
      throw new CannotDeleteGoodsInUseError();
    }

    await tx.goods.delete({ where: { id: goods.id } });
  });
}
