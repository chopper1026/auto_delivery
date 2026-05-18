import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { uploadRoot, zipRoot, tmpRoot } from "@/lib/storage/paths";

export function isAllowedInventoryFile(filename: string, mimeType: string): boolean {
  return path.extname(filename).toLowerCase() === ".json" && ["application/json", "text/json", ""].includes(mimeType);
}

export function sanitizeZipEntryName(filename: string): string {
  const base = path.basename(filename).replace(/[^\w.-]+/g, "_");
  return base || "file.json";
}

export async function ensureStorageDirectories(): Promise<void> {
  await Promise.all([
    fs.mkdir(uploadRoot, { recursive: true }),
    fs.mkdir(zipRoot, { recursive: true }),
    fs.mkdir(tmpRoot, { recursive: true }),
  ]);
}

export async function createSha256(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath);
  return crypto.createHash("sha256").update(content).digest("hex");
}

export async function writeUploadedFile(input: {
  goodsId: string;
  originalName: string;
  bytes: Buffer;
}): Promise<{ storedName: string; storagePath: string; sizeBytes: number; sha256: string }> {
  if (!isAllowedInventoryFile(input.originalName, "application/json")) {
    throw new Error("Only JSON inventory files are allowed.");
  }

  await ensureStorageDirectories();
  const directory = path.join(uploadRoot, input.goodsId);
  await fs.mkdir(directory, { recursive: true });

  const storedName = `${crypto.randomUUID()}.json`;
  const storagePath = path.join(directory, storedName);
  await fs.writeFile(storagePath, input.bytes);

  return {
    storedName,
    storagePath,
    sizeBytes: input.bytes.length,
    sha256: await createSha256(storagePath),
  };
}
