import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  TEST_DATABASE_URL: z.string().url().optional(),
  ADMIN_USERNAME: z.string().min(1),
  ADMIN_PASSWORD: z.string().min(12),
  SECRET_PEPPER: z.string().min(32),
  SESSION_COOKIE_NAME: z.string().default("auto_delivery_admin"),
  APP_BASE_URL: z.string().url(),
  STORAGE_ROOT: z.string().min(1).default("./storage"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export const env = envSchema.parse(process.env);
