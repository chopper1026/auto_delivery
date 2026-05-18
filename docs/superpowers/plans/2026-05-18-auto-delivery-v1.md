# Auto Delivery V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the V1 automatic delivery website: public card-key redemption, text/file delivery, one-time ZIP downloads, and a secure admin backend.

**Architecture:** Use a single Next.js App Router application with server-side business services under `src/lib`. PostgreSQL and Prisma hold all durable state, while uploaded files and generated ZIP packages live in a Docker-mounted local storage volume. Admin authentication uses a database-backed session cookie; card keys and receipt tokens are shown once and stored only as lookup hashes.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, PostgreSQL, Prisma, Vitest, Zod, Argon2, Archiver, Docker Compose.

---

## File Structure

Create this project structure during implementation:

- `package.json`: scripts, dependencies, and dev dependencies.
- `next.config.ts`: Next.js config.
- `tsconfig.json`: TypeScript config with `@/*` alias.
- `eslint.config.mjs`: lint config.
- `postcss.config.mjs`: Tailwind PostCSS config.
- `components.json`: shadcn/ui config.
- `.env.example`: required environment variables.
- `.gitignore`: Node, env, Prisma, and local storage ignores.
- `Dockerfile`: production app image.
- `docker-compose.yml`: app, postgres, and persistent volumes.
- `prisma/schema.prisma`: database schema.
- `prisma/migrations/*`: generated migrations.
- `scripts/init-admin.ts`: creates initial admin from env if none exists.
- `src/app/layout.tsx`: root layout.
- `src/app/page.tsx`: public card-key redemption page.
- `src/app/actions/redeem.ts`: public redemption server action.
- `src/app/receipt/[token]/page.tsx`: receipt page.
- `src/app/api/download/[token]/route.ts`: one-time ZIP download route.
- `src/app/admin/login/page.tsx`: admin login page.
- `src/app/admin/login/actions.ts`: login action.
- `src/app/admin/logout/route.ts`: logout route.
- `src/app/admin/layout.tsx`: authenticated admin shell.
- `src/app/admin/page.tsx`: overview dashboard.
- `src/app/admin/goods/page.tsx`: goods list and creation UI.
- `src/app/admin/goods/actions.ts`: goods creation and upload actions.
- `src/app/admin/cards/page.tsx`: card-key list and generation UI.
- `src/app/admin/cards/actions.ts`: card generation and deletion actions.
- `src/app/admin/logs/page.tsx`: audit, redemption, and download logs.
- `src/components/public/redeem-form.tsx`: card-key form.
- `src/components/public/download-button.tsx`: download CTA.
- `src/components/admin/admin-nav.tsx`: admin navigation.
- `src/components/admin/stat-card.tsx`: dashboard stat display.
- `src/components/admin/empty-state.tsx`: shared empty state.
- `src/components/ui/*`: shadcn/ui primitives.
- `src/lib/env.ts`: typed environment loader.
- `src/lib/db.ts`: Prisma client singleton.
- `src/lib/request-meta.ts`: IP and user-agent extraction.
- `src/lib/time.ts`: expiration helpers.
- `src/lib/security/hash.ts`: deterministic secret hashing and masking.
- `src/lib/security/password.ts`: password hashing and verification.
- `src/lib/security/session.ts`: admin session creation, lookup, and deletion.
- `src/lib/security/csrf.ts`: CSRF token generation and validation.
- `src/lib/security/rate-limit.ts`: database-backed rate limiting.
- `src/lib/storage/paths.ts`: storage directories.
- `src/lib/storage/files.ts`: upload validation, file writes, sha256.
- `src/lib/storage/zip.ts`: ZIP creation.
- `src/lib/card-keys/generator.ts`: plaintext card-key generation.
- `src/lib/card-keys/service.ts`: generate and delete card keys with reservation.
- `src/lib/goods/service.ts`: goods creation, listing, upload registration.
- `src/lib/redemption/service.ts`: redeem card keys, receipts, and download consumption.
- `src/lib/admin/overview.ts`: overview queries.
- `src/lib/admin/logs.ts`: log queries.
- `tests/unit/*.test.ts`: fast unit tests.
- `tests/integration/*.test.ts`: Prisma/PostgreSQL integration tests.
- `tests/helpers/db.ts`: test database reset helpers.

## Task 1: Scaffold Next.js Project And Tooling

**Files:**
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `eslint.config.mjs`
- Create: `postcss.config.mjs`
- Create: `components.json`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`
- Create: `.gitignore`

- [ ] **Step 1: Scaffold the app**

Run:

```bash
npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Expected: Next.js files are created in the current directory without nesting another project folder.

- [ ] **Step 2: Install runtime dependencies**

Run:

```bash
npm install @prisma/client zod argon2 archiver nanoid
```

Expected: dependencies are added to `package.json`.

- [ ] **Step 3: Install development dependencies**

Run:

```bash
npm install -D prisma vitest tsx @types/archiver
```

Expected: dev dependencies are added to `package.json`.

- [ ] **Step 4: Add shadcn/ui config and base components**

Run:

```bash
npx shadcn@latest init -d
npx shadcn@latest add button input label card table textarea select badge alert dialog
```

Expected: `components.json`, `src/components/ui/*`, and utility files are created.

- [ ] **Step 5: Normalize `package.json` scripts**

