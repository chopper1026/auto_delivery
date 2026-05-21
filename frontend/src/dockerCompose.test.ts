import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("docker compose", () => {
  it("exposes Docker Postgres to the host for local Go backend development", () => {
    const compose = readFileSync("docker-compose.yml", "utf8");
    const envExample = readFileSync(".env.example", "utf8");

    expect(compose).toContain("${POSTGRES_PORT:-15432}:5432");
    expect(envExample).toContain('POSTGRES_PORT="15432"');
    expect(envExample).toContain("@localhost:15432/auto_delivery");
  });
});
