import type { PostgresEngine } from "../engine/postgres.js";
import type { Page } from "../types.js";

export interface KeywordResult {
  page: Page;
  rank: number;
  headline?: string;
}

export class KeywordSearch {
  constructor(private engine: PostgresEngine) {}

  async search(
    query: string,
    options?: { limit?: number; type_filter?: string[] }
  ): Promise<KeywordResult[]> {
    const conditions: string[] = ["search_vector @@ websearch_to_tsquery('english', $1)"];
    const params: unknown[] = [query];
    let paramIndex = 2;

    if (options?.type_filter?.length) {
      conditions.push(`type = ANY($${paramIndex++}::text[])`);
      params.push(options.type_filter);
    }

    const limit = options?.limit ?? 20;

    const results = await this.engine.query<Page & { rank: number; headline: string }>(
      `SELECT p.*,
        ts_rank_cd(search_vector, websearch_to_tsquery('english', $1), 32) as rank,
        ts_headline('english', compiled_truth,
          websearch_to_tsquery('english', $1),
          'MaxWords=50, MinWords=20, StartSel=**, StopSel=**'
        ) as headline
       FROM pages p
       WHERE ${conditions.join(" AND ")}
       ORDER BY rank DESC
       LIMIT $${paramIndex}`,
      [...params, limit]
    );

    return results.map((r) => ({
      page: r,
      rank: r.rank,
      headline: r.headline,
    }));
  }
}
