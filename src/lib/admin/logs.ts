import { prisma } from "@/lib/db";

export async function getAdminLogs(input: {
  type?: "redemptions" | "downloads" | "admin";
  query?: string;
  take?: number;
}) {
  const take = input.take ?? 50;
  const query = input.query?.trim();
  const cardOrIpFilter = query
    ? {
        OR: [
          { ipAddress: { contains: query, mode: "insensitive" as const } },
          { userAgent: { contains: query, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [redemptions, downloads, adminLogs] = await Promise.all([
    input.type && input.type !== "redemptions"
      ? Promise.resolve([])
      : prisma.redemption.findMany({
          where: cardOrIpFilter,
          include: {
            goods: { select: { name: true } },
            cardKey: { select: { keyMask: true } },
          },
          orderBy: { redeemedAt: "desc" },
          take,
        }),
    input.type && input.type !== "downloads"
      ? Promise.resolve([])
      : prisma.downloadLog.findMany({
          where: cardOrIpFilter,
          include: {
            redemption: {
              include: {
                goods: { select: { name: true } },
                cardKey: { select: { keyMask: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take,
        }),
    input.type && input.type !== "admin"
      ? Promise.resolve([])
      : prisma.adminAuditLog.findMany({
          where: query
            ? {
                OR: [
                  { ipAddress: { contains: query, mode: "insensitive" } },
                  { action: { contains: query, mode: "insensitive" } },
                  { entityType: { contains: query, mode: "insensitive" } },
                ],
              }
            : {},
          orderBy: { createdAt: "desc" },
          take,
        }),
  ]);

  return { redemptions, downloads, adminLogs };
}
