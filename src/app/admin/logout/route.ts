import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { revokeAdminSession } from "@/lib/security/session";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(env.SESSION_COOKIE_NAME)?.value;
  if (token) {
    await revokeAdminSession(token);
  }
  cookieStore.delete(env.SESSION_COOKIE_NAME);
  redirect("/admin/login");
}
