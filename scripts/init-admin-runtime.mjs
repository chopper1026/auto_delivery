import crypto from "node:crypto";
import argon2 from "argon2";
import pg from "pg";

const { Pool } = pg;

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function quoteIdentifier(identifier) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error("Unsafe database identifier.");
  }
  return `"${identifier}"`;
}

function getSchemaName(databaseUrl) {
  return new URL(databaseUrl).searchParams.get("schema") || "public";
}

const databaseUrl = requiredEnv("DATABASE_URL");
const username = requiredEnv("ADMIN_USERNAME");
const password = requiredEnv("ADMIN_PASSWORD");

if (password.length < 12) {
  throw new Error("ADMIN_PASSWORD must be at least 12 characters.");
}

const schema = quoteIdentifier(getSchemaName(databaseUrl));
const adminUserTable = `${schema}.${quoteIdentifier("AdminUser")}`;
const pool = new Pool({ connectionString: databaseUrl });

try {
  const existing = await pool.query(`SELECT COUNT(*)::int AS count FROM ${adminUserTable}`);
  if (existing.rows[0]?.count > 0) {
    process.exit(0);
  }

  const now = new Date();
  await pool.query(
    `INSERT INTO ${adminUserTable} (id, username, "passwordHash", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5)`,
    [
      `admin_${crypto.randomUUID().replaceAll("-", "")}`,
      username,
      await argon2.hash(password, { type: argon2.argon2id }),
      now,
      now,
    ],
  );
} finally {
  await pool.end();
}
