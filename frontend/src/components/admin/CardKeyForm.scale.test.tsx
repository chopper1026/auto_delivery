import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("card goods picker scale", () => {
  it("does not rely on the first 100 goods from the paginated list", () => {
    const cardsPage = readFileSync("frontend/src/pages/admin/CardsPage.tsx", "utf8");
    expect(cardsPage).not.toContain("pageSize: 100");
    expect(cardsPage).toContain("cardGoodsOptions");
  });
});
