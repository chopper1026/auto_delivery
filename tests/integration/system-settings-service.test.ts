import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_CARD_KEY_DELIVERY_MESSAGE_TEMPLATE,
  getCardKeyDeliveryMessageTemplate,
  getServiceBaseUrl,
  updateCardKeyDeliveryMessageTemplate,
  updateServiceBaseUrl,
} from "@/lib/settings/service";
import { env } from "@/lib/env";
import { resetDatabase } from "../helpers/db";

afterEach(async () => {
  await resetDatabase();
});

describe("system settings service", () => {
  it("uses APP_BASE_URL until a service address is configured", async () => {
    await expect(getServiceBaseUrl()).resolves.toBe(env.APP_BASE_URL);
  });

  it("persists the configured service address without trailing slashes", async () => {
    await updateServiceBaseUrl(" https://delivery.example.com/path/// ");

    await expect(getServiceBaseUrl()).resolves.toBe("https://delivery.example.com/path");
  });

  it("uses the default customer message template until a preference is configured", async () => {
    await expect(getCardKeyDeliveryMessageTemplate()).resolves.toBe(DEFAULT_CARD_KEY_DELIVERY_MESSAGE_TEMPLATE);
  });

  it("persists the configured customer message template", async () => {
    await updateCardKeyDeliveryMessageTemplate("客户您好：\n{{cardKey}}\n{{redeemUrl}}");

    await expect(getCardKeyDeliveryMessageTemplate()).resolves.toBe("客户您好：\n{{cardKey}}\n{{redeemUrl}}");
  });
});
