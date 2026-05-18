import { describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { consumeDownload } from "@/lib/redemption/service";
import { GET } from "@/app/api/download/[token]/route";

vi.mock("@/lib/redemption/service", () => ({
  consumeDownload: vi.fn(),
}));

const mockedConsumeDownload = vi.mocked(consumeDownload);

describe("download route", () => {
  it("redirects repeated file downloads to a friendly one-time download page", async () => {
    mockedConsumeDownload.mockResolvedValueOnce({ result: "ALREADY_DOWNLOADED" });

    const response = await GET(
      new Request("https://example.test/api/download/receipt-token", {
        headers: {
          "user-agent": "vitest",
          "x-forwarded-for": "127.0.0.1",
        },
      }) as NextRequest,
      { params: Promise.resolve({ token: "receipt-token" }) },
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://example.test/download/already-downloaded?receipt=receipt-token");
    expect(mockedConsumeDownload).toHaveBeenCalledWith({
      receiptToken: "receipt-token",
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
    });
  });
});
