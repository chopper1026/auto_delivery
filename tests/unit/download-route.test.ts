import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { claimDownload, completeDownloadClaim, releaseDownloadClaim } from "@/lib/redemption/service";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { GET } from "@/app/api/download/[token]/route";

vi.mock("@/lib/redemption/service", () => ({
  claimDownload: vi.fn(),
  completeDownloadClaim: vi.fn(),
  releaseDownloadClaim: vi.fn(),
}));

vi.mock("@/lib/security/rate-limit", () => ({
  consumeRateLimit: vi.fn(),
}));

const mockedClaimDownload = vi.mocked(claimDownload);
const mockedCompleteDownloadClaim = vi.mocked(completeDownloadClaim);
const mockedReleaseDownloadClaim = vi.mocked(releaseDownloadClaim);
const mockedConsumeRateLimit = vi.mocked(consumeRateLimit);
const tmp = path.join(process.cwd(), ".tmp-download-route-test");

function downloadRequest() {
  return new Request("https://example.test/api/download/receipt-token", {
    headers: {
      "user-agent": "vitest",
      "x-forwarded-for": "127.0.0.1",
    },
  }) as NextRequest;
}

describe("download route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedConsumeRateLimit.mockResolvedValue({ allowed: true, remaining: 59, resetAt: new Date(Date.now() + 60_000) });
  });

  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  it("redirects repeated file downloads to a friendly one-time download page", async () => {
    mockedClaimDownload.mockResolvedValueOnce({ result: "ALREADY_DOWNLOADED" });

    const response = await GET(downloadRequest(), { params: Promise.resolve({ token: "receipt-token" }) });

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://example.test/download/already-downloaded?receipt=receipt-token");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mockedClaimDownload).toHaveBeenCalledWith({
      receiptToken: "receipt-token",
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
    });
  });

  it("returns 429 before claiming when the public download rate limit is exhausted", async () => {
    mockedConsumeRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0, resetAt: new Date(Date.now() + 60_000) });

    const response = await GET(downloadRequest(), { params: Promise.resolve({ token: "receipt-token" }) });

    expect(response.status).toBe(429);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mockedConsumeRateLimit).toHaveBeenCalledWith({
      scope: "public-download",
      identifier: "127.0.0.1",
      limit: 60,
      windowMs: 15 * 60 * 1000,
    });
    expect(mockedClaimDownload).not.toHaveBeenCalled();
  });

  it("completes the claim after the zip stream ends", async () => {
    await fs.mkdir(tmp, { recursive: true });
    const zipPath = path.join(tmp, "download.zip");
    await fs.writeFile(zipPath, "zip-bytes");
    mockedClaimDownload.mockResolvedValueOnce({
      result: "SUCCESS",
      redemptionId: "redemption-id",
      claimToken: "claim-token",
      zipPath,
      filename: "download.zip",
    });
    mockedCompleteDownloadClaim.mockResolvedValueOnce({ result: "SUCCESS" });

    const response = await GET(downloadRequest(), { params: Promise.resolve({ token: "receipt-token" }) });
    const body = Buffer.from(await response.arrayBuffer()).toString("utf8");

    expect(response.status).toBe(200);
    expect(body).toBe("zip-bytes");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mockedCompleteDownloadClaim).toHaveBeenCalledWith({
      redemptionId: "redemption-id",
      claimToken: "claim-token",
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
    });
    expect(mockedReleaseDownloadClaim).not.toHaveBeenCalled();
  });

  it("releases the claim when the claimed zip is missing", async () => {
    mockedClaimDownload.mockResolvedValueOnce({
      result: "SUCCESS",
      redemptionId: "redemption-id",
      claimToken: "claim-token",
      zipPath: path.join(tmp, "missing.zip"),
      filename: "download.zip",
    });
    mockedReleaseDownloadClaim.mockResolvedValueOnce({ result: "SUCCESS" });

    const response = await GET(downloadRequest(), { params: Promise.resolve({ token: "receipt-token" }) });

    expect(response.status).toBe(500);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mockedReleaseDownloadClaim).toHaveBeenCalledWith({
      redemptionId: "redemption-id",
      claimToken: "claim-token",
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
    });
    expect(mockedCompleteDownloadClaim).not.toHaveBeenCalled();
  });

  it("releases the claim when the download stream is canceled", async () => {
    await fs.mkdir(tmp, { recursive: true });
    const zipPath = path.join(tmp, "cancel.zip");
    await fs.writeFile(zipPath, Buffer.alloc(1024 * 1024, 1));
    mockedClaimDownload.mockResolvedValueOnce({
      result: "SUCCESS",
      redemptionId: "redemption-id",
      claimToken: "claim-token",
      zipPath,
      filename: "download.zip",
    });
    mockedReleaseDownloadClaim.mockResolvedValueOnce({ result: "SUCCESS" });

    const response = await GET(downloadRequest(), { params: Promise.resolve({ token: "receipt-token" }) });
    await response.body?.cancel();

    expect(mockedReleaseDownloadClaim).toHaveBeenCalledWith({
      redemptionId: "redemption-id",
      claimToken: "claim-token",
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
    });
    expect(mockedCompleteDownloadClaim).not.toHaveBeenCalled();
  });

  it("logs structured context when claim completion returns ERROR after the stream ends", async () => {
    await fs.mkdir(tmp, { recursive: true });
    const zipPath = path.join(tmp, "complete-error.zip");
    await fs.writeFile(zipPath, "zip-bytes");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mockedClaimDownload.mockResolvedValueOnce({
      result: "SUCCESS",
      redemptionId: "redemption-id",
      claimToken: "claim-token",
      zipPath,
      filename: "download.zip",
    });
    mockedCompleteDownloadClaim.mockResolvedValueOnce({ result: "ERROR" });

    try {
      const response = await GET(downloadRequest(), { params: Promise.resolve({ token: "receipt-token" }) });
      await response.arrayBuffer();

      expect(mockedCompleteDownloadClaim).toHaveBeenCalledWith({
        redemptionId: "redemption-id",
        claimToken: "claim-token",
        ipAddress: "127.0.0.1",
        userAgent: "vitest",
      });
      expect(consoleError).toHaveBeenCalledWith("Download claim completion failed", {
        redemptionId: "redemption-id",
        result: "ERROR",
      });
    } finally {
      consoleError.mockRestore();
    }
  });
});
