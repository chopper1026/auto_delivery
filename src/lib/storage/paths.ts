import path from "node:path";
import { env } from "@/lib/env";

export const storageRoot = path.resolve(env.STORAGE_ROOT);
export const uploadRoot = path.join(storageRoot, "uploads");
export const zipRoot = path.join(storageRoot, "zips");
export const tmpRoot = path.join(storageRoot, "tmp");
