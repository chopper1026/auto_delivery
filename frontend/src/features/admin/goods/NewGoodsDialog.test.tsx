import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { adminApi } from "@/api/admin";
import { NewGoodsDialog } from "./NewGoodsDialog";

vi.mock("@/api/admin", () => ({
  adminApi: {
    createGoods: vi.fn(async () => ({ id: "goods-1", items: [] })),
  },
}));

function renderWithQueryClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("NewGoodsDialog", () => {
  it("creates text goods with fields ordered name, text content, then note", async () => {
    const user = userEvent.setup();
    const createGoods = vi.mocked(adminApi.createGoods);
    createGoods.mockClear();
    const { container } = renderWithQueryClient(<NewGoodsDialog />);

    await user.click(screen.getByRole("button", { name: "新增货物" }));

    const form = container.querySelector("form");
    const labels = Array.from(form?.querySelectorAll("label") ?? []).map((label) => label.textContent);
    expect(labels).toEqual(["名称", "文本内容", "备注"]);

    await user.type(screen.getByLabelText("名称"), "文本商品");
    await user.type(screen.getByLabelText("文本内容"), "交付内容");
    await user.type(screen.getByLabelText("备注"), "客户备注");
    await user.click(screen.getByRole("button", { name: "添加文本货物" }));

    await waitFor(() => {
      expect(createGoods).toHaveBeenCalled();
    });
    expect(createGoods.mock.calls[0][0]).toEqual({
      name: "文本商品",
      type: "TEXT",
      textContent: "交付内容",
      note: "客户备注",
    });
  });
});
