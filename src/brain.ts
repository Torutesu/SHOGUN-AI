import { PostgresEngine } from "./engine/postgres.js";
import { PageStore } from "./memory/pages.js";
import { TimelineStore } from "./memory/timeline.js";
import { LinkStore } from "./memory/links.js";
import { TagStore } from "./memory/tags.js";
import { SearchPipeline } from "./search/pipeline.js";
import { recursiveChunk } from "./chunking/recursive.js";
import { logger } from "./logger.js";
import type { BrainStats, EmbeddingProvider, HealthReport, PageType } from "./types.js";

export interface ShogunBrainOptions {
  dataDir?: string;
  embeddingProvider?: EmbeddingProvider;
  syncConcurrency?: number;
}

export class ShogunBrain {
  readonly engine: PostgresEngine;
  readonly pages: PageStore;
  readonly timeline: TimelineStore;
  readonly links: LinkStore;
  readonly tags: TagStore;
  readonly searchPipeline: SearchPipeline;
  private embeddingProvider: EmbeddingProvider | undefined;
  private syncConcurrency: number;

  constructor(options: ShogunBrainOptions = {}) {
    this.engine = new PostgresEngine({ dataDir: options.dataDir });
    this.pages = new PageStore(this.engine);
    this.timeline = new TimelineStore(this.engine);
    this.links = new LinkStore(this.engine);
    this.tags = new TagStore(this.engine);
    this.embeddingProvider = options.embeddingProvider;
    this.syncConcurrency = options.syncConcurrency ?? 5;
    this.searchPipeline = new SearchPipeline({
      engine: this.engine,
      embeddingProvider: options.embeddingProvider,
    });
  }

  async init(): Promise<void> {
    await this.engine.init();
  }

  async close(): Promise<void> {
    await this.engine.close();
  }

  async rechunkPage(pageId: number): Promise<void> {
    const page = await this.pages.getPageById(pageId);
    if (!page) return;

    // Chunk compiled truth
    const truthChunks = recursiveChunk(page.compiled_truth, {
      maxChunkSize: 1000,
      chunkOverlap: 100,
    });

    // Chunk timeline
    const timelineChunks = page.timeline
      ? recursiveChunk(page.timeline, {
          maxChunkSize: 1000,
          chunkOverlap: 50,
        })
      : [];

    const vectorSearch = this.searchPipeline.getVectorSearch();

    if (vectorSearch) {
      // Index with embeddings (batch optimized)
      if (truthChunks.length > 0) {
        await vectorSearch.indexPage(pageId, truthChunks, "compiled_truth");
      }
      if (timelineChunks.length > 0) {
        await vectorSearch.indexPage(pageId, timelineChunks, "timeline");
      }
    } else {
      // Store chunks without embeddings — batch INSERT
      await this.engine.query(
        "DELETE FROM content_chunks WHERE page_id = $1",
        [pageId]
      );

      const allChunks = [
        ...truthChunks.map((text, i) => ({ text, source: "compiled_truth" as const, index: i })),
        ...timelineChunks.map((text, i) => ({ text, source: "timeline" as const, index: i })),
      ];

      if (allChunks.length > 0) {
        const values: string[] = [];
        const params: unknown[] = [];
        let paramIdx = 1;

        for (const chunk of allChunks) {
          values.push(`($${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++})`);
          params.push(pageId, chunk.text, chunk.source, chunk.index);
        }

        await this.engine.query(
          `INSERT INTO content_chunks (page_id, chunk_text, chunk_source, chunk_index)
           VALUES ${values.join(", ")}`,
          params
        );
      }
    }
  }

  async syncAll(force?: boolean): Promise<{ synced: number; skipped: number }> {
    const pages = await this.pages.listPages({ limit: 10000 });
    let synced = 0;
    let skipped = 0;

    // Process pages with concurrency pool
    const queue = [...pages];
    const inFlight: Promise<void>[] = [];

    const processPage = async (page: { id: number; slug: string }) => {
      if (!force) {
        const chunks = await this.engine.query<{ count: number }>(
          "SELECT COUNT(*)::int as count FROM content_chunks WHERE page_id = $1",
          [page.id]
        );
        if (chunks[0]?.count > 0) {
          skipped++;
          return;
        }
      }

      try {
        await this.rechunkPage(page.id);
        synced++;
      } catch (error: unknown) {
        const err = error as Error;
        logger.error(`Failed to sync page ${page.slug}: ${err.message}`);
        // Continue with other pages — don't abort entire sync
      }
    };

    while (queue.length > 0 || inFlight.length > 0) {
      while (inFlight.length < this.syncConcurrency && queue.length > 0) {
        const page = queue.shift()!;
        const promise = processPage(page).then(() => {
          inFlight.splice(inFlight.indexOf(promise), 1);
        });
        inFlight.push(promise);
      }

      if (inFlight.length > 0) {
        await Promise.race(inFlight);
      }
    }

    logger.info(`Sync complete: ${synced} synced, ${skipped} skipped`);
    return { synced, skipped };
  }

