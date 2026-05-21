import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "frontend/src"),
    },
  },
  test: {
    environment: "jsdom",
    include: ["frontend/src/**/*.test.ts", "frontend/src/**/*.test.tsx"],
  },
});
