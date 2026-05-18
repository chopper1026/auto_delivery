import { describe, expect, it } from "vitest";
import { generatePlaintextCardKey } from "@/lib/card-keys/generator";

describe("card key generator", () => {
  it("generates AD-prefixed grouped uppercase keys", () => {
    const key = generatePlaintextCardKey();

    expect(key).toMatch(/^AD-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  });
});
