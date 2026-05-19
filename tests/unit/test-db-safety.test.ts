import { describe, expect, it } from "vitest";
import { isSafeTestDatabaseUrl } from "../helpers/db";

describe("test database safety", () => {
  it("rejects the development public schema even when called from tests", () => {
    expect(isSafeTestDatabaseUrl("postgresql://auto_delivery:auto_delivery@localhost:5432/auto_delivery?schema=public", "test")).toBe(false);
  });

  it("allows an isolated test schema", () => {
    expect(isSafeTestDatabaseUrl("postgresql://auto_delivery:auto_delivery@localhost:5432/auto_delivery?schema=test", "test")).toBe(true);
  });

  it("rejects reset attempts outside NODE_ENV=test", () => {
    expect(isSafeTestDatabaseUrl("postgresql://auto_delivery:auto_delivery@localhost:5432/auto_delivery?schema=test", "development")).toBe(false);
  });
});