Ensure these scripts exist:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "init:admin": "tsx scripts/init-admin.ts"
  }
}
```

- [ ] **Step 6: Replace the default public page with a minimal starter screen**

`src/app/page.tsx` should export a simple server component:

```tsx
export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6">
        <p className="text-sm uppercase tracking-[0.4em] text-cyan-300">Auto Delivery</p>
        <h1 className="mt-4 text-4xl font-semibold">卡密兑换</h1>
        <p className="mt-4 text-slate-300">输入卡密后领取对应货物。</p>
      </section>
    </main>
  );
}
```

- [ ] **Step 7: Verify scaffold**

Run:

```bash
npm run lint
npm run build
```

Expected: both commands exit with code `0`.

- [ ] **Step 8: Commit**

Run:

```bash
git add .
git commit -m "chore: scaffold next app"
```

## Task 2: Configure Environment, Docker, Prisma, And Storage Volumes

**Files:**
- Create: `.env.example`
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Create: `prisma/schema.prisma`
- Create: `src/lib/env.ts`
- Create: `src/lib/db.ts`
- Create: `src/lib/storage/paths.ts`

- [ ] **Step 1: Add `.env.example`**

Create:

```env
DATABASE_URL="postgresql://auto_delivery:auto_delivery@localhost:5432/auto_delivery?schema=public"
TEST_DATABASE_URL="postgresql://auto_delivery:auto_delivery@localhost:5433/auto_delivery_test?schema=public"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="change-this-password"
SECRET_PEPPER="replace-with-at-least-32-random-bytes"
SESSION_COOKIE_NAME="auto_delivery_admin"
APP_BASE_URL="http://localhost:3000"
STORAGE_ROOT="./storage"
NODE_ENV="development"
```

- [ ] **Step 2: Add Docker Compose**

`docker-compose.yml` should define `app`, `postgres`, and volumes:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: auto_delivery
      POSTGRES_PASSWORD: auto_delivery
      POSTGRES_DB: auto_delivery
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data

  app:
    build: .
    depends_on:
      - postgres
    env_file:
      - .env
    ports:
      - "3000:3000"
    volumes:
      - app-data:/app/storage

volumes:
  postgres-data:
  app-data:
```

- [ ] **Step 3: Add Dockerfile**

Use a production build with generated Prisma client:

```dockerfile
FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
RUN mkdir -p /app/storage/uploads /app/storage/zips /app/storage/tmp
EXPOSE 3000
CMD ["npm", "run", "start"]
```

- [ ] **Step 4: Add typed env loader**

`src/lib/env.ts` should validate required env vars:

```ts
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
```

- [ ] **Step 5: Add Prisma singleton**

`src/lib/db.ts` should avoid duplicate clients in development:

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 6: Add storage paths helper**

`src/lib/storage/paths.ts` should expose stable directories:

```ts
import path from "node:path";
import { env } from "@/lib/env";

export const storageRoot = path.resolve(env.STORAGE_ROOT);
export const uploadRoot = path.join(storageRoot, "uploads");
export const zipRoot = path.join(storageRoot, "zips");
export const tmpRoot = path.join(storageRoot, "tmp");
```

- [ ] **Step 7: Add initial Prisma schema header**

`prisma/schema.prisma` should start with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

- [ ] **Step 8: Verify infrastructure files**

Run:

```bash
npx prisma format
npm run lint
```

Expected: both commands exit with code `0`.

- [ ] **Step 9: Commit**

Run:

```bash
git add .env.example Dockerfile docker-compose.yml prisma src/lib
git commit -m "chore: add infrastructure configuration"
```

## Task 3: Implement Prisma Data Model And Test Database Helpers

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `tests/helpers/db.ts`
- Create: `tests/unit/schema-smoke.test.ts`

- [ ] **Step 1: Add enums to Prisma schema**

Add these enums:

```prisma
enum GoodsType {
  TEXT
  FILE
}

enum GoodsStatus {
  ACTIVE
  DISABLED
}

enum GoodsFileStatus {
  AVAILABLE
  RESERVED
  REDEEMED
  DELETED
}

enum CardKeyStatus {
  ACTIVE
  REDEEMED
  EXPIRED
  DELETED
}

enum DownloadResult {
  SUCCESS
  ALREADY_DOWNLOADED
  NOT_FOUND
  ERROR
}
```

- [ ] **Step 2: Add models to Prisma schema**

Create models for `AdminUser`, `AdminSession`, `Goods`, `GoodsFile`, `CardKey`, `Redemption`, `RedemptionFile`, `DownloadLog`, `AdminAuditLog`, and `RateLimitBucket`. Required uniqueness:

```prisma
model CardKey {
  id           String        @id @default(cuid())
  keyHash      String        @unique
  keyMask      String
  goodsId      String
  goodsType    GoodsType
  fileQuantity Int           @default(0)
  expiresAt    DateTime?
  status       CardKeyStatus @default(ACTIVE)
  createdAt    DateTime      @default(now())
  redeemedAt   DateTime?
  deletedAt    DateTime?

  goods        Goods         @relation(fields: [goodsId], references: [id])
  reservedFiles GoodsFile[]  @relation("ReservedFiles")
  redemption   Redemption?

  @@index([goodsId, status])
  @@index([expiresAt])
}
```

Ensure `Redemption.cardKeyId` is unique, `Redemption.receiptTokenHash` is unique, `GoodsFile.reservedByCardKeyId` relates to `CardKey`, and `RateLimitBucket` has a unique compound key on `scope`, `identifier`, and `windowStart`. `DownloadLog.redemptionId` is nullable and `DownloadLog.receiptTokenHash` is nullable so invalid receipt-token download attempts can still be logged without exposing plaintext tokens.

- [ ] **Step 3: Generate and apply migration**

Run:

```bash
npx prisma format
npx prisma migrate dev --name init
npx prisma generate
```

Expected: migration files are created and Prisma client is generated.

- [ ] **Step 4: Add test database helper**

`tests/helpers/db.ts` should export `resetDatabase()` that deletes rows in dependency order:

