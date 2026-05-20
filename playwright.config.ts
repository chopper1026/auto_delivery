import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.E2E_PORT ?? "18081");
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${port}`;
const databaseURL =
  process.env.E2E_DATABASE_URL ??
  process.env.TEST_DATABASE_URL ??
  "postgresql://auto_delivery:auto_delivery@localhost:5432/auto_delivery_test?sslmode=disable";

function shellQuote(value: string) {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

const serverCommand = [
  "npm run build",
  `cd backend && ${[
    "APP_ENV=test",
    `HTTP_ADDR=:${port}`,
    `DATABASE_URL=${shellQuote(databaseURL)}`,
    "REDIS_URL=redis://localhost:6379/0",
    "ADMIN_USERNAME=admin",
    "ADMIN_PASSWORD=test1234567890",
    "SECRET_PEPPER=0123456789abcdef0123456789abcdef",
    "SESSION_COOKIE_NAME=auto_delivery_e2e_admin",
    `APP_BASE_URL=${shellQuote(baseURL)}`,
    "STORAGE_ROOT=../data/e2e-storage",
    "STATIC_DIR=../frontend/dist",
    "go run ./cmd/server",
  ].join(" ")}`,
].join(" && ");

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  timeout: 45_000,
  expect: {
    timeout: 8_000,
  },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: serverCommand,
    url: `${baseURL}/healthz`,
    timeout: 120_000,
    reuseExistingServer: false,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
