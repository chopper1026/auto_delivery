import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { resetDatabase } from "../helpers/db";
import { createAdminSession, getAdminBySessionToken, revokeAdminSession } from "@/lib/security/session";
import { verifyPassword } from "@/lib/security/password";
import { bootstrapInitialAdmin } from "../../scripts/init-admin";

afterEach(async () => {
  await resetDatabase();
});

describe("admin auth", () => {
  it("bootstraps one initial admin", async () => {
    await bootstrapInitialAdmin();
    await bootstrapInitialAdmin();
    const admins = await prisma.adminUser.findMany();

    expect(admins).toHaveLength(1);
    expect(admins[0].username).toBe(process.env.ADMIN_USERNAME);
    expect(await verifyPassword(admins[0].passwordHash, process.env.ADMIN_PASSWORD || "")).toBe(true);
  });

  it("creates, reads, and revokes sessions by plaintext token", async () => {
    const admin = await prisma.adminUser.create({
      data: { username: "admin", passwordHash: "hash" },
    });
    const session = await createAdminSession(admin.id, {
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
    });
    const found = await getAdminBySessionToken(session.token);

    expect(found?.id).toBe(admin.id);

    await revokeAdminSession(session.token);

    expect(await getAdminBySessionToken(session.token)).toBeNull();
  });
});
