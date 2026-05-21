import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminNav } from "./AdminNav";

vi.mock("@/components/brand/AnimatedBrandWord", () => ({
  AnimatedBrandWord: ({ className }: { className?: string }) => (
    <span className={className} data-testid="animated-brand-word">
      AutoDelivery
    </span>
  ),
}));

afterEach(() => {
  cleanup();
});

describe("AdminNav", () => {
  it("renders the five admin destinations", () => {
    render(
      <MemoryRouter>
        <AdminNav onLogout={() => undefined} />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: /工作台/ }).getAttribute("href")).toBe("/admin");
    expect(screen.getByRole("link", { name: /货物/ }).getAttribute("href")).toBe("/admin/goods");
    expect(screen.getByRole("link", { name: /卡密/ }).getAttribute("href")).toBe("/admin/cards");
    expect(screen.getByRole("link", { name: /日志/ }).getAttribute("href")).toBe("/admin/logs");
    expect(screen.getByRole("link", { name: /设置/ }).getAttribute("href")).toBe("/admin/settings");
  });

  it("renders the brand artwork and keeps utility actions inside the sidebar", () => {
    const logout = vi.fn();

    render(
      <MemoryRouter>
        <AdminNav onLogout={logout} />
      </MemoryRouter>,
    );

    const sidebar = screen.getByRole("complementary", { name: "管理导航" });
    const utilityActions = within(sidebar).getByLabelText("快捷操作");
    const redeemLink = within(utilityActions).getByRole("link", { name: /打开兑换页/ });

    expect(within(sidebar).getByTestId("animated-brand-word").textContent).toBe("AutoDelivery");
    expect(redeemLink.getAttribute("href")).toBe("/");
    expect(redeemLink.getAttribute("target")).toBe("_blank");
    expect(redeemLink.getAttribute("rel")).toBe("noreferrer");
    within(utilityActions).getByRole("button", { name: /退出登录/ }).click();
    expect(logout).toHaveBeenCalledTimes(1);
  });
});
