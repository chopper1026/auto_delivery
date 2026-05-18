import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { hashLookupSecret } from "@/lib/security/hash";
import { addDays } from "@/lib/time";

export async function createAdminSession(
  adminUserId: string,
  meta: { ipAddress: string; userAgent: string },
): Promise<{ token: string; expiresAt: Date }> {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = addDays(new Date(), 7);

  await prisma.adminSession.create({
    data: {
      tokenHash: hashLookupSecret(token),
      adminUserId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export async function getAdminBySessionToken(token: string): Promise<{ id: string; username: string } | null> {
  const session = await prisma.adminSession.findUnique({
    where: { tokenHash: hashLookupSecret(token) },
    include: { adminUser: { select: { id: true, username: true } } },
  });

  if (!session || session.expiresAt <= new Date()) {
    return null;
  }

  return session.adminUser;
}

export async function revokeAdminSession(token: string): Promise<void> {
  await prisma.adminSession.deleteMany({
    where: { tokenHash: hashLookupSecret(token) },
  });
}
