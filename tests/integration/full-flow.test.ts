import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { GoodsFileStatus } from "@/generated/prisma/enums";
import { generateCardKey } from "@/lib/card-keys/service";
import { prisma } from "@/lib/db";
import { createFileGoods, registerGoodsFiles } from "@/lib/goods/service";
import { consumeDownload, redeemCardKey } from "@/lib/redemption/service";
import { zipRoot } from "@/lib/storage/paths";
import { resetDatabase } from "../helpers/db";

const tmp = path.join(process.cwd(), ".tmp-full-flow-test");

afterEach(async () => {
  await resetDatabase();
  await fs.rm(tmp, { recursive: true, force: true });
  await fs.rm(zipRoot, { recursive: true, force: true });
});

async function createJsonInventory(goodsId: string, count: number) {
  await fs.mkdir(tmp, { recursive: true });
  const files = [];
  for (let index = 0; index < count; index += 1) {
    const filePath = path.join(tmp, `payload-${index}.json`);
    const content = JSON.stringify({ id: index, value: `payload-${index}` });
    await fs.writeFile(filePath, content);
    files.push({
      originalName: `payload-${index}.json`,
      storedName: `stored-${index}.json`,
      storagePath: filePath,
      sizeBytes: Buffer.byteLength(content),
      mimeType: "application/json",
      sha256: String(index).padStart(64, "0"),
    });
  }
  await registerGoodsFiles(goodsId, files);
}

describe("full auto-delivery flow", () => {
  it("reserves 10 of 100 files, redeems them, and allows one download", async () => {
    const goods = await createFileGoods({ name: "cpa文件" });
    await createJsonInventory(goods.id, 100);

    const card = await generateCardKey({ goodsId: goods.id, expiration: "3d", fileQuantity: 10 });

    expect(await prisma.goodsFile.count({ where: { goodsId: goods.id, status: GoodsFileStatus.AVAILABLE } })).toBe(90);
    expect(await prisma.goodsFile.count({ where: { goodsId: goods.id, status: GoodsFileStatus.RESERVED } })).toBe(10);

    const redeemed = await redeemCardKey({
      plaintextKey: card.plaintextKey,
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
    });
    const redemption = await prisma.redemption.findUniqueOrThrow({ where: { cardKeyId: card.cardKeyId } });

    expect(await prisma.goodsFile.count({ where: { goodsId: goods.id, status: GoodsFileStatus.REDEEMED } })).toBe(10);
    expect(redemption.zipPath).toBeTruthy();
    expect((await fs.stat(redemption.zipPath || "")).size).toBeGreaterThan(0);

    const first = await consumeDownload({
      receiptToken: redeemed.receiptToken,
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
    });
    const second = await consumeDownload({
      receiptToken: redeemed.receiptToken,
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
    });

    expect(first.result).toBe("SUCCESS");
    expect(second.result).toBe("ALREADY_DOWNLOADED");
  });
});
