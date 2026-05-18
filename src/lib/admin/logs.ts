import { prisma } from "@/lib/db";

export async function getAdminLogs(input: {
  type?: "redemptions" | "downloads" | "admin";
  query?: string;
  skip?: number;
  take?: number;
}) {
  const take = input.take ?? 50;
  const skip = input.skip ?? 0;
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
          skip,
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
          skip,
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
          skip,
          take,
        }),
  ]);

  return { redemptions, downloads, adminLogs };
}

export async function countAdminLogs(input: {
  type: "redemptions" | "downloads" | "admin";
  query?: string;
}) {
  const query = input.query?.trim();
  const cardOrIpFilter = query
    ? {
        OR: [
          { ipAddress: { contains: query, mode: "insensitive" as const } },
          { userAgent: { contains: query, mode: "insensitive" as const } },
        ],
      }
    : {};

  if (input.type === "redemptions") {
    return prisma.redemption.count({ where: cardOrIpFilter });
  }

  if (input.type === "downloads") {
    return prisma.downloadLog.count({ where: cardOrIpFilter });
  }

  return prisma.adminAuditLog.count({
    where: query
      ? {
          OR: [
            { ipAddress: { contains: query, mode: "insensitive" } },
            { action: { contains: query, mode: "insensitive" } },
            { entityType: { contains: query, mode: "insensitive" } },
          ],
        }
      : {},
  });
}
