import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireAdminAction, writeAdminAuditLog } from "@/lib/admin/action-auth";
import { registerGoodsFiles } from "@/lib/goods/service";
import { writeUploadedFile } from "@/lib/storage/files";
import { uploadGoodsFilesAction } from "@/app/admin/(protected)/goods/actions";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/admin/action-auth", () => ({
  requireAdminAction: vi.fn(),
  writeAdminAuditLog: vi.fn(),
}));

vi.mock("@/lib/goods/service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/goods/service")>();
  return {
    ...actual,
    registerGoodsFiles: vi.fn(),
  };
});

vi.mock("@/lib/storage/files", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/storage/files")>();
  return {
    ...actual,
    isAllowedInventoryFile: vi.fn(() => true),
    writeUploadedFile: vi.fn(),
  };
});

const mockedRequireAdminAction = vi.mocked(requireAdminAction);
const mockedWriteAdminAuditLog = vi.mocked(writeAdminAuditLog);
const mockedRegisterGoodsFiles = vi.mocked(registerGoodsFiles);
const mockedWriteUploadedFile = vi.mocked(writeUploadedFile);

function uploadForm(files: File[]) {
  const formData = new FormData();
  formData.set("csrfToken", "csrf-token");
  formData.set("goodsId", "goods-1");
  for (const file of files) {
    formData.append("files", file);
  }
  return formData;
}

describe("goods admin actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedRequireAdminAction.mockResolvedValue({
      admin: { id: "admin-1", username: "admin" },
      meta: { ipAddress: "127.0.0.1", userAgent: "vitest" },
      sessionToken: "session-token",
    });
    mockedWriteUploadedFile.mockResolvedValue({
      storedName: "stored.json",
      storagePath: "/tmp/stored.json",
      sizeBytes: 2,
      sha256: "0".repeat(64),
    });
  });

  it("rejects upload batches over the server-side file count limit before writing files", async () => {
    const files = Array.from(
      { length: 201 },
      (_, index) => new File(["{}"], `file-${index}.json`, { type: "application/json" }),
    );

    await expect(uploadGoodsFilesAction(uploadForm(files))).rejects.toThrow("Too many files selected. Maximum is 200.");

    expect(mockedWriteUploadedFile).not.toHaveBeenCalled();
    expect(mockedRegisterGoodsFiles).not.toHaveBeenCalled();
    expect(mockedWriteAdminAuditLog).not.toHaveBeenCalled();
  });

  it("rejects a single uploaded file over the server-side size limit before writing files", async () => {
    const file = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.json", { type: "application/json" });

    await expect(uploadGoodsFilesAction(uploadForm([file]))).rejects.toThrow("A selected file is too large.");

    expect(mockedWriteUploadedFile).not.toHaveBeenCalled();
    expect(mockedRegisterGoodsFiles).not.toHaveBeenCalled();
    expect(mockedWriteAdminAuditLog).not.toHaveBeenCalled();
  });
});
