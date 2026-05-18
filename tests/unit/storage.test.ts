import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createSha256, isAllowedInventoryFile, sanitizeZipEntryName } from "@/lib/storage/files";
import { createZipFromFiles } from "@/lib/storage/zip";

const tmp = path.join(process.cwd(), ".tmp-storage-test");

afterEach(async () => {
  await fs.rm(tmp, { recursive: true, force: true });
});

describe("storage utilities", () => {
  it("accepts only json inventory files", () => {
    expect(isAllowedInventoryFile("a.json", "application/json")).toBe(true);
    expect(isAllowedInventoryFile("a.txt", "text/plain")).toBe(false);
  });

  it("sanitizes zip entry names", () => {
    expect(sanitizeZipEntryName("../bad name.json")).toBe("bad_name.json");
  });

  it("hashes file content and creates a zip", async () => {
    await fs.mkdir(tmp, { recursive: true });
    const source = path.join(tmp, "a.json");
    const zip = path.join(tmp, "out.zip");
    await fs.writeFile(source, "{\"ok\":true}");

    expect(await createSha256(source)).toHaveLength(64);

    await createZipFromFiles([{ path: source, entryName: "a.json" }], zip);
    const stat = await fs.stat(zip);
    expect(stat.size).toBeGreaterThan(0);
  });
});
