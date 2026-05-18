import { prisma } from "@/lib/db";

export async function consumeRateLimit(input: {
  scope: string;
  identifier: string;
  limit: number;
  windowMs: number;
  now?: Date;
}): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const now = input.now ?? new Date();
  const windowStartMs = Math.floor(now.getTime() / input.windowMs) * input.windowMs;
  const windowStart = new Date(windowStartMs);
  const resetAt = new Date(windowStartMs + input.windowMs);

  const bucket = await prisma.rateLimitBucket.upsert({
    where: {
      scope_identifier_windowStart: {
        scope: input.scope,
        identifier: input.identifier,
        windowStart,
      },
    },
    create: {
      scope: input.scope,
      identifier: input.identifier,
      windowStart,
      count: 1,
    },
    update: {
      count: { increment: 1 },
    },
  });

  const remaining = Math.max(input.limit - bucket.count, 0);
  return {
    allowed: bucket.count <= input.limit,
    remaining,
    resetAt,
  };
}
