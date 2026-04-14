import type { ShogunBrain } from "../brain.js";
import type { HealthReport } from "../types.js";

export interface DreamCycleResult {
  started_at: Date;
  completed_at: Date;
  sync: { synced: number; skipped: number };
  embed: { processed: number; skipped: number };
  entity_sweep: { new_entities: number };
  citation_fix: { fixed: number };
  consolidation: { merged: number };
  health: HealthReport;
}

/**
 * Dream Cycle: nightly batch processing that runs at 00:00 JST daily.
 *
 * Steps:
 * 1. sync — re-chunk pages with stale content
 * 2. embed --stale — process pages missing embeddings
 * 3. entity sweep — detect new entities (future: LLM-powered)
 * 4. citation fix — repair dead internal links
 * 5. memory consolidation — merge duplicate pages (future: LLM-powered)
 * 6. health check — coverage, stale, orphan report
 */
export class DreamCycle {
  constructor(private brain: ShogunBrain) {}

  async run(): Promise<DreamCycleResult> {
    const startedAt = new Date();

    // Step 1: Sync — re-chunk stale pages
    const syncResult = await this.syncStalePages();

    // Step 2: Embed — process pages missing embeddings
    const embedResult = await this.embedStaleChunks();

    // Step 3: Entity sweep (placeholder — requires LLM)
    const entityResult = { new_entities: 0 };

    // Step 4: Citation fix — repair dead links
    const citationResult = await this.fixDeadLinks();

    // Step 5: Memory consolidation (placeholder — requires LLM)
    const consolidationResult = { merged: 0 };

    // Step 6: Health check
    const health = await this.brain.getHealth();

    return {
      started_at: startedAt,
      completed_at: new Date(),
      sync: syncResult,
      embed: embedResult,
      entity_sweep: entityResult,
      citation_fix: citationResult,
      consolidation: consolidationResult,
      health,
    };
  }

  private async syncStalePages(): Promise<{ synced: number; skipped: number }> {
    return this.brain.syncAll(false);
  }

  private async embedStaleChunks(): Promise<{ processed: number; skipped: number }> {
    // Find chunks without embeddings
    const staleChunks = await this.brain.engine.query<{ page_id: number }>(
      `SELECT DISTINCT page_id FROM content_chunks WHERE embedding IS NULL`
    );

    const vectorSearch = this.brain.searchPipeline.getVectorSearch();
    if (!vectorSearch || staleChunks.length === 0) {
      return { processed: 0, skipped: staleChunks.length };
    }

    let processed = 0;
    for (const { page_id } of staleChunks) {
      await this.brain.rechunkPage(page_id);
      processed++;
    }

    return { processed, skipped: 0 };
  }

  private async fixDeadLinks(): Promise<{ fixed: number }> {
    // Check for links referencing non-existent pages
    // With foreign key constraints this shouldn't happen, but
    // we check for links where the target page was deleted
    // between sessions (e.g., if FK was deferred)
    const deadLinks = await this.brain.engine.query<{ id: number }>(
      `SELECT l.id FROM links l
       LEFT JOIN pages p ON l.to_page_id = p.id
       WHERE p.id IS NULL`
    );

    if (deadLinks.length > 0) {
      await this.brain.engine.query(
        `DELETE FROM links WHERE id = ANY($1::int[])`,
        [deadLinks.map((l) => l.id)]
      );
    }

    return { fixed: deadLinks.length };
  }
}

/**
 * Schedule the dream cycle to run at 00:00 JST (15:00 UTC) daily.
 */
export function scheduleDreamCycle(brain: ShogunBrain): NodeJS.Timeout {
  const cycle = new DreamCycle(brain);

  const runIfMidnight = async () => {
    const now = new Date();
    // Convert to JST (UTC+9)
    const jstHour = (now.getUTCHours() + 9) % 24;

    if (jstHour === 0) {
      console.log("[Dream Cycle] Starting nightly batch...");
      try {
        const result = await cycle.run();
        console.log("[Dream Cycle] Completed:", JSON.stringify(result, null, 2));
      } catch (err) {
        console.error("[Dream Cycle] Failed:", err);
      }
    }
  };

  // Check every hour
  return setInterval(runIfMidnight, 60 * 60 * 1000);
}
