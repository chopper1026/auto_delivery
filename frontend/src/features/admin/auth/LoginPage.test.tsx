import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LoginPage } from "./LoginPage";
import styles from "./login.module.css";

vi.mock("@/features/public/shared/AnimatedBrandWord", () => ({
  AnimatedBrandWord: ({ className }: { className?: string }) => (
    <span className={className} data-testid="animated-brand-word">
      AutoDelivery
    </span>
  ),
}));

afterEach(() => {
  cleanup();
});

function renderLoginPage() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("LoginPage", () => {
  it("renders the animated brand word used by the public pages", () => {
    renderLoginPage();

    expect(screen.getByTestId("animated-brand-word").textContent).toBe("AutoDelivery");
  });

  it("uses the expanded brand heading spacing", () => {
    renderLoginPage();

    expect(screen.getByRole("heading", { name: "AutoDelivery" }).className.split(/\s+/)).toContain(styles.brandHeading);
  });

  it("reserves leading space for field icons", () => {
    renderLoginPage();

    const username = screen.getByLabelText("账号");
    const password = screen.getByLabelText("密码");

    expect(username.className.split(/\s+/)).toContain(styles.iconInput);
    expect(password.className.split(/\s+/)).toContain(styles.iconInput);
  });
});
