import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PostgresEngine } from "../src/engine/postgres.js";

describe("PostgresEngine", () => {
  let engine: PostgresEngine;

  beforeEach(async () => {
    engine = new PostgresEngine({ dataDir: "memory://" });
    await engine.init();
  });

  afterEach(async () => {
    await engine.close();
  });

  it("should initialize and create tables", async () => {
    const tables = await engine.query<{ tablename: string }>(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
    );
    const tableNames = tables.map((t) => t.tablename);

    expect(tableNames).toContain("pages");
    expect(tableNames).toContain("content_chunks");
    expect(tableNames).toContain("links");
    expect(tableNames).toContain("tags");
    expect(tableNames).toContain("timeline_entries");
    expect(tableNames).toContain("page_versions");
    expect(tableNames).toContain("raw_data");
    expect(tableNames).toContain("files");
    expect(tableNames).toContain("ingest_log");
  });

  it("should track schema migrations", async () => {
    const migrations = await engine.query<{ version: number; name: string }>(
      "SELECT version, name FROM schema_migrations ORDER BY version"
    );

    expect(migrations.length).toBeGreaterThanOrEqual(1);
    expect(migrations[0].version).toBe(1);
    expect(migrations[0].name).toBe("initial_schema");
  });

  it("should execute queries with params", async () => {
    await engine.query(
      `INSERT INTO pages (slug, type, title, compiled_truth, content_hash)
       VALUES ($1, $2, $3, $4, $5)`,
      ["test/page", "concept", "Test Page", "Test content", "abc123"]
    );

    const page = await engine.queryOne<{ slug: string; title: string }>(
      "SELECT slug, title FROM pages WHERE slug = $1",
      ["test/page"]
    );

    expect(page).not.toBeNull();
    expect(page!.slug).toBe("test/page");
    expect(page!.title).toBe("Test Page");
  });

  it("should return null for queryOne with no results", async () => {
    const result = await engine.queryOne(
      "SELECT * FROM pages WHERE slug = $1",
      ["nonexistent"]
    );
    expect(result).toBeNull();
  });
});
