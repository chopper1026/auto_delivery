import { prisma } from "@/lib/db";

export async function resetDatabase() {
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
