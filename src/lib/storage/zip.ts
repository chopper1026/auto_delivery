import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { ZipArchive } from "archiver";

export async function createZipFromFiles(
  files: Array<{ path: string; entryName: string }>,
  destinationPath: string,
): Promise<{ sizeBytes: number }> {
  if (files.length === 0) {
    throw new Error("Cannot create an empty ZIP package.");
  }

  await fsp.mkdir(path.dirname(destinationPath), { recursive: true });

  await new Promise<void>((resolve, reject) => {
    const output = fs.createWriteStream(destinationPath);
    const archive = new ZipArchive({ zlib: { level: 9 } });

    const fail = async (error: Error) => {
      try {
        await fsp.rm(destinationPath, { force: true });
      } finally {
        reject(error);
      }
    };

    output.on("close", resolve);
    output.on("error", fail);
    archive.on("error", fail);

    archive.pipe(output);
    for (const file of files) {
      archive.file(file.path, { name: file.entryName });
    }
    void archive.finalize();
  });

  const stat = await fsp.stat(destinationPath);
  return { sizeBytes: stat.size };
}
