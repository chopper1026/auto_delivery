import { afterEach, describe, expect, it } from "vitest";
import { CardKeyStatus, GoodsFileStatus, GoodsType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { countCardKeys, deleteUnredeemedCardKey, generateCardKey, listCardKeys, NotEnoughInventoryError } from "@/lib/card-keys/service";
import { createFileGoods, createTextGoods, registerGoodsFiles } from "@/lib/goods/service";
import { resetDatabase } from "../helpers/db";

afterEach(async () => {
  await resetDatabase();
});

async function createInventory(goodsId: string, count: number) {
  await registerGoodsFiles(
    goodsId,
    Array.from({ length: count }, (_, index) => ({
      originalName: `file-${index}.json`,
      storedName: `stored-${index}.json`,
      storagePath: `/tmp/stored-${index}.json`,
      sizeBytes: 10,
      mimeType: "application/json",
      sha256: String(index).padStart(64, "0"),
    })),
  );
}

function quoteSqlIdentifier(identifier: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error("Unsafe database identifier.");
  }
  return `"${identifier}"`;
}

function qualifiedDatabaseName(name: string) {
  const schema = new URL(process.env.DATABASE_URL || "").searchParams.get("schema") || "public";
  return `${quoteSqlIdentifier(schema)}.${quoteSqlIdentifier(name)}`;
}

describe("card key service", () => {
  it("generates text goods card keys without file quantity", async () => {
    const goods = await createTextGoods({ name: "text", textContent: "hello" });
    const generated = await generateCardKey({ goodsId: goods.id, expiration: "3d" });
    const saved = await prisma.cardKey.findUniqueOrThrow({ where: { id: generated.cardKeyId } });

    expect(generated.plaintextKey).toMatch(/^AD-/);
    expect(saved.fileQuantity).toBe(0);
    expect(saved.status).toBe(CardKeyStatus.ACTIVE);
  });

  it("reserves requested files for file goods", async () => {
    const goods = await createFileGoods({ name: "cpa文件" });
    await createInventory(goods.id, 3);
    const generated = await generateCardKey({ goodsId: goods.id, expiration: "3d", fileQuantity: 2 });

    const reserved = await prisma.goodsFile.count({
      where: { reservedByCardKeyId: generated.cardKeyId, status: GoodsFileStatus.RESERVED },
    });
    const available = await prisma.goodsFile.count({
      where: { goodsId: goods.id, status: GoodsFileStatus.AVAILABLE },
    });

    expect(reserved).toBe(2);
    expect(available).toBe(1);
  });

  it("does not over-reserve the same files when card generation runs concurrently", async () => {
    const goods = await createFileGoods({ name: "cpa文件" });
    await createInventory(goods.id, 2);

    const results = await Promise.allSettled([
      generateCardKey({ goodsId: goods.id, expiration: "3d", fileQuantity: 2 }),
      generateCardKey({ goodsId: goods.id, expiration: "3d", fileQuantity: 2 }),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const reservedFiles = await prisma.goodsFile.findMany({
      where: { goodsId: goods.id, status: GoodsFileStatus.RESERVED },
      select: { reservedByCardKeyId: true },
    });
    expect(reservedFiles).toHaveLength(2);
    expect(new Set(reservedFiles.map((file) => file.reservedByCardKeyId)).size).toBe(1);
  });

  it("rejects a stale reservation attempt when another transaction already reserved the selected files", async () => {
    const goods = await createFileGoods({ name: "cpa文件" });
    await createInventory(goods.id, 2);
    let generated: Promise<unknown> | undefined;
    let manualCardId = "";

    await prisma.$transaction(async (tx) => {
      const goodsFileTable = qualifiedDatabaseName("GoodsFile");
      const goodsFileStatusType = qualifiedDatabaseName("GoodsFileStatus");
      const lockedFiles = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        `
          SELECT id
          FROM ${goodsFileTable}
          WHERE "goodsId" = $1
            AND status = $2::${goodsFileStatusType}
          ORDER BY "createdAt" ASC
          FOR UPDATE
        `,
        goods.id,
        GoodsFileStatus.AVAILABLE,
      );

      generated = generateCardKey({ goodsId: goods.id, expiration: "3d", fileQuantity: 2 }).then(
        (result) => result,
        (error) => error,
      );
      await new Promise((resolve) => setTimeout(resolve, 250));

      const manualCard = await tx.cardKey.create({
        data: {
          keyHash: "manual-race-key",
          keyMask: "AD-****-RACE",
          goodsId: goods.id,
          goodsType: GoodsType.FILE,
          fileQuantity: 2,
        },
      });
      manualCardId = manualCard.id;

      await tx.goodsFile.updateMany({
        where: { id: { in: lockedFiles.map((file) => file.id) } },
        data: {
          status: GoodsFileStatus.RESERVED,
          reservedByCardKeyId: manualCard.id,
          reservedAt: new Date(),
        },
      });
    });

    await expect(generated).resolves.toBeInstanceOf(NotEnoughInventoryError);
    const reservedFiles = await prisma.goodsFile.findMany({
      where: { goodsId: goods.id, status: GoodsFileStatus.RESERVED },
      select: { reservedByCardKeyId: true },
    });
    expect(new Set(reservedFiles.map((file) => file.reservedByCardKeyId))).toEqual(new Set([manualCardId]));
  });

  it("rejects file card generation when inventory is insufficient", async () => {
    const goods = await createFileGoods({ name: "cpa文件" });
    await createInventory(goods.id, 1);

    await expect(generateCardKey({ goodsId: goods.id, expiration: "3d", fileQuantity: 2 })).rejects.toBeInstanceOf(
      NotEnoughInventoryError,
    );
  });

  it("deletes unredeemed file card keys and releases reserved files", async () => {
    const goods = await createFileGoods({ name: "cpa文件" });
    await createInventory(goods.id, 2);
    const generated = await generateCardKey({ goodsId: goods.id, expiration: "3d", fileQuantity: 2 });

    await deleteUnredeemedCardKey(generated.cardKeyId);

    const card = await prisma.cardKey.findUniqueOrThrow({ where: { id: generated.cardKeyId } });
    const available = await prisma.goodsFile.count({
      where: { goodsId: goods.id, status: GoodsFileStatus.AVAILABLE, reservedByCardKeyId: null },
    });
    expect(card.status).toBe(CardKeyStatus.DELETED);
    expect(available).toBe(2);
  });

  it("filters card keys by goods name, visible key suffix, and status", async () => {
    const alpha = await createTextGoods({ name: "Alpha 文本", textContent: "hello" });
    const beta = await createTextGoods({ name: "Beta 文本", textContent: "hello" });
    const alphaCard = await generateCardKey({ goodsId: alpha.id, expiration: "3d" });
    const betaCard = await generateCardKey({ goodsId: beta.id, expiration: "3d" });
    await deleteUnredeemedCardKey(betaCard.cardKeyId);

    const byGoodsName = await listCardKeys({ query: "alpha" });
    const betaSuffix = betaCard.keyMask.slice(-4).toLowerCase();
    const deletedBySuffixCount = await countCardKeys({ query: betaSuffix, status: CardKeyStatus.DELETED });

    expect(byGoodsName.map((card) => card.id)).toEqual([alphaCard.cardKeyId]);
    expect(deletedBySuffixCount).toBe(1);
  });
});
