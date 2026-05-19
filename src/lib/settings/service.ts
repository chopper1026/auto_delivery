import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import {
  DEFAULT_CARD_KEY_DELIVERY_MESSAGE_TEMPLATE,
  normalizeServiceBaseUrl,
} from "@/lib/card-keys/delivery-message";

export { DEFAULT_CARD_KEY_DELIVERY_MESSAGE_TEMPLATE };

const serviceBaseUrlKey = "serviceBaseUrl";
const cardKeyDeliveryMessageTemplateKey = "cardKeyDeliveryMessageTemplate";

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

export async function getCardKeyDeliveryMessageTemplate(): Promise<string> {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: cardKeyDeliveryMessageTemplateKey },
    select: { value: true },
  });

  return setting?.value ?? DEFAULT_CARD_KEY_DELIVERY_MESSAGE_TEMPLATE;
}

export async function updateCardKeyDeliveryMessageTemplate(value: string): Promise<string> {
  const normalized = value.trim() || DEFAULT_CARD_KEY_DELIVERY_MESSAGE_TEMPLATE;

  await prisma.systemSetting.upsert({
    where: { key: cardKeyDeliveryMessageTemplateKey },
    create: { key: cardKeyDeliveryMessageTemplateKey, value: normalized },
    update: { value: normalized },
  });

  return normalized;
}
