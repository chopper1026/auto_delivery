import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { getAdminBySessionToken } from "@/lib/security/session";

export async function getSessionTokenFromCookie() {
  const cookieStore = await cookies();
  return cookieStore.get(env.SESSION_COOKIE_NAME)?.value ?? null;
}

export async function requireAdminSession() {
  const token = await getSessionTokenFromCookie();
  if (!token) redirect("/admin/login");

  const admin = await getAdminBySessionToken(token);
  if (!admin) redirect("/admin/login");

  return { admin, token };
}
