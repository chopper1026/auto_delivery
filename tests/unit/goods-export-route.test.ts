import { describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { writeAdminAuditLog } from "@/lib/admin/action-auth";
import { requireAdminSession } from "@/lib/admin/auth";
import { getGoodsFileExportPackage } from "@/lib/goods/service";
import { getRequestMeta } from "@/lib/request-meta";
import { ensureStorageDirectories } from "@/lib/storage/files";
import { createZipFromFiles } from "@/lib/storage/zip";
import { GET } from "@/app/admin/(protected)/goods/[goodsId]/export/[scope]/route";

vi.mock("@/lib/admin/action-auth", () => ({
  writeAdminAuditLog: vi.fn(),
}));

vi.mock("@/lib/admin/auth", () => ({
  requireAdminSession: vi.fn(),
}));

vi.mock("@/lib/goods/service", () => ({
  getGoodsFileExportPackage: vi.fn(),
}));

vi.mock("@/lib/storage/files", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/storage/files")>();
  return {
    ...actual,
    ensureStorageDirectories: vi.fn(),
  };
});

vi.mock("@/lib/storage/zip", () => ({
  createZipFromFiles: vi.fn(),
}));

vi.mock("@/lib/request-meta", () => ({
  getRequestMeta: vi.fn(),
}));

const mockedWriteAdminAuditLog = vi.mocked(writeAdminAuditLog);
const mockedRequireAdminSession = vi.mocked(requireAdminSession);
const mockedGetGoodsFileExportPackage = vi.mocked(getGoodsFileExportPackage);
const mockedGetRequestMeta = vi.mocked(getRequestMeta);
const mockedEnsureStorageDirectories = vi.mocked(ensureStorageDirectories);
const mockedCreateZipFromFiles = vi.mocked(createZipFromFiles);

describe("goods export route", () => {
  it("rejects empty export scopes instead of downloading an empty zip", async () => {
    mockedRequireAdminSession.mockResolvedValueOnce({
      admin: { id: "admin-1", username: "admin" },
      token: "session-token",
    });
    mockedGetRequestMeta.mockResolvedValueOnce({ ipAddress: "127.0.0.1", userAgent: "vitest" });
    mockedGetGoodsFileExportPackage.mockResolvedValueOnce({
      goodsName: "CPA 文件",
      scope: "REDEEMED",
      entries: [],
      manifestCsv: "originalName,status,cardKeyMask,reservedAt,redeemedAt\n",
    });

    const response = await GET(new Request("https://example.test/admin/goods/goods-1/export/redeemed") as NextRequest, {
      params: Promise.resolve({ goodsId: "goods-1", scope: "redeemed" }),
    });

    expect(response.status).toBe(409);
    await expect(response.text()).resolves.toBe("没有已兑换文件可导出。");
    expect(mockedGetGoodsFileExportPackage).toHaveBeenCalledWith("goods-1", "REDEEMED");
    expect(mockedEnsureStorageDirectories).not.toHaveBeenCalled();
    expect(mockedCreateZipFromFiles).not.toHaveBeenCalled();
    expect(mockedWriteAdminAuditLog).not.toHaveBeenCalled();
  });
});
