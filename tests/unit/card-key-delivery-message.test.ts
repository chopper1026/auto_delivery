import { describe, expect, it } from "vitest";
import { buildCardKeyDeliveryMessage, buildRedeemUrl, normalizeServiceBaseUrl } from "@/lib/card-keys/delivery-message";

describe("card key delivery message", () => {
  it("normalizes service base urls without trailing slashes", () => {
    expect(normalizeServiceBaseUrl(" https://example.com/shop/// ")).toBe("https://example.com/shop");
  });

  it("builds the redeem url from the configured service address", () => {
    expect(buildRedeemUrl("https://example.com/shop/")).toBe("https://example.com/shop/");
  });

  it("includes redeem url, plaintext key, validity window, and customer notes", () => {
    const message = buildCardKeyDeliveryMessage({
      serviceBaseUrl: "https://example.com/",
      plaintextKey: "AD-AAAA-BBBB-CCCC-DDDD",
      createdAt: new Date("2026-05-19T06:00:00.000Z"),
      expiresAt: new Date("2026-05-22T06:00:00.000Z"),
    });

    expect(message).toContain("兑换地址：https://example.com/");
    expect(message).toContain("卡密：AD-AAAA-BBBB-CCCC-DDDD");
    expect(message).toContain("创建时间：2026");
    expect(message).toContain("到期时间：2026");
    expect(message).toContain("一个卡密只能兑换一次");
    expect(message).toContain("兑换完成后请及时保存");
    expect(message).toContain("不予处理");
  });

  it("renders a custom delivery message template with card-key variables", () => {
    const message = buildCardKeyDeliveryMessage({
      serviceBaseUrl: "https://example.com/shop",
      plaintextKey: "AD-AAAA-BBBB-CCCC-DDDD",
      createdAt: new Date("2026-05-19T06:00:00.000Z"),
      expiresAt: null,
      template: "地址：{{redeemUrl}}\n卡：{{cardKey}}\n建：{{createdAt}}\n期：{{expiresAt}}",
    });

    expect(message).toContain("地址：https://example.com/shop/");
    expect(message).toContain("卡：AD-AAAA-BBBB-CCCC-DDDD");
    expect(message).toContain("建：2026");
    expect(message).toContain("期：永不过期");
  });
});
