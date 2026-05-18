import { describe, expect, it } from "vitest";
import { GoodsType } from "@/generated/prisma/enums";

describe("Prisma generated client", () => {
  it("exports expected enums", () => {
    expect(GoodsType.TEXT).toBe("TEXT");
    expect(GoodsType.FILE).toBe("FILE");
  });
});
