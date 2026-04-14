import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite/vector";
import { MIGRATIONS } from "./migrations.js";

export interface PostgresEngineOptions {
  dataDir?: string;
}

export class PostgresEngine {
  private db: PGlite | null = null;
  private dataDir: string;

  constructor(options: PostgresEngineOptions = {}) {
    this.dataDir = options.dataDir ?? "memory://";
  }

  async init(): Promise<void> {
    this.db = new PGlite(this.dataDir, {
      extensions: { vector },
    });
    await this.db.waitReady;
    await this.runMigrations();
  }

  private async runMigrations(): Promise<void> {
    const db = this.getDb();

    // Ensure schema_migrations table exists (bootstrapping)
    await db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const result = await db.query<{ version: number }>(
      "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1"
    );
    const currentVersion = result.rows.length > 0 ? result.rows[0].version : 0;

    for (const migration of MIGRATIONS) {
      if (migration.version > currentVersion) {
        await db.exec(migration.sql);
        await db.query(
          "INSERT INTO schema_migrations (version, name) VALUES ($1, $2)",
          [migration.version, migration.name]
        );
      }
    }
  }

  getDb(): PGlite {
    if (!this.db) {
      throw new Error("Database not initialized. Call init() first.");
    }
    return this.db;
  }

  async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const db = this.getDb();
    const result = await db.query<T>(sql, params);
    return result.rows;
  }

  async queryOne<T>(sql: string, params?: unknown[]): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  async exec(sql: string): Promise<void> {
    const db = this.getDb();
    await db.exec(sql);
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }
}