```ts
import { prisma } from "@/lib/db";

export async function resetDatabase() {
  await prisma.downloadLog.deleteMany();
  await prisma.redemptionFile.deleteMany();
  await prisma.redemption.deleteMany();
  await prisma.goodsFile.deleteMany();
  await prisma.cardKey.deleteMany();
  await prisma.goods.deleteMany();
  await prisma.adminSession.deleteMany();
  await prisma.adminAuditLog.deleteMany();
  await prisma.rateLimitBucket.deleteMany();
  await prisma.adminUser.deleteMany();
}
```

- [ ] **Step 5: Add schema smoke test**

`tests/unit/schema-smoke.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { GoodsType } from "@prisma/client";

describe("Prisma generated client", () => {
  it("exports expected enums", () => {
    expect(GoodsType.TEXT).toBe("TEXT");
    expect(GoodsType.FILE).toBe("FILE");
  });
});
```

- [ ] **Step 6: Verify**

Run:

```bash
npm run test -- tests/unit/schema-smoke.test.ts
npm run lint
```

Expected: tests and lint pass.

- [ ] **Step 7: Commit**

Run:

```bash
git add prisma tests src
git commit -m "feat: add database schema"
```

## Task 4: Implement Security Utilities

**Files:**
- Create: `src/lib/security/hash.ts`
- Create: `src/lib/security/password.ts`
- Create: `src/lib/time.ts`
- Create: `src/lib/request-meta.ts`
- Create: `tests/unit/security.test.ts`

- [ ] **Step 1: Write failing tests**

`tests/unit/security.test.ts` should cover deterministic hashing, masking, password verification, and expiration:

```ts
import { describe, expect, it } from "vitest";
import { addDays, calculateExpiresAt } from "@/lib/time";
import { hashLookupSecret, maskSecret } from "@/lib/security/hash";
import { hashPassword, verifyPassword } from "@/lib/security/password";

describe("security helpers", () => {
  it("hashes lookup secrets deterministically without returning plaintext", () => {
    const one = hashLookupSecret("AD-AAAA-BBBB-CCCC");
    const two = hashLookupSecret("AD-AAAA-BBBB-CCCC");
    expect(one).toBe(two);
    expect(one).not.toContain("AAAA");
  });

  it("masks grouped secrets", () => {
    expect(maskSecret("AD-AAAA-BBBB-CCCC")).toBe("AD-****-****-CCCC");
  });

  it("hashes and verifies passwords", async () => {
    const hash = await hashPassword("strong-password-123");
    expect(await verifyPassword(hash, "strong-password-123")).toBe(true);
    expect(await verifyPassword(hash, "wrong-password")).toBe(false);
  });

  it("calculates supported expirations", () => {
    const base = new Date("2026-05-18T00:00:00.000Z");
    expect(calculateExpiresAt("1d", base)?.toISOString()).toBe(addDays(base, 1).toISOString());
    expect(calculateExpiresAt("3d", base)?.toISOString()).toBe(addDays(base, 3).toISOString());
    expect(calculateExpiresAt("7d", base)?.toISOString()).toBe(addDays(base, 7).toISOString());
    expect(calculateExpiresAt("never", base)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test and verify failure**

Run:

```bash
npm run test -- tests/unit/security.test.ts
```

Expected: FAIL because helper modules do not exist yet.

- [ ] **Step 3: Implement lookup hashing and masking**

`src/lib/security/hash.ts`:

```ts
import crypto from "node:crypto";
import { env } from "@/lib/env";

export function hashLookupSecret(secret: string) {
  return crypto.createHmac("sha256", env.SECRET_PEPPER).update(secret.trim()).digest("hex");
}

export function maskSecret(secret: string) {
  const parts = secret.trim().split("-");
  if (parts.length < 3) return "****";
  return [parts[0], ...parts.slice(1, -1).map(() => "****"), parts.at(-1)].join("-");
}
```

- [ ] **Step 4: Implement password helpers**

`src/lib/security/password.ts`:

```ts
import argon2 from "argon2";

export function hashPassword(password: string) {
  return argon2.hash(password, { type: argon2.argon2id });
}

export function verifyPassword(hash: string, password: string) {
  return argon2.verify(hash, password);
}
```

- [ ] **Step 5: Implement time helpers**

`src/lib/time.ts`:

```ts
export type ExpirationOption = "1d" | "3d" | "7d" | "never";

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function calculateExpiresAt(option: ExpirationOption, now = new Date()) {
  if (option === "never") return null;
  const days = option === "1d" ? 1 : option === "3d" ? 3 : 7;
  return addDays(now, days);
}
```

- [ ] **Step 6: Implement request metadata helper**

`src/lib/request-meta.ts`:

```ts
import { headers } from "next/headers";

export async function getRequestMeta() {
  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return {
    ipAddress: forwardedFor || h.get("x-real-ip") || "unknown",
    userAgent: h.get("user-agent") || "unknown",
  };
}
```

- [ ] **Step 7: Verify**

Run:

```bash
npm run test -- tests/unit/security.test.ts
npm run lint
```

Expected: tests and lint pass.

- [ ] **Step 8: Commit**

Run:

```bash
git add src/lib tests/unit/security.test.ts
git commit -m "feat: add security utilities"
```

## Task 5: Implement Admin Sessions, CSRF, Rate Limiting, And Init Admin

**Files:**
- Create: `src/lib/security/session.ts`
- Create: `src/lib/security/csrf.ts`
- Create: `src/lib/security/rate-limit.ts`
- Create: `scripts/init-admin.ts`
- Create: `tests/integration/admin-auth.test.ts`

- [ ] **Step 1: Write integration tests**

`tests/integration/admin-auth.test.ts` should verify admin bootstrap and session lifecycle:

```ts
import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { resetDatabase } from "../helpers/db";
import { createAdminSession, getAdminBySessionToken, revokeAdminSession } from "@/lib/security/session";
import { verifyPassword } from "@/lib/security/password";
import { bootstrapInitialAdmin } from "../../scripts/init-admin";

