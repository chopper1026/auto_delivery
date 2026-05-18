import crypto from "node:crypto";
import { env } from "@/lib/env";

export function hashLookupSecret(secret: string) {
  return crypto.createHmac("sha256", env.SECRET_PEPPER).update(secret.trim()).digest("hex");
}

export function maskSecret(secret: string) {
  const parts = secret.trim().split("-");
  if (parts.length < 3) return "****";
  return [parts[0], ...parts.slice(1, -1).map(() => "****"), parts.at(-1)].join("-");
}
