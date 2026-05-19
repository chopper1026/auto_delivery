import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("docker entrypoint", () => {
  it("runs migrations and initializes the first admin before starting the app", async () => {
    const script = await readFile("scripts/docker-entrypoint.sh", "utf8");

    const migrateIndex = script.indexOf("npx prisma migrate deploy");
    const initAdminIndex = script.indexOf("npm run init:admin");
    const startIndex = script.indexOf("exec npm run start");

    expect(migrateIndex).toBeGreaterThanOrEqual(0);
    expect(initAdminIndex).toBeGreaterThan(migrateIndex);
    expect(startIndex).toBeGreaterThan(initAdminIndex);
  });
});
