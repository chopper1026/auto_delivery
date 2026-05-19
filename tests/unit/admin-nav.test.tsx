import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AdminNav } from "@/components/admin/admin-nav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin",
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    prefetch,
    children,
    ...props
  }: {
    href: string;
    prefetch?: boolean;
    children: React.ReactNode;
  }) => (
    <a href={href} data-prefetch={String(prefetch)} {...props}>
      {children}
    </a>
  ),
}));

describe("admin navigation", () => {
  it("disables prefetch for logout links because logout is a state-changing GET route", () => {
    const markup = renderToStaticMarkup(<AdminNav />);
    const logoutLinks = markup.match(/href="\/admin\/logout"[^>]*data-prefetch="false"/g);

    expect(logoutLinks).toHaveLength(2);
  });
});
