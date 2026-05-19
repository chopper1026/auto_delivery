import { describe, expect, it } from "vitest";
import { formatCardKeyInput } from "@/lib/card-key-input";

describe("card key input formatting", () => {
  it("normalizes pasted and typed card keys for redemption", () => {
    expect(formatCardKeyInput("ad abcd ef12 3456 7890")).toBe("AD-ABCD-EF12-3456-7890");
    expect(formatCardKeyInput("abcd ef12 3456 7890")).toBe("AD-ABCD-EF12-3456-7890");
    expect(formatCardKeyInput("AD-ABCD-EF12-3456-7890-extra")).toBe("AD-ABCD-EF12-3456-7890");
  });

  it("keeps partial prefix input predictable while typing", () => {
    expect(formatCardKeyInput("")).toBe("");
    expect(formatCardKeyInput("a")).toBe("A");
    expect(formatCardKeyInput("ad")).toBe("AD");
    expect(formatCardKeyInput("adx")).toBe("AD-X");
  });
});
