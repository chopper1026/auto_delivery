import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dockerfile = readFileSync("Dockerfile", "utf8");

describe("Dockerfile frontend build", () => {
  it("copies public assets before running the Vite production build", () => {
    const publicCopyIndex = dockerfile.indexOf("COPY public ./public");
    const buildIndex = dockerfile.indexOf("RUN npm run build");

    expect(publicCopyIndex).toBeGreaterThanOrEqual(0);
    expect(publicCopyIndex).toBeLessThan(buildIndex);
  });
});
