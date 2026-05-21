import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CardKeyForm, GeneratedCardKeyResult } from "./CardKeyForm";

function renderWithQueryClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("card key form result UI", () => {
  it("renders plaintext key, key mask, customer message, and icon copy buttons", () => {
    const markup = renderToStaticMarkup(
      <GeneratedCardKeyResult
        plaintextKey="AD-AAAA-BBBB-CCCC-DDDD"
        keyMask="AD-****-****-****-DDDD"
        deliveryMessage="客户文案\nAD-AAAA-BBBB-CCCC-DDDD"
      />,
    );

    expect(markup).not.toContain("复制给客户");
    expect(markup).toContain("AD-AAAA-BBBB-CCCC-DDDD");
    expect(markup).toContain("AD-****-****-****-DDDD");
    expect(markup).toContain('aria-label="复制纯卡密"');
    expect(markup).toContain('aria-label="复制客户文案"');
    expect(markup.match(/type="button"/g)).toHaveLength(2);
  });

  it("requires a bounded file quantity for selected file goods", () => {
    renderWithQueryClient(
      <CardKeyForm
        goods={[
          {
            id: "file-ready",
            name: "CPA 文件包",
            note: "三天有效",
            type: "FILE",
            inventory: { total: 12, available: 7, reserved: 2, redeemed: 3 },
          },
        ]}
      />,
    );

    const fileQuantity = screen.getByLabelText("文件数量") as HTMLInputElement;
    expect(fileQuantity.getAttribute("min")).toBe("1");
    expect(fileQuantity.getAttribute("max")).toBe("7");
    expect(fileQuantity.hasAttribute("required")).toBe(true);
    expect(fileQuantity.value).toBe("1");
  });
});
