import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const globalStyles = readFileSync("frontend/src/styles.css", "utf8");
const publicPageStyles = readFileSync("frontend/src/features/public/shared/public-pages.module.css", "utf8");

const zcoolSubsetFiles = [
  "04003fc9c80a21bc-s.17phyi71dweo3.woff2",
  "4f92662a5cf3603f-s.0-7sz-wqp005a.woff2",
  "b7b6e37685e3fe51-s.0_r8o8if_5ium.woff2",
  "bf75eea936e7a09d-s.0i9tfq38q09-i.woff2",
  "c764afa822c1c406-s.0cpl~lzo4cw8o.woff2",
  "cd25380c8ffc55f7-s.0bvp-4gmgrdnh.woff2",
];

describe("redeem artwork font", () => {
  it("loads the original ZCOOL XiaoWei font used by main for card artwork text", () => {
    expect(globalStyles).toContain('font-family: "ZCOOL XiaoWei";');
    expect(globalStyles).toContain('--font-card-title: "ZCOOL XiaoWei";');

    for (const fileName of zcoolSubsetFiles) {
      expect(globalStyles).toContain(`/fonts/zcool-xiaowei/${fileName}`);
      expect(existsSync(`public/fonts/zcool-xiaowei/${fileName}`)).toBe(true);
    }
  });

  it("applies the card artwork font to title, label, and redeem button text", () => {
    expect(publicPageStyles).toMatch(/\.redeemTitle\s*\{[^}]*font-family:\s*var\(--font-card-title\)/s);
    expect(publicPageStyles).toMatch(/\.redeemText\s*\{[^}]*font-family:\s*var\(--font-card-title\)/s);
    expect(publicPageStyles).toMatch(/\.redeemButton\.redeemButton\s*\{[^}]*font-family:\s*var\(--font-card-title\)/s);
  });
});
