import type { PostgresEngine } from "../engine/postgres.js";

/**
 * Comprehensive audit log — tracks ALL operations, not just ingest.
 *
 * Every action taken by humans or AI agents is logged with:
 * - Who did it (user/agent/system)
 * - What they did (action type)
 * - What data was affected (target slug/id)
 * - When it happened
 *
 * This is critical for:
 * - Security compliance (SOC2)
 * - AI traceability (which AI action produced what)
 * - User transparency (what data went where)
 */

export interface AuditEntry {
  actor: "user" | "agent" | "system" | "mcp_client";
  action: string;
  target?: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

export class AuditLog {
  constructor(private engine: PostgresEngine) {}

  async init(): Promise<void> {
    await this.engine.exec(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id SERIAL PRIMARY KEY,
        actor TEXT NOT NULL,
        action TEXT NOT NULL,
        target TEXT,
        details JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor);
      CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
      CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);
    `);
  }

  async log(entry: AuditEntry): Promise<void> {
    await this.engine.query(
      `INSERT INTO audit_log (actor, action, target, details, created_at) VALUES ($1, $2, $3, $4, $5)`,
      [entry.actor, entry.action, entry.target ?? null, entry.details ? JSON.stringify(entry.details) : null, entry.timestamp]
    );
  }

  async query(options?: {
    actor?: string;
    action?: string;
    since?: Date;
    limit?: number;
  }): Promise<AuditEntry[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (options?.actor) { conditions.push(`actor = $${idx++}`); params.push(options.actor); }
    if (options?.action) { conditions.push(`action = $${idx++}`); params.push(options.action); }
    if (options?.since) { conditions.push(`created_at >= $${idx++}`); params.push(options.since.toISOString()); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const limit = options?.limit ?? 100;

    return this.engine.query<AuditEntry>(
      `SELECT actor, action, target, details, created_at as timestamp
       FROM audit_log ${where} ORDER BY created_at DESC LIMIT $${idx}`,
      [...params, limit]
    );
  }

  /**
   * Get audit trail for a specific page.
   */
  async getPageTrail(slug: string, limit: number = 50): Promise<AuditEntry[]> {
    return this.engine.query<AuditEntry>(
      `SELECT actor, action, target, details, created_at as timestamp
       FROM audit_log WHERE target = $1 ORDER BY created_at DESC LIMIT $2`,
      [slug, limit]
    );
  }

  /**
   * Log where data was sent (LLM API calls).
   */
  async logDataSent(destination: string, dataType: string, tokenCount?: number): Promise<void> {
    await this.log({
      actor: "system",
      action: "data_sent",
      target: destination,
      details: { data_type: dataType, tokens: tokenCount },
      timestamp: new Date(),
    });
  }
}
