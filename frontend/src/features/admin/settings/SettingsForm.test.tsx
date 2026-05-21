import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SettingsForm } from "./SettingsForm";

function renderWithQueryClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("SettingsForm", () => {
  it("renders service URL and delivery message template fields", () => {
    renderWithQueryClient(
      <SettingsForm
        serviceBaseUrl="https://delivery.example.com"
        cardKeyDeliveryMessageTemplate={"兑换地址：{{redeemUrl}}\n卡密：{{cardKey}}"}
      />,
    );

    expect((screen.getByLabelText("服务地址") as HTMLInputElement).value).toBe("https://delivery.example.com");
    expect((screen.getByLabelText("客户文案模板") as HTMLTextAreaElement).value).toContain("{{cardKey}}");
    expect(screen.getByRole("button", { name: "保存设置" })).toBeTruthy();
  });
});
