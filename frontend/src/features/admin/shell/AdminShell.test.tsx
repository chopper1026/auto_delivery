import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminShell } from "./AdminShell";

vi.mock("@/features/public/shared/AnimatedBrandWord", () => ({
  AnimatedBrandWord: ({ className }: { className?: string }) => (
    <span className={className} data-testid="animated-brand-word">
      AutoDelivery
    </span>
  ),
}));

vi.mock("@/api", () => ({
  api: {
    session: vi.fn(async () => ({ admin: { id: "admin-1", username: "admin" }, csrfToken: "csrf-token" })),
    logout: vi.fn(async () => ({ ok: true })),
  },
  clearCsrfToken: vi.fn(),
  setCsrfToken: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderAdminShell(path: string) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/admin" element={<AdminShell />}>
            <Route index element={<div>工作台内容</div>} />
            <Route path="goods" element={<div>货物内容</div>} />
            <Route path="cards" element={<div>卡密内容</div>} />
            <Route path="logs" element={<div>日志内容</div>} />
            <Route path="settings" element={<div>设置内容</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("AdminShell", () => {
  it.each([
    ["/admin", "工作台"],
    ["/admin/goods", "货物"],
    ["/admin/cards", "卡密"],
    ["/admin/logs", "日志"],
    ["/admin/settings", "设置"],
  ])("renders the nav label %s as the only top module title", async (path, label) => {
    renderAdminShell(path);

    expect(await screen.findByRole("heading", { name: label, level: 1 })).toBeTruthy();
  });

  it("moves the admin identity to the right side of the top bar with a default avatar", async () => {
    renderAdminShell("/admin/goods");

    await screen.findByRole("heading", { name: "货物", level: 1 });

    expect(screen.queryByText("当前管理员")).toBeNull();

    const topbar = screen.getByRole("banner", { name: "管理顶栏" });
    const account = within(topbar).getByLabelText("管理员账号");
    expect(within(account).getByText("admin")).toBeTruthy();
    expect(within(account).getByTestId("default-admin-avatar")).toBeTruthy();
  });
});
