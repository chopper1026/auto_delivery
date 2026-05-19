import { afterEach, describe, expect, it } from "vitest";
import { CardKeyStatus, GoodsFileStatus } from "@/generated/prisma/enums";
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
