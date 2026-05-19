import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { normalizeServiceBaseUrl } from "@/lib/card-keys/delivery-message";

const serviceBaseUrlKey = "serviceBaseUrl";

export async function getServiceBaseUrl(): Promise<string> {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: serviceBaseUrlKey },
    select: { value: true },
  });

  return setting?.value ?? normalizeServiceBaseUrl(env.APP_BASE_URL);
}

export async function updateServiceBaseUrl(value: string): Promise<string> {
  const normalized = normalizeServiceBaseUrl(value);

  await prisma.systemSetting.upsert({
    where: { key: serviceBaseUrlKey },
    create: { key: serviceBaseUrlKey, value: normalized },
    update: { value: normalized },
  });

  return normalized;
}
