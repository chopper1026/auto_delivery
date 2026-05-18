import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { hashLookupSecret } from "@/lib/security/hash";

export async function rotateCsrfToken(sessionToken: string): Promise<string> {
  const csrfToken = crypto.randomBytes(32).toString("base64url");
  await prisma.adminSession.updateMany({
    where: { tokenHash: hashLookupSecret(sessionToken) },
    data: { csrfTokenHash: hashLookupSecret(csrfToken) },
  });
  return csrfToken;
}

export async function validateCsrfToken(sessionToken: string, submittedToken: string): Promise<boolean> {
  const session = await prisma.adminSession.findUnique({
    where: { tokenHash: hashLookupSecret(sessionToken) },
    select: { csrfTokenHash: true, expiresAt: true },
  });

  return Boolean(
    session?.csrfTokenHash &&
      session.expiresAt > new Date() &&
      session.csrfTokenHash === hashLookupSecret(submittedToken),
  );
}
