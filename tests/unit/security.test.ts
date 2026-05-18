import { describe, expect, it } from "vitest";
import { addDays, calculateExpiresAt } from "@/lib/time";
import { hashLookupSecret, maskSecret } from "@/lib/security/hash";
import { hashPassword, verifyPassword } from "@/lib/security/password";

describe("security helpers", () => {
  it("hashes lookup secrets deterministically without returning plaintext", () => {
    const one = hashLookupSecret("AD-AAAA-BBBB-CCCC");
    const two = hashLookupSecret("AD-AAAA-BBBB-CCCC");
    expect(one).toBe(two);
    expect(one).not.toContain("AAAA");
  });

  it("masks grouped secrets", () => {
    expect(maskSecret("AD-AAAA-BBBB-CCCC")).toBe("AD-****-****-CCCC");
  });

  it("hashes and verifies passwords", async () => {
    const hash = await hashPassword("strong-password-123");
    expect(await verifyPassword(hash, "strong-password-123")).toBe(true);
    expect(await verifyPassword(hash, "wrong-password")).toBe(false);
  });

  it("calculates supported expirations", () => {
    const base = new Date("2026-05-18T00:00:00.000Z");
    expect(calculateExpiresAt("1d", base)?.toISOString()).toBe(addDays(base, 1).toISOString());
    expect(calculateExpiresAt("3d", base)?.toISOString()).toBe(addDays(base, 3).toISOString());
    expect(calculateExpiresAt("7d", base)?.toISOString()).toBe(addDays(base, 7).toISOString());
    expect(calculateExpiresAt("never", base)).toBeNull();
  });
});
