import { describe, expect, it, vi } from "vitest";
import { getReceiptByToken } from "@/lib/redemption/service";
import { GET } from "@/app/api/receipt/[token]/route";

vi.mock("@/lib/redemption/service", () => ({
  getReceiptByToken: vi.fn(),
}));

const mockedGetReceiptByToken = vi.mocked(getReceiptByToken);

describe("receipt status route", () => {
  it("returns whether a file receipt has been downloaded", async () => {
    mockedGetReceiptByToken.mockResolvedValueOnce({
      kind: "FILE",
      goodsName: "CPA 文件",
      goodsNote: null,
      redeemedAt: new Date("2026-05-19T06:00:00.000Z"),
      downloaded: true,
      fileQuantity: 1,
    });

    const response = await GET(new Request("https://example.test/api/receipt/receipt-token"), {
      params: Promise.resolve({ token: "receipt-token" }),
    });

    await expect(response.json()).resolves.toEqual({ kind: "FILE", downloaded: true });
  });

  it("returns 404 for unknown receipt tokens", async () => {
    mockedGetReceiptByToken.mockResolvedValueOnce(null);

    const response = await GET(new Request("https://example.test/api/receipt/missing"), {
      params: Promise.resolve({ token: "missing" }),
    });

    expect(response.status).toBe(404);
  });
});
