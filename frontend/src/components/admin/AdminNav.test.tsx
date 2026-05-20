import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AdminNav } from "./AdminNav";

describe("AdminNav", () => {
  it("renders the five admin destinations", () => {
    render(
      <MemoryRouter>
        <AdminNav />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: /工作台/ }).getAttribute("href")).toBe("/admin");
    expect(screen.getByRole("link", { name: /货物/ }).getAttribute("href")).toBe("/admin/goods");
    expect(screen.getByRole("link", { name: /卡密/ }).getAttribute("href")).toBe("/admin/cards");
    expect(screen.getByRole("link", { name: /日志/ }).getAttribute("href")).toBe("/admin/logs");
    expect(screen.getByRole("link", { name: /设置/ }).getAttribute("href")).toBe("/admin/settings");
  });
});
