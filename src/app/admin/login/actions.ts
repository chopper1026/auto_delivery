"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { getRequestMeta } from "@/lib/request-meta";
import { createAdminSession } from "@/lib/security/session";
import { verifyPassword } from "@/lib/security/password";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { rotateCsrfToken } from "@/lib/security/csrf";

export type LoginState = {
  error?: string;
};

export async function loginAction(_previousState: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const meta = await getRequestMeta();

  const ipLimit = await consumeRateLimit({
    scope: "admin-login-ip",
    identifier: meta.ipAddress,
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });
  const userLimit = await consumeRateLimit({
    scope: "admin-login-user",
    identifier: username || "blank",
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });

  if (!ipLimit.allowed || !userLimit.allowed) {
    return { error: "登录失败，请稍后再试。" };
  }

  const admin = await prisma.adminUser.findUnique({ where: { username } });
  if (!admin || !(await verifyPassword(admin.passwordHash, password))) {
    return { error: "账号或密码错误。" };
  }

  const session = await createAdminSession(admin.id, meta);
  await rotateCsrfToken(session.token);
  await prisma.adminUser.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  });

  const cookieStore = await cookies();
  cookieStore.set(env.SESSION_COOKIE_NAME, session.token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: session.expiresAt,
  });

  redirect("/admin/enter");
}
