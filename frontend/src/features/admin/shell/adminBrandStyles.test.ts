import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync("frontend/src/styles.css", "utf8");

describe("admin sidebar brand artwork styles", () => {
  it("keeps the animated brand word compact enough for the sidebar", () => {
    expect(styles).toContain("width: min(8.4rem, 100%);");
    expect(styles).toContain("min-width: min(8.4rem, 100%);");
    expect(styles).toContain("white-space: nowrap;");
    expect(styles).toContain(".admin-sidebar-brand-word [data-tegaki=\"root\"]");
    expect(styles).toContain("font-size: 0.84em;");
  });
});
