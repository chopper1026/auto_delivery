import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { getRequestMeta } from "@/lib/request-meta";
import { getSessionTokenFromCookie } from "@/lib/admin/auth";
import { getAdminBySessionToken } from "@/lib/security/session";
import { validateCsrfToken } from "@/lib/security/csrf";

export async function requireAdminAction(formData: FormData) {
  const sessionToken = await getSessionTokenFromCookie();
  const csrfToken = String(formData.get("csrfToken") ?? "");

  if (!sessionToken || !(await validateCsrfToken(sessionToken, csrfToken))) {
    throw new Error("Invalid admin request.");
  }

  const admin = await getAdminBySessionToken(sessionToken);
  if (!admin) {
    throw new Error("Admin session expired.");
  }

  return { admin, meta: await getRequestMeta(), sessionToken };
}

export async function writeAdminAuditLog(input: {
  adminUserId: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress: string;
  userAgent: string;
}) {
  await prisma.adminAuditLog.create({
    data: {
      adminUserId: input.adminUserId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadataJson: input.metadata,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    },
  });
}
