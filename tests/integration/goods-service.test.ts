import { afterEach, describe, expect, it } from "vitest";
import { GoodsFileStatus, GoodsType } from "@/generated/prisma/enums";
import { resetDatabase } from "../helpers/db";
import { createFileGoods, createTextGoods, registerGoodsFiles } from "@/lib/goods/service";
import { prisma } from "@/lib/db";

afterEach(async () => {
  await resetDatabase();
});

describe("goods service", () => {
  it("creates text goods", async () => {
    const goods = await createTextGoods({ name: "notice", textContent: "hello" });

    expect(goods.type).toBe(GoodsType.TEXT);
    expect(goods.textContent).toBe("hello");
  });

  it("creates file goods and registers json files as available", async () => {
    const goods = await createFileGoods({ name: "cpa文件" });
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
  });
});
