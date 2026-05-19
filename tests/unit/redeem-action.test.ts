import { beforeEach, describe, expect, it, vi } from "vitest";
import { redeemAction } from "@/app/actions/redeem";
import { CardKeyNotRedeemableError, redeemCardKey } from "@/lib/redemption/service";
import { getRequestMeta } from "@/lib/request-meta";
import { consumeRateLimit } from "@/lib/security/rate-limit";

vi.mock("@/lib/redemption/service", () => {
  class MockCardKeyNotRedeemableError extends Error {
    constructor() {
      super("Card key is not redeemable.");
      this.name = "CardKeyNotRedeemableError";
    }
  }

  return {
    CardKeyNotRedeemableError: MockCardKeyNotRedeemableError,
    redeemCardKey: vi.fn(),
  };
});

vi.mock("@/lib/request-meta", () => ({
  getRequestMeta: vi.fn(),
}));

vi.mock("@/lib/security/rate-limit", () => ({
  consumeRateLimit: vi.fn(),
}));

const mockedRedeemCardKey = vi.mocked(redeemCardKey);
const mockedGetRequestMeta = vi.mocked(getRequestMeta);
const mockedConsumeRateLimit = vi.mocked(consumeRateLimit);

function formDataFor(cardKey: string) {
  const formData = new FormData();
  formData.set("cardKey", cardKey);
  return formData;
}

describe("redeemAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetRequestMeta.mockResolvedValue({ ipAddress: "127.0.0.1", userAgent: "vitest" });
    mockedConsumeRateLimit.mockResolvedValue({ allowed: true, remaining: 19, resetAt: Date.now() + 60_000 });
  });

  it("returns a receipt href after a successful redemption", async () => {
    mockedRedeemCardKey.mockResolvedValueOnce({
      receiptToken: "receipt-token",
      goodsType: "TEXT",
    });

    await expect(redeemAction({}, formDataFor("ad-abcd-ef12-3456-7890"))).resolves.toEqual({
      status: "success",
      receiptHref: "/receipt/receipt-token",
    });
    expect(mockedRedeemCardKey).toHaveBeenCalledWith({
      plaintextKey: "AD-ABCD-EF12-3456-7890",
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
    });
  });

  it("returns the existing invalid-card error without a success href", async () => {
    mockedRedeemCardKey.mockRejectedValueOnce(new CardKeyNotRedeemableError());

    await expect(redeemAction({}, formDataFor("AD-ABCD-EF12-3456-7890"))).resolves.toEqual({
      status: "error",
      error: "卡密无效、已过期或已兑换。",
    });
  });

  it("returns the existing rate-limit error before redeeming", async () => {
    mockedConsumeRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0, resetAt: Date.now() + 60_000 });

    await expect(redeemAction({}, formDataFor("AD-ABCD-EF12-3456-7890"))).resolves.toEqual({
      status: "error",
      error: "请求过于频繁，请稍后再试。",
    });
    expect(mockedRedeemCardKey).not.toHaveBeenCalled();
  });
});
