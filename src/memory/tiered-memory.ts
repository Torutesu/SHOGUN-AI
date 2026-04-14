import type { PostgresEngine } from "../engine/postgres.js";
import type { Page } from "../types.js";

/**
 * Hot/Warm/Cold memory tiers.
 *
 * Hot:  Last 24 hours — highest priority in search results
 * Warm: Last 30 days — normal priority
 * Cold: All history — lower priority, compressed timeline
 *
 * In PGLite (in-memory), we don't physically separate storage.
 * Instead, search results are boosted by recency tier.
 */

export type MemoryTier = "hot" | "warm" | "cold";

export function getPageTier(updatedAt: Date): MemoryTier {
  const now = Date.now();
  const age = now - updatedAt.getTime();
  const hours24 = 24 * 60 * 60 * 1000;
  const days30 = 30 * 24 * 60 * 60 * 1000;

  if (age < hours24) return "hot";
  if (age < days30) return "warm";
  return "cold";
}

export function getTierBoost(tier: MemoryTier): number {
  switch (tier) {
    case "hot": return 1.5;   // 50% boost
    case "warm": return 1.0;  // No boost
    case "cold": return 0.7;  // 30% penalty
  }
}

export class TieredMemory {
  constructor(private engine: PostgresEngine) {}

  async getHotPages(limit: number = 50): Promise<Page[]> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    return this.engine.query<Page>(
      "SELECT * FROM pages WHERE updated_at >= $1 ORDER BY updated_at DESC LIMIT $2",
      [cutoff, limit]
    );
  }

  async getWarmPages(limit: number = 100): Promise<Page[]> {
    const hotCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const warmCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    return this.engine.query<Page>(
      "SELECT * FROM pages WHERE updated_at < $1 AND updated_at >= $2 ORDER BY updated_at DESC LIMIT $3",
      [hotCutoff, warmCutoff, limit]
    );
  }

  async getColdPages(limit: number = 100, offset: number = 0): Promise<Page[]> {
    const coldCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    return this.engine.query<Page>(
      "SELECT * FROM pages WHERE updated_at < $1 ORDER BY updated_at DESC LIMIT $2 OFFSET $3",
      [coldCutoff, limit, offset]
    );
  }

  async getTierStats(): Promise<Record<MemoryTier, number>> {
    const hotCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const warmCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [hot] = await this.engine.query<{ count: number }>(
      "SELECT COUNT(*)::int as count FROM pages WHERE updated_at >= $1", [hotCutoff]
    );
    const [warm] = await this.engine.query<{ count: number }>(
      "SELECT COUNT(*)::int as count FROM pages WHERE updated_at < $1 AND updated_at >= $2", [hotCutoff, warmCutoff]
    );
    const [cold] = await this.engine.query<{ count: number }>(
      "SELECT COUNT(*)::int as count FROM pages WHERE updated_at < $1", [warmCutoff]
    );

    return {
      hot: hot?.count ?? 0,
      warm: warm?.count ?? 0,
      cold: cold?.count ?? 0,
    };
  }
}
