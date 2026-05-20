import { describe, expect, it } from "vitest";
import {
  applyCardKeyInputData,
  formatCardKeyInput,
  isAllowedCardKey,
  isAllowedCardKeyCompositionInput,
  isAllowedCardKeyInputData,
} from "./cardKey";

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

  it("allows only ASCII card-key input data before it reaches the field", () => {
    expect(isAllowedCardKeyInputData("AD-ab12 34-56")).toBe(true);
    expect(isAllowedCardKeyInputData(null)).toBe(true);
    expect(isAllowedCardKeyInputData("中文")).toBe(false);
    expect(isAllowedCardKeyInputData("AD中文")).toBe(false);
  });

  it("blocks IME composition input even when the composing text is ASCII pinyin", () => {
    expect(isAllowedCardKeyCompositionInput({ inputType: "insertCompositionText", isComposing: true })).toBe(false);
    expect(isAllowedCardKeyCompositionInput({ inputType: "insertFromComposition", isComposing: false })).toBe(false);
    expect(isAllowedCardKeyCompositionInput({ inputType: "insertText", isComposing: false })).toBe(true);
  });

  it("applies typed or pasted ASCII data through the card-key formatter", () => {
    expect(applyCardKeyInputData({ value: "AD-ABCD", data: "e", selectionStart: 7, selectionEnd: 7 })).toBe("AD-ABCD-E");
    expect(applyCardKeyInputData({ value: "AD-ABCD-EF12", data: "zz", selectionStart: 8, selectionEnd: 10 })).toBe("AD-ABCD-ZZ12");
    expect(applyCardKeyInputData({ value: "", data: "中文AD12", selectionStart: 0, selectionEnd: 0 })).toBe("AD-12");
  });

  it("accepts fully formatted card keys", () => {
    expect(isAllowedCardKey("AD-ABCD-EFGH-JKLM-NPQR")).toBe(true);
  });
});
