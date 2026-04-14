import { PostgresEngine } from "./engine/postgres.js";
import { PageStore } from "./memory/pages.js";
import { TimelineStore } from "./memory/timeline.js";
import { LinkStore } from "./memory/links.js";
import { TagStore } from "./memory/tags.js";
import { SearchPipeline } from "./search/pipeline.js";
import { JapaneseSearchEnhancer, containsCJK } from "./search/japanese.js";
import { LLMExpander, HeuristicExpander } from "./search/expansion.js";
import { recursiveChunk } from "./chunking/recursive.js";
import { CachedEmbeddingProvider } from "./embeddings/cache.js";
import { FieldEncryption, EncryptedFieldWrapper } from "./security/encryption.js";
import { logger } from "./logger.js";
import type { LLMRouter } from "./llm/router.js";
import type { BrainStats, EmbeddingProvider, HealthReport, PageType } from "./types.js";

export interface ShogunBrainOptions {
  dataDir?: string;
  embeddingProvider?: EmbeddingProvider;
  syncConcurrency?: number;
  /** Enable embedding cache (SHA-256 dedup). Default: true if embeddingProvider set. */
  enableEmbeddingCache?: boolean;
  /** Passphrase for field-level encryption. Omit to disable. */
  encryptionPassphrase?: string;
  /** Installation-unique ID for encryption salt. */
  installationId?: string;
  /** LLM router for query expansion and entity extraction. */
  llmRouter?: LLMRouter;
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
  private japaneseSearch: JapaneseSearchEnhancer;
  private encryption: FieldEncryption;
  private fieldWrapper: EncryptedFieldWrapper;
  private llmRouter: LLMRouter | undefined;

  constructor(options: ShogunBrainOptions = {}) {
    this.engine = new PostgresEngine({ dataDir: options.dataDir });
    this.pages = new PageStore(this.engine);
    this.timeline = new TimelineStore(this.engine);
    this.links = new LinkStore(this.engine);
    this.tags = new TagStore(this.engine);
    this.syncConcurrency = options.syncConcurrency ?? 5;
    this.llmRouter = options.llmRouter;

    // Encryption
    this.encryption = new FieldEncryption(
      options.encryptionPassphrase,
      options.installationId
    );
    this.fieldWrapper = new EncryptedFieldWrapper(this.encryption);

    // Embedding cache: wrap the provider if caching enabled
    let effectiveProvider = options.embeddingProvider;
    if (effectiveProvider && (options.enableEmbeddingCache ?? true)) {
      const cached = new CachedEmbeddingProvider(effectiveProvider, this.engine);
      effectiveProvider = cached;
      this._cachedProvider = cached;
    }
    this.embeddingProvider = effectiveProvider;

    // Search pipeline with LLM expander if available
    const queryExpander = options.llmRouter
      ? new LLMExpander((prompt: string) => options.llmRouter!.call(prompt, "light"))
      : new HeuristicExpander();

    this.searchPipeline = new SearchPipeline({
      engine: this.engine,
      embeddingProvider: effectiveProvider,
      queryExpander,
    });

    // Japanese search enhancer
    this.japaneseSearch = new JapaneseSearchEnhancer(this.engine);
  }

  private _cachedProvider: CachedEmbeddingProvider | null = null;

  async init(): Promise<void> {
    await this.engine.init();

    // Initialize embedding cache table if using cache
    if (this._cachedProvider) {
      await this._cachedProvider.init();
    }

    // Initialize Japanese search column
    await this.japaneseSearch.init();
  }

  async close(): Promise<void> {
    await this.engine.close();
  }

  getEncryption(): FieldEncryption {
    return this.encryption;
  }

  getFieldWrapper(): EncryptedFieldWrapper {
    return this.fieldWrapper;
  }

  getLLMRouter(): LLMRouter | undefined {
    return this.llmRouter;
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
      if (truthChunks.length > 0) {
        await vectorSearch.indexPage(pageId, truthChunks, "compiled_truth");
      }
      if (timelineChunks.length > 0) {
        await vectorSearch.indexPage(pageId, timelineChunks, "timeline");
      }
    } else {
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

    // Update Japanese search tokens if content has CJK
    const fullText = `${page.title} ${page.compiled_truth} ${page.timeline}`;
    if (containsCJK(fullText)) {
      await this.japaneseSearch.updateTokens(pageId);
    }
  }

  async syncAll(force?: boolean): Promise<{ synced: number; skipped: number }> {
    const pages = await this.pages.listPages({ limit: 10000 });
    let synced = 0;
    let skipped = 0;

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

    const [stalePages] = await this.engine.query<{ count: number }>(
      `SELECT COUNT(*)::int as count FROM pages p
       WHERE NOT EXISTS (SELECT 1 FROM content_chunks c WHERE c.page_id = p.id)`
    );

    const [orphanPages] = await this.engine.query<{ count: number }>(
      `SELECT COUNT(*)::int as count FROM pages p
       WHERE NOT EXISTS (SELECT 1 FROM links l WHERE l.from_page_id = p.id OR l.to_page_id = p.id)`
    );

    const lastCycle = await this.engine.queryOne<{ completed_at: Date }>(
      `SELECT completed_at FROM dream_cycle_log
       WHERE status = 'completed' ORDER BY completed_at DESC LIMIT 1`
    ).catch(() => null);

    // Embedding cache stats
    let cacheStats = null;
    if (this._cachedProvider) {
      cacheStats = await this._cachedProvider.getCacheStats();
    }

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

    const logEntry = await this.engine.queryOne<{ id: number }>(
      `INSERT INTO dream_cycle_log (started_at, status) VALUES ($1, 'running') RETURNING id`,
      [startedAt]
    ).catch(() => null);

    try {
      const syncResult = await this.syncAll(false);
      const health = await this.getHealth();

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

      return { ...syncResult, health };
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
