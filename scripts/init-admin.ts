import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { hashPassword } from "@/lib/security/password";

export async function bootstrapInitialAdmin() {
  const existing = await prisma.adminUser.count();
  if (existing > 0) return;

  await prisma.adminUser.create({
    data: {
      username: env.ADMIN_USERNAME,
      passwordHash: await hashPassword(env.ADMIN_PASSWORD),
    },
  });
}

if (process.argv[1]?.endsWith("init-admin.ts")) {
  bootstrapInitialAdmin()
    .then(async () => prisma.$disconnect())
    .catch(async (error) => {
      console.error(error);
      await prisma.$disconnect();
      process.exit(1);
    });
}
