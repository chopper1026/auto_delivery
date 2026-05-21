import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync("frontend/src/features/public/shared/public-pages.module.css", "utf8");

describe("redeem card key input styles", () => {
  it("reserves enough leading space for the key icon", () => {
    expect(styles).toContain(".inputWrap .cardKeyInput.cardKeyInput");
    expect(styles).toContain("padding-left: 3rem;");
  });
});
