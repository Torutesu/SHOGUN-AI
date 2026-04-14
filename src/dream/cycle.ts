import type { ShogunBrain } from "../brain.js";
import type { LLMRouter } from "../llm/router.js";
import type { HealthReport } from "../types.js";
import { EntityExtractor } from "./entity-extraction.js";
import { MemoryConsolidator } from "./consolidation.js";
import { logger } from "../logger.js";

export interface DreamCycleResult {
  started_at: Date;
  completed_at: Date;
  sync: { synced: number; skipped: number };
  embed: { processed: number; skipped: number };
  entity_sweep: { new_entities: number; new_links: number };
  citation_fix: { fixed: number };
  consolidation: { candidates: number; merged: number; skipped: number };
  health: HealthReport;
}

export interface DreamCycleOptions {
  llmRouter?: LLMRouter;
  entitySweepLimit?: number;
  consolidationLimit?: number;
}

/**
 * Dream Cycle: nightly batch processing that runs at 00:00 JST daily.
 *
 * Steps:
 * 1. sync — re-chunk pages with stale content
 * 2. embed --stale — process pages missing embeddings
 * 3. entity sweep — detect new entities (LLM-powered)
 * 4. citation fix — repair dead internal links
 * 5. memory consolidation — merge duplicate pages (LLM-powered)
 * 6. health check — coverage, stale, orphan report
 */
export class DreamCycle {
  private entityExtractor: EntityExtractor | null = null;
  private consolidator: MemoryConsolidator | null = null;

  constructor(
    private brain: ShogunBrain,
    private options: DreamCycleOptions = {}
  ) {
    if (options.llmRouter) {
      this.entityExtractor = new EntityExtractor(
        brain.engine,
        brain.pages,
        brain.links,
        brain.tags,
        options.llmRouter
      );
      this.consolidator = new MemoryConsolidator(
        brain.engine,
        brain.pages,
        brain.links,
        brain.tags,
        brain.timeline,
        options.llmRouter
      );
    }
  }

  async run(): Promise<DreamCycleResult> {
    const startedAt = new Date();
    logger.info("Dream Cycle starting");

    // Step 1: Sync — re-chunk stale pages
    const syncResult = await this.syncStalePages();

    // Step 2: Embed — process pages missing embeddings
    const embedResult = await this.embedStaleChunks();

    // Step 3: Entity sweep (LLM-powered if router available)
    let entityResult = { new_entities: 0, new_links: 0 };
    if (this.entityExtractor) {
      try {
        entityResult = await this.entityExtractor.sweep({
          limit: this.options.entitySweepLimit ?? 50,
        });
      } catch (error: unknown) {
        const err = error as Error;
        logger.error(`Entity sweep failed: ${err.message}`);
      }
    } else {
      logger.debug("Entity sweep skipped: no LLM router configured");
    }

    // Step 4: Citation fix — repair dead links
    const citationResult = await this.fixDeadLinks();

    // Step 5: Memory consolidation (LLM-powered if router available)
    let consolidationResult = { candidates: 0, merged: 0, skipped: 0 };
    if (this.consolidator) {
      try {
        consolidationResult = await this.consolidator.run({
          limit: this.options.consolidationLimit ?? 10,
        });
      } catch (error: unknown) {
        const err = error as Error;
        logger.error(`Memory consolidation failed: ${err.message}`);
      }
    } else {
      logger.debug("Consolidation skipped: no LLM router configured");
    }

    // Step 6: Health check
    const health = await this.brain.getHealth();

    const result: DreamCycleResult = {
      started_at: startedAt,
      completed_at: new Date(),
      sync: syncResult,
      embed: embedResult,
      entity_sweep: entityResult,
      citation_fix: citationResult,
      consolidation: consolidationResult,
      health,
    };

    logger.info("Dream Cycle completed", {
      sync: syncResult.synced,
      entities: entityResult.new_entities,
      merged: consolidationResult.merged,
    });

    return result;
  }

  private async syncStalePages(): Promise<{ synced: number; skipped: number }> {
    return this.brain.syncAll(false);
  }

  private async embedStaleChunks(): Promise<{ processed: number; skipped: number }> {
    const staleChunks = await this.brain.engine.query<{ page_id: number }>(
      `SELECT DISTINCT page_id FROM content_chunks WHERE embedding IS NULL`
    );

    const vectorSearch = this.brain.searchPipeline.getVectorSearch();
    if (!vectorSearch || staleChunks.length === 0) {
      return { processed: 0, skipped: staleChunks.length };
    }

    let processed = 0;
    for (const { page_id } of staleChunks) {
      try {
        await this.brain.rechunkPage(page_id);
        processed++;
      } catch (error: unknown) {
        const err = error as Error;
        logger.error(`Failed to embed page ${page_id}: ${err.message}`);
      }
    }

    return { processed, skipped: 0 };
  }

  private async fixDeadLinks(): Promise<{ fixed: number }> {
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
      logger.info(`Fixed ${deadLinks.length} dead links`);
    }

    return { fixed: deadLinks.length };
  }
}

/**
 * Schedule the dream cycle to run at 00:00 JST (15:00 UTC) daily.
 */
export function scheduleDreamCycle(
  brain: ShogunBrain,
  options?: DreamCycleOptions
): NodeJS.Timeout {
  const cycle = new DreamCycle(brain, options);

  const runIfMidnight = async () => {
    const now = new Date();
    const jstHour = (now.getUTCHours() + 9) % 24;

    if (jstHour === 0) {
      logger.info("[Dream Cycle] Starting nightly batch...");
      try {
        const result = await cycle.run();
        logger.info("[Dream Cycle] Completed", {
          duration_ms: result.completed_at.getTime() - result.started_at.getTime(),
          synced: result.sync.synced,
          entities: result.entity_sweep.new_entities,
          merged: result.consolidation.merged,
        });
      } catch (err: unknown) {
        logger.error(`[Dream Cycle] Failed: ${(err as Error).message}`);
      }
    }
  };

  return setInterval(runIfMidnight, 60 * 60 * 1000);
}
