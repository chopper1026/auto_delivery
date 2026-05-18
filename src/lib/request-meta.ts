import { headers } from "next/headers";

export async function getRequestMeta() {
  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for")?.split(",")[0]?.trim();

  return {
    ipAddress: forwardedFor || h.get("x-real-ip") || "unknown",
    userAgent: h.get("user-agent") || "unknown",
  };
}