afterEach(async () => {
  await resetDatabase();
});

describe("admin auth", () => {
  it("bootstraps one initial admin", async () => {
    await bootstrapInitialAdmin();
    await bootstrapInitialAdmin();
    const admins = await prisma.adminUser.findMany();
    expect(admins).toHaveLength(1);
    expect(admins[0].username).toBe(process.env.ADMIN_USERNAME);
    expect(await verifyPassword(admins[0].passwordHash, process.env.ADMIN_PASSWORD || "")).toBe(true);
  });

  it("creates, reads, and revokes sessions by plaintext token", async () => {
    const admin = await prisma.adminUser.create({
      data: { username: "admin", passwordHash: "hash" },
    });
    const session = await createAdminSession(admin.id, { ipAddress: "127.0.0.1", userAgent: "vitest" });
    const found = await getAdminBySessionToken(session.token);
    expect(found?.id).toBe(admin.id);
    await revokeAdminSession(session.token);
    expect(await getAdminBySessionToken(session.token)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm run test -- tests/integration/admin-auth.test.ts
```

Expected: FAIL because modules do not exist.

- [ ] **Step 3: Implement session service**

`src/lib/security/session.ts` should:

- Generate a random token with `crypto.randomBytes(32).toString("base64url")`.
- Store only `hashLookupSecret(token)`.
- Expire sessions after 7 days.
- Return `{ token, expiresAt }` when creating a session.
- Return admin user when token exists and is not expired.
- Delete session by token on logout.

Export these exact functions:

```ts
export async function createAdminSession(
  adminUserId: string,
  meta: { ipAddress: string; userAgent: string },
): Promise<{ token: string; expiresAt: Date }>;

export async function getAdminBySessionToken(token: string): Promise<{ id: string; username: string } | null>;

export async function revokeAdminSession(token: string): Promise<void>;
```

- [ ] **Step 4: Implement CSRF helpers**

`src/lib/security/csrf.ts` should:

- Generate random CSRF tokens.
- Store a hash on `AdminSession.csrfTokenHash`.
- Validate submitted token by comparing `hashLookupSecret(submitted)` to the stored hash.

Export:

```ts
export async function rotateCsrfToken(sessionToken: string): Promise<string>;
export async function validateCsrfToken(sessionToken: string, submittedToken: string): Promise<boolean>;
```

- [ ] **Step 5: Implement database rate limiting**

`src/lib/security/rate-limit.ts` should export:

```ts
export async function consumeRateLimit(input: {
  scope: string;
  identifier: string;
  limit: number;
  windowMs: number;
  now?: Date;
}): Promise<{ allowed: boolean; remaining: number; resetAt: Date }>;
```

Use `RateLimitBucket` keyed by `scope`, `identifier`, and `windowStart`. Increment count atomically and deny when count exceeds limit.

- [ ] **Step 6: Implement admin bootstrap script**

`scripts/init-admin.ts` should export `bootstrapInitialAdmin()` and run it when executed directly:

```ts
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { hashPassword } from "@/lib/security/password";

export async function bootstrapInitialAdmin() {
  const existing = await prisma.adminUser.count();
  if (existing > 0) return;
  await prisma.adminUser.create({
    data: {
      username: env.ADMIN_USERNAME,
      passwordHash: await hashPassword(env.ADMIN_PASSWORD),
    },
  });
}

if (process.argv[1]?.endsWith("init-admin.ts")) {
  bootstrapInitialAdmin()
    .then(async () => prisma.$disconnect())
    .catch(async (error) => {
      console.error(error);
      await prisma.$disconnect();
      process.exit(1);
    });
}
```

- [ ] **Step 7: Verify**

Run:

```bash
npm run test -- tests/integration/admin-auth.test.ts
npm run lint
```

Expected: tests and lint pass.

- [ ] **Step 8: Commit**

Run:

```bash
git add src/lib/security scripts tests/integration/admin-auth.test.ts
git commit -m "feat: add admin authentication primitives"
```

## Task 6: Implement File Storage And ZIP Utilities

**Files:**
- Modify: `src/lib/storage/paths.ts`
- Create: `src/lib/storage/files.ts`
- Create: `src/lib/storage/zip.ts`
- Create: `tests/unit/storage.test.ts`

- [ ] **Step 1: Write failing tests**

`tests/unit/storage.test.ts` should cover JSON validation, filename sanitization, sha256, and ZIP creation:

```ts
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
```

- [ ] **Step 2: Run test and verify failure**

Run:

```bash
npm run test -- tests/unit/storage.test.ts
```

Expected: FAIL because storage helpers do not exist.

- [ ] **Step 3: Implement file helpers**

`src/lib/storage/files.ts` should export:

```ts
export function isAllowedInventoryFile(filename: string, mimeType: string): boolean;
export function sanitizeZipEntryName(filename: string): string;
export async function ensureStorageDirectories(): Promise<void>;
export async function createSha256(filePath: string): Promise<string>;
export async function writeUploadedFile(input: {
  goodsId: string;
  originalName: string;
  bytes: Buffer;
}): Promise<{ storedName: string; storagePath: string; sizeBytes: number; sha256: string }>;
```

Rules:

- Only `.json` filenames are accepted.
- Stored names are random and end in `.json`.
- Files are written below `uploadRoot/<goodsId>/`.
- ZIP entry names cannot include path traversal.

- [ ] **Step 4: Implement ZIP helper**

`src/lib/storage/zip.ts` should export:

```ts
export async function createZipFromFiles(
  files: Array<{ path: string; entryName: string }>,
  destinationPath: string,
): Promise<{ sizeBytes: number }>;
```

Use `archiver`, create parent directories, reject empty file arrays, and delete partial ZIP files on stream error.

- [ ] **Step 5: Verify**

Run:

```bash
npm run test -- tests/unit/storage.test.ts
npm run lint
```

Expected: tests and lint pass.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/lib/storage tests/unit/storage.test.ts
git commit -m "feat: add local storage utilities"
```

## Task 7: Implement Goods Services

**Files:**
- Create: `src/lib/goods/service.ts`
- Create: `tests/integration/goods-service.test.ts`

- [ ] **Step 1: Write integration tests**

`tests/integration/goods-service.test.ts` should verify text goods, file goods, and upload registration:

```ts
import { afterEach, describe, expect, it } from "vitest";
import { GoodsFileStatus, GoodsType } from "@prisma/client";
import { resetDatabase } from "../helpers/db";
import { createFileGoods, createTextGoods, registerGoodsFiles } from "@/lib/goods/service";
import { prisma } from "@/lib/db";

afterEach(async () => {
  await resetDatabase();
});

describe("goods service", () => {
  it("creates text goods", async () => {
    const goods = await createTextGoods({ name: "notice", textContent: "hello" });
    expect(goods.type).toBe(GoodsType.TEXT);
    expect(goods.textContent).toBe("hello");
  });

  it("creates file goods and registers json files as available", async () => {
    const goods = await createFileGoods({ name: "cpa文件" });
    await registerGoodsFiles(goods.id, [
      { originalName: "a.json", storedName: "a-random.json", storagePath: "/tmp/a.json", sizeBytes: 12, mimeType: "application/json", sha256: "a".repeat(64) },
      { originalName: "b.json", storedName: "b-random.json", storagePath: "/tmp/b.json", sizeBytes: 12, mimeType: "application/json", sha256: "b".repeat(64) },
    ]);
    const count = await prisma.goodsFile.count({ where: { goodsId: goods.id, status: GoodsFileStatus.AVAILABLE } });
    expect(count).toBe(2);
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm run test -- tests/integration/goods-service.test.ts
```

Expected: FAIL because service does not exist.

- [ ] **Step 3: Implement goods service**

`src/lib/goods/service.ts` should export:

```ts
export async function createTextGoods(input: { name: string; textContent: string });
export async function createFileGoods(input: { name: string });
export async function registerGoodsFiles(goodsId: string, files: Array<{
  originalName: string;
  storedName: string;
  storagePath: string;
  sizeBytes: number;
  mimeType: string;
  sha256: string;
}>): Promise<{ acceptedCount: number }>;
export async function listGoodsWithInventory();
export async function disableGoods(goodsId: string): Promise<void>;
```

Validation rules:

- Goods names must be non-empty.
- Text goods require non-empty content.
- File registration requires the goods type to be `FILE`.
- Registered files start with status `AVAILABLE`.

- [ ] **Step 4: Verify**

Run:

```bash
npm run test -- tests/integration/goods-service.test.ts
npm run lint
```

Expected: tests and lint pass.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/lib/goods tests/integration/goods-service.test.ts
git commit -m "feat: add goods services"
```

## Task 8: Implement Card-Key Generation, Reservation, And Deletion

**Files:**
- Create: `src/lib/card-keys/generator.ts`
- Create: `src/lib/card-keys/service.ts`
- Create: `tests/unit/card-key-generator.test.ts`
- Create: `tests/integration/card-key-service.test.ts`

- [ ] **Step 1: Write generator tests**

`tests/unit/card-key-generator.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { generatePlaintextCardKey } from "@/lib/card-keys/generator";

describe("card key generator", () => {
  it("generates AD-prefixed grouped uppercase keys", () => {
    const key = generatePlaintextCardKey();
    expect(key).toMatch(/^AD-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  });
});
```

- [ ] **Step 2: Write service integration tests**

`tests/integration/card-key-service.test.ts` should verify:

- Text goods card key has `fileQuantity = 0`.
- File goods card key reserves requested available files.
- Generating with insufficient files throws a typed error.
- Deleting an unredeemed file card releases reserved files.

Use assertions on `CardKeyStatus.ACTIVE`, `GoodsFileStatus.RESERVED`, and `GoodsFileStatus.AVAILABLE`.

- [ ] **Step 3: Run tests and verify failure**

Run:

```bash
npm run test -- tests/unit/card-key-generator.test.ts tests/integration/card-key-service.test.ts
```

Expected: FAIL because card-key modules do not exist.

- [ ] **Step 4: Implement generator**

`src/lib/card-keys/generator.ts`:

```ts
import { customAlphabet } from "nanoid";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const nanoid = customAlphabet(alphabet, 16);

export function generatePlaintextCardKey() {
  const raw = nanoid();
  return `AD-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`;
}
```

- [ ] **Step 5: Implement card-key service**

`src/lib/card-keys/service.ts` should export:

```ts
export type GenerateCardKeyInput = {
  goodsId: string;
  expiration: "1d" | "3d" | "7d" | "never";
  fileQuantity?: number;
};

export async function generateCardKey(input: GenerateCardKeyInput): Promise<{
  plaintextKey: string;
  keyMask: string;
  cardKeyId: string;
  expiresAt: Date | null;
}>;

export async function deleteUnredeemedCardKey(cardKeyId: string): Promise<void>;
export async function listCardKeys();
```

Implementation rules:

- Use `hashLookupSecret(plaintextKey)` for `keyHash`.
- Store only `keyHash` and `keyMask`.
- Use `calculateExpiresAt(input.expiration)`.
- For text goods, require no file quantity and store `fileQuantity = 0`.
- For file goods, require `fileQuantity > 0`.
- In one transaction, select available files ordered by `createdAt`, create the card key, and mark selected files `RESERVED`.
- Throw `NotEnoughInventoryError` if available file count is less than requested.
- Deleting a redeemed card key throws `CannotDeleteRedeemedCardKeyError`.
- Deleting an active file card marks reserved files back to `AVAILABLE`.

- [ ] **Step 6: Verify**

Run:

```bash
npm run test -- tests/unit/card-key-generator.test.ts tests/integration/card-key-service.test.ts
npm run lint
```

Expected: tests and lint pass.

- [ ] **Step 7: Commit**

Run:

```bash
git add src/lib/card-keys tests/unit/card-key-generator.test.ts tests/integration/card-key-service.test.ts
git commit -m "feat: add card key reservation"
```

## Task 9: Implement Redemption And One-Time Download Services

**Files:**
- Create: `src/lib/redemption/service.ts`
- Create: `tests/integration/redemption-service.test.ts`

- [ ] **Step 1: Write integration tests**

`tests/integration/redemption-service.test.ts` should verify:

- Text card redemption creates one `Redemption`, marks card redeemed, and returns text receipt data.
- Expired cards are rejected.
- Redeeming the same card twice is rejected.
- File card redemption marks reserved files as redeemed, creates `RedemptionFile` rows, and writes a ZIP path.
- `consumeDownload()` succeeds once and then returns `ALREADY_DOWNLOADED`.

Use this public service shape in tests:

```ts
const receipt = await redeemCardKey({
  plaintextKey,
  ipAddress: "127.0.0.1",
  userAgent: "vitest",
});
expect(receipt.receiptToken).toBeTruthy();
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm run test -- tests/integration/redemption-service.test.ts
```

Expected: FAIL because redemption service does not exist.

- [ ] **Step 3: Implement redemption service interfaces**

`src/lib/redemption/service.ts` should export:

```ts
export async function redeemCardKey(input: {
  plaintextKey: string;
  ipAddress: string;
  userAgent: string;
}): Promise<{ receiptToken: string; goodsType: "TEXT" | "FILE" }>;

export async function getReceiptByToken(token: string): Promise<
  | { kind: "TEXT"; goodsName: string; textContent: string; redeemedAt: Date }
  | { kind: "FILE"; goodsName: string; redeemedAt: Date; downloaded: boolean }
  | null
>;

export async function consumeDownload(input: {
  receiptToken: string;
  ipAddress: string;
  userAgent: string;
}): Promise<
  | { result: "SUCCESS"; zipPath: string; filename: string }
  | { result: "ALREADY_DOWNLOADED" | "NOT_FOUND" | "ERROR" }
>;
```

- [ ] **Step 4: Implement text redemption**

Rules:

- Hash submitted card key with `hashLookupSecret()`.
- Reject missing, deleted, redeemed, expired, or disabled goods.
- Create a random receipt token and store only `receiptTokenHash`.
- In a transaction, create `Redemption` and mark `CardKey` as `REDEEMED`.
- Return plaintext receipt token only to caller.

- [ ] **Step 5: Implement file redemption**

Rules:

- Use files where `reservedByCardKeyId = cardKey.id` and `status = RESERVED`.
- Require count to equal `cardKey.fileQuantity`.
- Create ZIP under `zipRoot/<redemptionId>.zip`.
- Create `RedemptionFile` rows with original names.
- Mark files `REDEEMED`.
- Mark card key `REDEEMED`.
- Store `zipPath` and `zipSizeBytes`.
- Generate the ZIP before committing file status changes. If ZIP creation fails, leave database rows unchanged and delete the partial ZIP file before returning an error.

- [ ] **Step 6: Implement one-time download consumption**

Rules:

- Lookup redemption by receipt token hash.
- If not found, write a `DownloadLog` with `NOT_FOUND`, a nullable `redemptionId`, and the attempted `receiptTokenHash`, then return `NOT_FOUND`.
- If `downloadCount > 0`, write `ALREADY_DOWNLOADED` and return that result.
- Atomically update only where `downloadCount = 0`.
- On success, set `downloadCount = 1`, set `firstDownloadedAt`, write `DownloadLog.SUCCESS`, and return ZIP path.

- [ ] **Step 7: Verify**

Run:

```bash
npm run test -- tests/integration/redemption-service.test.ts
npm run lint
```

Expected: tests and lint pass.

- [ ] **Step 8: Commit**

Run:

```bash
git add src/lib/redemption tests/integration/redemption-service.test.ts
git commit -m "feat: add redemption workflow"
```

## Task 10: Implement Admin Login, Layout, And Route Protection

**Files:**
- Create: `src/app/admin/login/page.tsx`
- Create: `src/app/admin/login/actions.ts`
- Create: `src/app/admin/logout/route.ts`
- Create: `src/app/admin/layout.tsx`
- Create: `src/components/admin/admin-nav.tsx`

- [ ] **Step 1: Implement login action**

`src/app/admin/login/actions.ts` should:

- Read username, password, and request metadata.
- Rate-limit by IP and username.
- Verify admin password.
- Create session and CSRF token.
- Set `SESSION_COOKIE_NAME` as `HttpOnly`, `SameSite=Lax`, secure in production.
- Redirect to `/admin`.
- Return generic failure messages.

- [ ] **Step 2: Implement login page**

The page should render:

- Username input.
- Password input.
- Submit button.
- Generic error display.
- No admin navigation.

- [ ] **Step 3: Implement logout route**

`src/app/admin/logout/route.ts` should:

- Read session cookie.
- Revoke the session.
- Clear the cookie.
- Redirect to `/admin/login`.

- [ ] **Step 4: Implement authenticated admin layout**

`src/app/admin/layout.tsx` should:

- Read session cookie.
- Redirect unauthenticated users to `/admin/login`.
- Render `AdminNav`.
- Pass a CSRF token to descendants through a hidden input pattern or server prop where needed.

- [ ] **Step 5: Implement admin navigation**

`src/components/admin/admin-nav.tsx` should link to:

- `/admin`
- `/admin/goods`
- `/admin/cards`
- `/admin/logs`
- `/admin/logout`

- [ ] **Step 6: Verify manually**

Run:

```bash
npm run dev
```

Expected:

- `/admin` redirects to `/admin/login` when no session cookie exists.
- Valid login redirects to `/admin`.
- Logout returns to `/admin/login`.

- [ ] **Step 7: Verify automated checks**

Run:

```bash
npm run lint
npm run build
```

Expected: both commands pass.

- [ ] **Step 8: Commit**

Run:

```bash
git add src/app/admin src/components/admin
git commit -m "feat: add admin authentication UI"
```

## Task 11: Implement Goods Management UI And Upload Actions

**Files:**
- Create: `src/app/admin/goods/page.tsx`
- Create: `src/app/admin/goods/actions.ts`
- Modify: `src/lib/goods/service.ts`

- [ ] **Step 1: Implement goods actions**

`src/app/admin/goods/actions.ts` should expose server actions:

```ts
export async function createTextGoodsAction(formData: FormData): Promise<void>;
export async function createFileGoodsAction(formData: FormData): Promise<void>;
export async function uploadGoodsFilesAction(formData: FormData): Promise<void>;
export async function disableGoodsAction(formData: FormData): Promise<void>;
```

Rules:

- All actions require admin session and valid CSRF token.
- Text goods require `name` and `textContent`.
- File upload requires goods id and one or more `.json` files.
- Save files through `writeUploadedFile()`.
- Register metadata through `registerGoodsFiles()`.
- Write `AdminAuditLog` for create, upload, and disable actions.

- [ ] **Step 2: Implement goods page**

`src/app/admin/goods/page.tsx` should show:

- Create text goods form.
- Create file goods form.
- Goods table with name, type, status, total files, available, reserved, redeemed.
- File upload form per file goods row.
- Disable button for active goods.

- [ ] **Step 3: Verify manual upload flow**

Run:

```bash
npm run dev
```

Manual check:

- Create file goods named `cpa文件`.
- Upload 3 JSON files.
- Confirm table shows total `3`, available `3`, reserved `0`, redeemed `0`.
- Uploading a `.txt` file is rejected.

- [ ] **Step 4: Verify automated checks**

Run:

```bash
npm run lint
npm run build
```

Expected: both commands pass.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/app/admin/goods src/lib/goods
git commit -m "feat: add goods management"
```

## Task 12: Implement Card-Key Management UI And Actions

**Files:**
- Create: `src/app/admin/cards/page.tsx`
- Create: `src/app/admin/cards/actions.ts`
- Modify: `src/lib/card-keys/service.ts`

- [ ] **Step 1: Implement card actions**

`src/app/admin/cards/actions.ts` should expose:

```ts
export async function generateCardKeyAction(formData: FormData): Promise<{
  plaintextKey?: string;
  keyMask?: string;
  error?: string;
}>;

export async function deleteCardKeyAction(formData: FormData): Promise<void>;
```

Rules:

- Require admin session and CSRF.
- Default expiration is `3d`.
- Text goods ignore file quantity and create a text card.
- File goods require positive integer file quantity.
- Insufficient inventory returns a visible admin error.
- Generated plaintext key is returned only once from this action.
- Delete releases reserved files only if the card is unredeemed.
- Write `AdminAuditLog` for generate and delete.

- [ ] **Step 2: Implement cards page**

`src/app/admin/cards/page.tsx` should show:

- Generate card form with goods selector.
- File quantity input that is meaningful only for file goods.
- Expiration selector with `1天`, `3天`, `7天`, `永不过期`.
- One-time result panel showing plaintext card key after generation.
- Existing card table with key mask, goods, quantity, status, expiration, created time, redeemed time.
- Delete button for unredeemed cards.

- [ ] **Step 3: Verify manual card flow**

Manual check:

- Generate text goods card and confirm plaintext key appears.
- Refresh page and confirm plaintext key is no longer visible.
- Generate file goods card for quantity `2`.
- Confirm goods inventory changes from available `3` to available `1`, reserved `2`.
- Delete the unredeemed file card and confirm available returns to `3`.

- [ ] **Step 4: Verify automated checks**

Run:

```bash
npm run lint
npm run build
```

Expected: both commands pass.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/app/admin/cards src/lib/card-keys
git commit -m "feat: add card key management"
```

## Task 13: Implement Public Redemption Page, Receipt Page, And Download Route

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/app/actions/redeem.ts`
- Create: `src/app/receipt/[token]/page.tsx`
- Create: `src/app/api/download/[token]/route.ts`
- Create: `src/components/public/redeem-form.tsx`
- Create: `src/components/public/download-button.tsx`

- [ ] **Step 1: Implement redeem action**

`src/app/actions/redeem.ts` should:

- Rate-limit by IP.
- Accept `cardKey` from form data.
- Normalize trim and uppercase card key.
- Call `redeemCardKey()`.
- Redirect to `/receipt/<receiptToken>` on success.
- Return generic public errors on failure.

- [ ] **Step 2: Implement public home page**

`src/app/page.tsx` should render:

- Branded landing panel.
- One card-key input.
- Submit button.
- Generic error area.
- No login or registration links.

- [ ] **Step 3: Implement receipt page**

`src/app/receipt/[token]/page.tsx` should:

- Call `getReceiptByToken(token)`.
- Show not-found message for missing or invalid token.
- For text receipts, show goods name, redemption time, and text content.
- For file receipts, show goods name, redemption time, and a download button unless already downloaded.

- [ ] **Step 4: Implement download route**

`src/app/api/download/[token]/route.ts` should:

- Call `consumeDownload()`.
- Return `404` for missing receipts.
- Return `409` for already downloaded.
- Stream ZIP with `Content-Type: application/zip`.
- Set `Content-Disposition: attachment; filename="<safe name>.zip"`.

- [ ] **Step 5: Verify manual user flow**

Manual check:

- Generate text card in admin.
- Redeem it from `/`.
- Confirm receipt page displays text.
- Reusing the same card key returns a generic used/unavailable error.
- Generate file card in admin.
- Redeem it from `/`.
- Confirm receipt page displays download button.
- Download ZIP once successfully.
- Second download attempt is rejected.

- [ ] **Step 6: Verify automated checks**

Run:

```bash
npm run lint
npm run build
```

Expected: both commands pass.

- [ ] **Step 7: Commit**

Run:

```bash
git add src/app src/components/public
git commit -m "feat: add public redemption flow"
```

## Task 14: Implement Overview And Logs

**Files:**
- Create: `src/lib/admin/overview.ts`
- Create: `src/lib/admin/logs.ts`
- Create: `src/app/admin/page.tsx`
- Create: `src/app/admin/logs/page.tsx`
- Create: `src/components/admin/stat-card.tsx`
- Create: `src/components/admin/empty-state.tsx`

- [ ] **Step 1: Implement overview query**

`src/lib/admin/overview.ts` should export:

```ts
export async function getOverviewStats(): Promise<{
  totalCardKeys: number;
  activeCardKeys: number;
  redeemedCardKeys: number;
  expiredCardKeys: number;
  todaysRedemptions: number;
  todaysDownloads: number;
  fileInventory: Array<{
    goodsId: string;
    goodsName: string;
    total: number;
    available: number;
    reserved: number;
    redeemed: number;
  }>;
}>;
```

- [ ] **Step 2: Implement logs query**

`src/lib/admin/logs.ts` should export:

```ts
export async function getAdminLogs(input: {
  type?: "redemptions" | "downloads" | "admin";
  query?: string;
  take?: number;
});
```

Return redemptions, downloads, and admin audit records ordered by newest first. Include IP, user-agent, goods name, card key mask, result, and timestamp where available.

- [ ] **Step 3: Implement overview page**

`src/app/admin/page.tsx` should show:

- Stat cards for totals.
- File inventory table.
- Recent error area for failed downloads or redemption failures.

- [ ] **Step 4: Implement logs page**

`src/app/admin/logs/page.tsx` should show:

- Tabs or selector for redemption logs, download logs, admin logs.
- Search/filter by card key mask or IP.
- Newest-first table.

- [ ] **Step 5: Verify**

Run:

```bash
npm run lint
npm run build
```

Expected: both commands pass.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/lib/admin src/app/admin src/components/admin
git commit -m "feat: add admin overview and logs"
```

## Task 15: Add End-To-End Verification Fixtures And Final Hardening

**Files:**
- Create: `tests/integration/full-flow.test.ts`
- Modify: `README.md`
- Modify: `.env.example`
- Modify: `docker-compose.yml`

- [ ] **Step 1: Add full flow integration test**

`tests/integration/full-flow.test.ts` should create:

- One file goods record.
- 100 JSON `GoodsFile` rows backed by temp files.
- One file card key for quantity `10`.
- One redemption.
- One successful download consumption.

Assertions:

- Available count changes from `100` to `90` after card generation.
- Reserved count is `10` before redemption.
- Redeemed count is `10` after redemption.
- ZIP file exists and has non-zero size.
- Second download returns `ALREADY_DOWNLOADED`.

- [ ] **Step 2: Add README runbook**

`README.md` should include:

- Local setup commands.
- Required `.env` values.
- `docker compose up -d postgres`.
- `npx prisma migrate dev`.
- `npm run init:admin`.
- `npm run dev`.
- Admin URL: `/admin`.
- Public URL: `/`.
- Manual test checklist for uploading 100 JSON files, generating a 10-file card, redeeming, and downloading once.

- [ ] **Step 3: Add production notes**

`README.md` should state:

- Keep `.env` out of Git.
- Use a long random `SECRET_PEPPER`.
- Back up PostgreSQL volume and `app-data` volume together.
- Do not delete generated ZIP files manually unless corresponding database records are intentionally archived.
- Use HTTPS in production so secure cookies work correctly.

- [ ] **Step 4: Run full verification**

Run:

```bash
npm run test
npm run lint
npm run build
docker compose build
```

Expected: tests, lint, build, and Docker build pass.

- [ ] **Step 5: Commit**

Run:

```bash
git add tests README.md .env.example docker-compose.yml
git commit -m "docs: add verification runbook"
```

## Spec Coverage Review

- Public no-login redemption is covered by Tasks 9 and 13.
- Expiring card keys are covered by Tasks 4, 8, 9, and 13.
- Text goods receipt display is covered by Tasks 7, 9, and 13.
- File goods ZIP generation and one-time download are covered by Tasks 6, 9, 13, and 15.
- Strict admin password login is covered by Tasks 5 and 10.
- Goods management and JSON upload counting are covered by Tasks 7 and 11.
- Card-key generation, deletion, expiration, file quantity, and reservation are covered by Tasks 8 and 12.
- Redemption, IP, user-agent, admin, and download logs are covered by Tasks 9, 11, 12, 13, and 14.
- Already redeemed files never being reused is covered by Tasks 8, 9, and 15.
- Overview, goods, card keys, and logs modules are covered by Tasks 11, 12, and 14.

## Final Verification Before Completion

Before claiming implementation complete, run:

```bash
npm run test
npm run lint
npm run build
docker compose build
```

Then manually verify the V1 happy path:

1. Create admin with `npm run init:admin`.
2. Log in at `/admin`.
3. Create file goods named `cpa文件`.
4. Upload 100 `.json` files.
5. Generate one card key with quantity `10` and expiration `3天`.
6. Redeem the card key at `/`.
7. Download the ZIP once.
8. Confirm the ZIP has 10 files.
9. Confirm a second download is rejected.
10. Confirm logs show redemption IP and download IP.
