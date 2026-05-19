import { spawnSync } from "node:child_process";
import "dotenv/config";

function deriveTestDatabaseUrl(): string {
  const configured = process.env.TEST_DATABASE_URL?.trim();
  if (configured) return configured;

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to derive a test database URL.");
  }

  const url = new URL(databaseUrl);
  const currentSchema = url.searchParams.get("schema");
  url.searchParams.set("schema", currentSchema && currentSchema !== "public" ? `${currentSchema}_test` : "test");
  const testDatabaseUrl = url.toString();

  if (testDatabaseUrl === databaseUrl) {
    throw new Error("Refusing to run tests because the derived test database URL matches DATABASE_URL.");
  }

  return testDatabaseUrl;
}

function run(command: string, args: string[], env: NodeJS.ProcessEnv) {
  const result = spawnSync(command, args, {
    env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const testDatabaseUrl = deriveTestDatabaseUrl();
const env: NodeJS.ProcessEnv = {
  ...process.env,
  NODE_ENV: "test",
  DATABASE_URL: testDatabaseUrl,
  TEST_DATABASE_URL: testDatabaseUrl,
  STORAGE_ROOT: process.env.TEST_STORAGE_ROOT || "./storage/test",
};

run("npx", ["prisma", "migrate", "deploy"], env);
run("npx", ["vitest", ...process.argv.slice(2)], env);
