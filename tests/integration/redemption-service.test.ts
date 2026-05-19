import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { CardKeyStatus, GoodsFileStatus, RedemptionDownloadState } from "@/generated/prisma/enums";
import { generateCardKey } from "@/lib/card-keys/service";
import { prisma } from "@/lib/db";
import { createFileGoods, createTextGoods, registerGoodsFiles } from "@/lib/goods/service";
import {
  claimDownload,
  completeDownloadClaim,
  consumeDownload,
  getReceiptByToken,
  redeemCardKey,
  releaseDownloadClaim,
} from "@/lib/redemption/service";
import { zipRoot } from "@/lib/storage/paths";
import { resetDatabase } from "../helpers/db";

const tmp = path.join(process.cwd(), ".tmp-redemption-test");

afterEach(async () => {
  await resetDatabase();
  await fs.rm(tmp, { recursive: true, force: true });
  await fs.rm(zipRoot, { recursive: true, force: true });
});

async function createFileInventory(goodsId: string, count: number) {
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

describe("redemption service", () => {
  it("redeems text goods and returns receipt data", async () => {
    const goods = await createTextGoods({ name: "notice", textContent: "hello" });
    const card = await generateCardKey({ goodsId: goods.id, expiration: "3d" });

    const redeemed = await redeemCardKey({
      plaintextKey: card.plaintextKey,
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
    });
    const receipt = await getReceiptByToken(redeemed.receiptToken);
    const saved = await prisma.cardKey.findUniqueOrThrow({ where: { id: card.cardKeyId } });

    expect(redeemed.goodsType).toBe("TEXT");
    expect(receipt?.kind).toBe("TEXT");
    expect(receipt && "textContent" in receipt ? receipt.textContent : "").toBe("hello");
    expect(saved.status).toBe(CardKeyStatus.REDEEMED);
  });

  it("rejects expired cards", async () => {
    const goods = await createTextGoods({ name: "notice", textContent: "hello" });
    const card = await generateCardKey({ goodsId: goods.id, expiration: "1d" });
    await prisma.cardKey.update({
      where: { id: card.cardKeyId },
      data: { expiresAt: new Date("2026-01-01T00:00:00.000Z") },
    });

    await expect(
      redeemCardKey({ plaintextKey: card.plaintextKey, ipAddress: "127.0.0.1", userAgent: "vitest" }),
    ).rejects.toThrow("Card key is not redeemable.");
  });

  it("rejects duplicate redemption", async () => {
    const goods = await createTextGoods({ name: "notice", textContent: "hello" });
    const card = await generateCardKey({ goodsId: goods.id, expiration: "3d" });
    await redeemCardKey({ plaintextKey: card.plaintextKey, ipAddress: "127.0.0.1", userAgent: "vitest" });

    await expect(
      redeemCardKey({ plaintextKey: card.plaintextKey, ipAddress: "127.0.0.1", userAgent: "vitest" }),
    ).rejects.toThrow("Card key is not redeemable.");
  });

  it("redeems file goods, creates a zip, and consumes one download", async () => {
    const goods = await createFileGoods({ name: "cpa文件", note: "下载后请先解压。" });
    await createFileInventory(goods.id, 2);
    const card = await generateCardKey({ goodsId: goods.id, expiration: "3d", fileQuantity: 2 });

    const redeemed = await redeemCardKey({
      plaintextKey: card.plaintextKey,
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
    });
    const receipt = await getReceiptByToken(redeemed.receiptToken);
    const redemption = await prisma.redemption.findUniqueOrThrow({ where: { cardKeyId: card.cardKeyId } });
    const redeemedFiles = await prisma.goodsFile.count({
      where: { goodsId: goods.id, status: GoodsFileStatus.REDEEMED },
    });

    expect(receipt?.kind).toBe("FILE");
    expect(receipt && "fileQuantity" in receipt ? receipt.fileQuantity : 0).toBe(2);
    expect(receipt && "goodsNote" in receipt ? receipt.goodsNote : "").toBe("下载后请先解压。");
    expect(redemption.zipPath).toBeTruthy();
    expect(await fs.stat(redemption.zipPath || "")).toMatchObject({ size: expect.any(Number) });
    expect(redeemedFiles).toBe(2);

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

  it("claims a download without marking the receipt downloaded until the claim completes", async () => {
    const goods = await createFileGoods({ name: "downloadable" });
    await createFileInventory(goods.id, 1);
    const card = await generateCardKey({ goodsId: goods.id, expiration: "3d", fileQuantity: 1 });
    const redeemed = await redeemCardKey({
      plaintextKey: card.plaintextKey,
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
    });

    const claim = await claimDownload({
      receiptToken: redeemed.receiptToken,
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
    });

    expect(claim.result).toBe("SUCCESS");
    if (claim.result !== "SUCCESS") throw new Error("expected successful claim");

    const claimedRedemption = await prisma.redemption.findUniqueOrThrow({ where: { id: claim.redemptionId } });
    const receiptDuringClaim = await getReceiptByToken(redeemed.receiptToken);
    expect(claimedRedemption.downloadCount).toBe(0);
    expect(claimedRedemption.firstDownloadedAt).toBeNull();
    expect(claimedRedemption.downloadState).toBe(RedemptionDownloadState.IN_PROGRESS);
    expect(receiptDuringClaim && "downloaded" in receiptDuringClaim ? receiptDuringClaim.downloaded : true).toBe(false);

    await expect(
      completeDownloadClaim({
        redemptionId: claim.redemptionId,
        claimToken: claim.claimToken,
        ipAddress: "127.0.0.1",
        userAgent: "vitest",
      }),
    ).resolves.toEqual({ result: "SUCCESS" });

    const completedRedemption = await prisma.redemption.findUniqueOrThrow({ where: { id: claim.redemptionId } });
    expect(completedRedemption.downloadCount).toBe(1);
    expect(completedRedemption.firstDownloadedAt).toBeInstanceOf(Date);
    expect(completedRedemption.downloadState).toBe(RedemptionDownloadState.DOWNLOADED);
    expect(completedRedemption.downloadClaimTokenHash).toBeNull();
    expect(completedRedemption.downloadClaimExpiresAt).toBeNull();
  });

  it("releases a failed download claim so the receipt can be claimed again", async () => {
    const goods = await createFileGoods({ name: "retryable" });
    await createFileInventory(goods.id, 1);
    const card = await generateCardKey({ goodsId: goods.id, expiration: "3d", fileQuantity: 1 });
    const redeemed = await redeemCardKey({
      plaintextKey: card.plaintextKey,
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
    });
    const firstClaim = await claimDownload({
      receiptToken: redeemed.receiptToken,
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
    });

    expect(firstClaim.result).toBe("SUCCESS");
    if (firstClaim.result !== "SUCCESS") throw new Error("expected successful first claim");

    await expect(
      releaseDownloadClaim({
        redemptionId: firstClaim.redemptionId,
        claimToken: firstClaim.claimToken,
        ipAddress: "127.0.0.1",
        userAgent: "vitest",
      }),
    ).resolves.toEqual({ result: "SUCCESS" });

    const secondClaim = await claimDownload({
      receiptToken: redeemed.receiptToken,
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
    });

    expect(secondClaim.result).toBe("SUCCESS");
    if (secondClaim.result !== "SUCCESS") throw new Error("expected successful second claim");
    expect(secondClaim.claimToken).not.toBe(firstClaim.claimToken);

    const redemption = await prisma.redemption.findUniqueOrThrow({ where: { id: secondClaim.redemptionId } });
    expect(redemption.downloadCount).toBe(0);
    expect(redemption.firstDownloadedAt).toBeNull();
    expect(redemption.downloadState).toBe(RedemptionDownloadState.IN_PROGRESS);
  });
});
