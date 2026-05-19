import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

export function isSafeTestDatabaseUrl(databaseUrl: string, nodeEnv = process.env.NODE_ENV): boolean {
  if (nodeEnv !== "test") return false;

  try {
    const url = new URL(databaseUrl);
    const databaseName = url.pathname.replace(/^\//, "");
    const schemaName = url.searchParams.get("schema") ?? "";
    return databaseName.includes("test") || schemaName.includes("test");
  } catch {
    return false;
  }
}

export async function resetDatabase() {
  if (!isSafeTestDatabaseUrl(env.DATABASE_URL, env.NODE_ENV)) {
    throw new Error("Refusing to reset a non-test database. Set TEST_DATABASE_URL or use a DATABASE_URL with a test database/schema.");
  }

  await prisma.downloadLog.deleteMany();
  await prisma.redemptionFile.deleteMany();
  await prisma.goodsFile.deleteMany();
  await prisma.redemption.deleteMany();
  await prisma.cardKey.deleteMany();
  await prisma.goods.deleteMany();
  await prisma.adminSession.deleteMany();
  await prisma.adminAuditLog.deleteMany();
  await prisma.rateLimitBucket.deleteMany();
  await prisma.adminUser.deleteMany();
}
