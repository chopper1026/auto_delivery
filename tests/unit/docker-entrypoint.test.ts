import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("docker entrypoint", () => {
  it("runs migrations and initializes the first admin before starting the standalone app", async () => {
    const script = await readFile("scripts/docker-entrypoint.sh", "utf8");

    const migrateIndex = script.indexOf("./node_modules/.bin/prisma migrate deploy");
    const initAdminIndex = script.indexOf("node scripts/init-admin-runtime.mjs");
    const startIndex = script.indexOf("exec node server.js");

    expect(migrateIndex).toBeGreaterThanOrEqual(0);
    expect(initAdminIndex).toBeGreaterThan(migrateIndex);
    expect(startIndex).toBeGreaterThan(initAdminIndex);
  });
});
