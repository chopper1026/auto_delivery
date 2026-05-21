import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};

describe("package scripts", () => {
  it("starts the Go backend without requiring Docker when local services are already running", () => {
    const script = packageJson.scripts["dev:backend"];

    expect(script).toContain("[ -f .env ]");
    expect(script).toContain("set -a");
    expect(script).toContain(". ./.env");
    expect(script).toContain("cd backend");
    expect(script).toContain("STATIC_DIR=../frontend/dist go run ./cmd/server");
    expect(script).not.toContain("docker compose");
  });

  it("keeps Docker service startup as an explicit opt-in command", () => {
    const script = packageJson.scripts["dev:backend:docker"];

    expect(script).toContain("docker compose up -d postgres redis");
    expect(script).toContain("npm run dev:backend");
  });

  it("provides an explicit command that starts only the Docker database", () => {
    const script = packageJson.scripts["dev:db"];

    expect(script).toBe("docker compose up -d postgres");
  });
});