  async logIngest(source: string, slug: string, action: "created" | "updated" | "skipped", contentHash: string): Promise<void> {
    await this.engine.query(
      `INSERT INTO ingest_log (source, slug, action, content_hash) VALUES ($1, $2, $3, $4)`,
      [source, slug, action, contentHash]
    );
  }

  async getStats(): Promise<BrainStats> {
    const [totalPages] = await this.engine.query<{ count: number }>(
      "SELECT COUNT(*)::int as count FROM pages"
    );
    const typeRows = await this.engine.query<{ type: PageType; count: number }>(
      "SELECT type, COUNT(*)::int as count FROM pages GROUP BY type"
    );
    const [totalChunks] = await this.engine.query<{ count: number }>(
      "SELECT COUNT(*)::int as count FROM content_chunks"
    );
    const [embeddedChunks] = await this.engine.query<{ count: number }>(
      "SELECT COUNT(*)::int as count FROM content_chunks WHERE embedding IS NOT NULL"
    );
    const [totalLinks] = await this.engine.query<{ count: number }>(
      "SELECT COUNT(*)::int as count FROM links"
    );
    const [totalTags] = await this.engine.query<{ count: number }>(
      "SELECT COUNT(*)::int as count FROM tags"
    );
    const [totalTimeline] = await this.engine.query<{ count: number }>(
      "SELECT COUNT(*)::int as count FROM timeline_entries"
    );

    const pagesByType: Record<PageType, number> = {
      person: 0,
      company: 0,
      session: 0,
      concept: 0,
    };
    for (const row of typeRows) {
      pagesByType[row.type] = row.count;
    }

    return {
      total_pages: totalPages?.count ?? 0,
      pages_by_type: pagesByType,
      total_chunks: totalChunks?.count ?? 0,
      embedded_chunks: embeddedChunks?.count ?? 0,
      total_links: totalLinks?.count ?? 0,
      total_tags: totalTags?.count ?? 0,
      total_timeline_entries: totalTimeline?.count ?? 0,
    };
  }

  async getHealth(): Promise<HealthReport> {
    const stats = await this.getStats();

    const embedCoverage =
      stats.total_chunks > 0
        ? stats.embedded_chunks / stats.total_chunks
        : 0;

    // Stale pages: pages without any chunks
    const [stalePages] = await this.engine.query<{ count: number }>(
      `SELECT COUNT(*)::int as count FROM pages p
       WHERE NOT EXISTS (SELECT 1 FROM content_chunks c WHERE c.page_id = p.id)`
    );

    // Orphan pages: pages with no links to or from
    const [orphanPages] = await this.engine.query<{ count: number }>(
      `SELECT COUNT(*)::int as count FROM pages p
       WHERE NOT EXISTS (SELECT 1 FROM links l WHERE l.from_page_id = p.id OR l.to_page_id = p.id)`
    );

    // Last dream cycle
    const lastCycle = await this.engine.queryOne<{ completed_at: Date }>(
      `SELECT completed_at FROM dream_cycle_log
       WHERE status = 'completed' ORDER BY completed_at DESC LIMIT 1`
    ).catch(() => null);

    return {
      embed_coverage: embedCoverage,
      stale_pages: stalePages?.count ?? 0,
      orphan_pages: orphanPages?.count ?? 0,
      broken_links: 0,
      last_dream_cycle: lastCycle?.completed_at ?? null,
    };
  }

  async runDreamCycle(): Promise<{
    synced: number;
    skipped: number;
    health: HealthReport;
  }> {
    logger.info("Dream Cycle starting");
    const startedAt = new Date();

    // Log dream cycle start
    const logEntry = await this.engine.queryOne<{ id: number }>(
      `INSERT INTO dream_cycle_log (started_at, status) VALUES ($1, 'running') RETURNING id`,
      [startedAt]
    ).catch(() => null);

    try {
      // Step 1-2: Sync and embed stale pages
      const syncResult = await this.syncAll(false);

      // Step 3-6: Health check
      const health = await this.getHealth();

      // Update log entry
      if (logEntry) {
        await this.engine.query(
          `UPDATE dream_cycle_log SET
             completed_at = NOW(),
             synced = $2, skipped = $3,
             health_report = $4, status = 'completed'
           WHERE id = $1`,
          [logEntry.id, syncResult.synced, syncResult.skipped, JSON.stringify(health)]
        ).catch(() => {});
      }

      logger.info("Dream Cycle completed", {
        synced: syncResult.synced,
        skipped: syncResult.skipped,
      });

      return {
        ...syncResult,
        health,
      };
    } catch (error: unknown) {
      const err = error as Error;
      logger.error(`Dream Cycle failed: ${err.message}`);

      if (logEntry) {
        await this.engine.query(
          `UPDATE dream_cycle_log SET status = 'failed', error = $2 WHERE id = $1`,
          [logEntry.id, err.message]
        ).catch(() => {});
      }

      throw error;
    }
  }
}
