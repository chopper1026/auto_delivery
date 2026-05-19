import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GeneratedCardKeyResult } from "@/components/admin/card-key-form";

describe("card key form result UI", () => {
  it("renders separate icon copy buttons for plaintext key and customer message", () => {
    const markup = renderToStaticMarkup(
      <GeneratedCardKeyResult
        plaintextKey="AD-AAAA-BBBB-CCCC-DDDD"
        deliveryMessage="客户文案\nAD-AAAA-BBBB-CCCC-DDDD"
      />,
    );

    expect(markup).not.toContain("复制给客户");
    expect(markup).toContain('aria-label="复制纯卡密"');
    expect(markup).toContain('aria-label="复制客户文案"');
    expect(markup.match(/type="button"/g)).toHaveLength(2);
  });
});
