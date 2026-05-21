import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appSource = readFileSync("frontend/src/App.tsx", "utf8");

describe("route code splitting", () => {
  it("lazy-loads admin and public pages instead of static importing every page into the root bundle", () => {
    expect(appSource).toContain("lazy(");
    expect(appSource).toContain("<Suspense");
    expect(appSource).toContain('import("./features/admin/shell/AdminShell")');
    expect(appSource).toContain('import("./features/admin/goods/GoodsPage")');
    expect(appSource).not.toContain('from "./pages/admin/');
    expect(appSource).not.toContain('import("./pages/admin/');
  });
});
