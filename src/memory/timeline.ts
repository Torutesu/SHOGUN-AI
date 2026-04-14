import type { PostgresEngine } from "../engine/postgres.js";
import type { TimelineEntry } from "../types.js";

export class TimelineStore {
  constructor(private engine: PostgresEngine) {}

  async addEntry(
    pageId: number,
    entryDate: string,
    content: string,
    source?: string
  ): Promise<TimelineEntry> {
    // Add structured timeline entry
    const entry = await this.engine.queryOne<TimelineEntry>(
      `INSERT INTO timeline_entries (page_id, entry_date, content, source)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [pageId, entryDate, content, source ?? null]
    );

    // Append to page timeline text (append-only)
    const timelineLine = `- ${entryDate}: ${content}`;
    await this.engine.query(
      `UPDATE pages SET timeline =
         CASE WHEN timeline = '' THEN $2
         ELSE timeline || E'\n' || $2 END
       WHERE id = $1`,
      [pageId, timelineLine]
    );

    return entry!;
  }

  async getEntries(pageId: number, options?: {
    limit?: number;
    after?: string;
    before?: string;
  }): Promise<TimelineEntry[]> {
    const conditions: string[] = ["page_id = $1"];
    const params: unknown[] = [pageId];
    let paramIndex = 2;

    if (options?.after) {
      conditions.push(`entry_date >= $${paramIndex++}`);
      params.push(options.after);
    }
    if (options?.before) {
      conditions.push(`entry_date <= $${paramIndex++}`);
      params.push(options.before);
    }

    const limit = options?.limit ?? 100;
    const where = conditions.join(" AND ");

    return this.engine.query<TimelineEntry>(
      `SELECT * FROM timeline_entries WHERE ${where} ORDER BY entry_date DESC LIMIT $${paramIndex}`,
      [...params, limit]
    );
  }

  async getEntriesBySlug(slug: string, options?: {
    limit?: number;
    after?: string;
    before?: string;
  }): Promise<TimelineEntry[]> {
    const page = await this.engine.queryOne<{ id: number }>(
      "SELECT id FROM pages WHERE slug = $1",
      [slug]
    );
    if (!page) return [];
    return this.getEntries(page.id, options);
  }
}
