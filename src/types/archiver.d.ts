declare module "archiver" {
  import type { Writable } from "node:stream";

  export class ZipArchive {
    constructor(options?: { zlib?: { level?: number } });
    pipe(destination: Writable): void;
    file(source: string, data: { name: string }): void;
    finalize(): Promise<void>;
    on(event: "error", listener: (error: Error) => void): this;
  }
}
