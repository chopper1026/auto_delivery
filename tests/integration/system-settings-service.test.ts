import { afterEach, describe, expect, it } from "vitest";
import { getServiceBaseUrl, updateServiceBaseUrl } from "@/lib/settings/service";
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
});
