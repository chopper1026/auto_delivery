import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { GoodsFileStatus, GoodsStatus, GoodsType } from "@/generated/prisma/enums";
import { resetDatabase } from "../helpers/db";
import { generateCardKey } from "@/lib/card-keys/service";
import {
  CannotDeleteGoodsInUseError,
  countGoods,
  createFileGoods,
  createTextGoods,
  deleteGoods,
  disableGoods,
  enableGoods,
  getGoodsFileExportPackage,
  listGoodsWithInventory,
  registerGoodsFiles,
} from "@/lib/goods/service";
import { redeemCardKey } from "@/lib/redemption/service";
import { prisma } from "@/lib/db";
import { zipRoot } from "@/lib/storage/paths";

const tmp = path.join(process.cwd(), ".tmp-goods-export-test");

afterEach(async () => {
  await resetDatabase();
  await fs.rm(tmp, { recursive: true, force: true });
  await fs.rm(zipRoot, { recursive: true, force: true });
});

async function createInventory(goodsId: string, count: number) {
  await fs.mkdir(tmp, { recursive: true });
  const files = [];
  for (let index = 0; index < count; index += 1) {
    const filePath = path.join(tmp, `file-${index}.json`);
    await fs.writeFile(filePath, JSON.stringify({ index }));
    files.push({
      originalName: `file-${index}.json`,
      storedName: `stored-${index}.json`,
      storagePath: filePath,
      sizeBytes: 12,
      mimeType: "application/json",
      sha256: String(index).padStart(64, "0"),
    });
  }
  await registerGoodsFiles(goodsId, files);
}

describe("goods service", () => {
  it("creates text goods", async () => {
    const goods = await createTextGoods({ name: "notice", textContent: "hello" });

    expect(goods.type).toBe(GoodsType.TEXT);
    expect(goods.textContent).toBe("hello");
  });

  it("creates file goods and registers json files as available", async () => {
    const goods = await createFileGoods({ name: "cpa文件", note: "请下载后导入 CPA 工具。" });
    await registerGoodsFiles(goods.id, [
      {
        originalName: "a.json",
        storedName: "a-random.json",
        storagePath: "/tmp/a.json",
        sizeBytes: 12,
        mimeType: "application/json",
        sha256: "a".repeat(64),
      },
      {
        originalName: "b.json",
        storedName: "b-random.json",
        storagePath: "/tmp/b.json",
        sizeBytes: 12,
        mimeType: "application/json",
        sha256: "b".repeat(64),
      },
    ]);

    const count = await prisma.goodsFile.count({
      where: { goodsId: goods.id, status: GoodsFileStatus.AVAILABLE },
    });
    expect(count).toBe(2);
    expect(goods.note).toBe("请下载后导入 CPA 工具。");
  });

  it("builds export packages for unredeemed and redeemed file goods", async () => {
    const goods = await createFileGoods({ name: "cpa文件", note: "一组账号文件" });
    await createInventory(goods.id, 3);
    const card = await generateCardKey({ goodsId: goods.id, expiration: "3d", fileQuantity: 1 });

    const beforeRedeem = await getGoodsFileExportPackage(goods.id, "UNREDEEMED");

    expect(beforeRedeem?.goodsName).toBe("cpa文件");
    expect(beforeRedeem?.entries.map((entry) => entry.originalName)).toEqual(["file-0.json", "file-1.json", "file-2.json"]);
    expect(beforeRedeem?.entries.map((entry) => entry.status)).toEqual(["RESERVED", "AVAILABLE", "AVAILABLE"]);

    await redeemCardKey({
      plaintextKey: card.plaintextKey,
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
    });

    const unredeemed = await getGoodsFileExportPackage(goods.id, "UNREDEEMED");
    const redeemed = await getGoodsFileExportPackage(goods.id, "REDEEMED");

    expect(unredeemed?.entries.map((entry) => entry.originalName)).toEqual(["file-1.json", "file-2.json"]);
    expect(redeemed?.entries.map((entry) => entry.originalName)).toEqual(["file-0.json"]);
    expect(redeemed?.manifestCsv).toContain("originalName,status,cardKeyMask");
    expect(redeemed?.manifestCsv).toContain("file-0.json,REDEEMED");
  });

  it("enables disabled goods again", async () => {
    const goods = await createTextGoods({ name: "notice", textContent: "hello" });

    await disableGoods(goods.id);
    await enableGoods(goods.id);

    const enabled = await prisma.goods.findUniqueOrThrow({ where: { id: goods.id } });
    expect(enabled.status).toBe(GoodsStatus.ACTIVE);
  });

  it("filters goods by name query and status", async () => {
    await createTextGoods({ name: "Alpha 文本", textContent: "hello" });
    const beta = await createTextGoods({ name: "Beta 文本", textContent: "hello" });
    await createTextGoods({ name: "Alpha 文件说明", textContent: "hello" });
    await disableGoods(beta.id);

    const byName = await listGoodsWithInventory({ query: "alpha" });
    const disabledByNameCount = await countGoods({ query: "beta", status: GoodsStatus.DISABLED });

    expect(byName.map((item) => item.name).sort()).toEqual(["Alpha 文本", "Alpha 文件说明"].sort());
    expect(disabledByNameCount).toBe(1);
  });

  it("deletes unused goods and cascades inventory files", async () => {
    const goods = await createFileGoods({ name: "unused files" });
    await createInventory(goods.id, 2);

    await deleteGoods(goods.id);

    expect(await prisma.goods.findUnique({ where: { id: goods.id } })).toBeNull();
    expect(await prisma.goodsFile.count({ where: { goodsId: goods.id } })).toBe(0);
  });

  it("does not delete goods that are referenced by card keys", async () => {
    const goods = await createFileGoods({ name: "referenced files" });
    await createInventory(goods.id, 2);
    await generateCardKey({ goodsId: goods.id, expiration: "3d", fileQuantity: 1 });

    await expect(deleteGoods(goods.id)).rejects.toBeInstanceOf(CannotDeleteGoodsInUseError);

    expect(await prisma.goods.findUnique({ where: { id: goods.id } })).not.toBeNull();
  });
});
