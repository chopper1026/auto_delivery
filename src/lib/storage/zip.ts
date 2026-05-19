import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { ZipArchive } from "archiver";

type ZipArchiveWithAppend = ZipArchive & {
  append(content: string, options: { name: string }): void;
};

export async function createZipFromFiles(
  files: Array<{ path: string; entryName: string }>,
  destinationPath: string,
  textEntries: Array<{ entryName: string; content: string }> = [],
): Promise<{ sizeBytes: number }> {
  if (files.length === 0 && textEntries.length === 0) {
    throw new Error("Cannot create an empty ZIP package.");
  }

  await fsp.mkdir(path.dirname(destinationPath), { recursive: true });

  await new Promise<void>((resolve, reject) => {
    const output = fs.createWriteStream(destinationPath);
    const archive = new ZipArchive({ zlib: { level: 9 } }) as ZipArchiveWithAppend;

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
    for (const entry of textEntries) {
      archive.append(entry.content, { name: entry.entryName });
    }
    for (const file of files) {
      archive.file(file.path, { name: file.entryName });
    }
    void archive.finalize();
  });

  const stat = await fsp.stat(destinationPath);
  return { sizeBytes: stat.size };
}
