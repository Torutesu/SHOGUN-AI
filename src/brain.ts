import { PostgresEngine } from "./engine/postgres.js";
import { PageStore } from "./memory/pages.js";
import { TimelineStore } from "./memory/timeline.js";
import { LinkStore } from "./memory/links.js";
import { TagStore } from "./memory/tags.js";
import { SearchPipeline } from "./search/pipeline.js";
import { recursiveChunk } from "./chunking/recursive.js";
import type { BrainStats, EmbeddingProvider, HealthReport, PageType } from "./types.js";

export interface ShogunBrainOptions {
  dataDir?: string;
  embeddingProvider?: EmbeddingProvider;
}

export class ShogunBrain {
  readonly engine: PostgresEngine;
  readonly pages: PageStore;
  readonly timeline: TimelineStore;
  readonly links: LinkStore;
  readonly tags: TagStore;
  readonly searchPipeline: SearchPipeline;
  private embeddingProvider: EmbeddingProvider | undefined;

  constructor(options: ShogunBrainOptions = {}) {
    this.engine = new PostgresEngine({ dataDir: options.dataDir });
    this.pages = new PageStore(this.engine);
    this.timeline = new TimelineStore(this.engine);
    this.links = new LinkStore(this.engine);
    this.tags = new TagStore(this.engine);
    this.embeddingProvider = options.embeddingProvider;
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
      // Index with embeddings
      if (truthChunks.length > 0) {
        await vectorSearch.indexPage(pageId, truthChunks, "compiled_truth");
      }
      if (timelineChunks.length > 0) {
        await vectorSearch.indexPage(pageId, timelineChunks, "timeline");
      }
    } else {
      // Store chunks without embeddings (for keyword search)
      await this.engine.query(
        "DELETE FROM content_chunks WHERE page_id = $1",
        [pageId]
      );

      for (let i = 0; i < truthChunks.length; i++) {
        await this.engine.query(
          `INSERT INTO content_chunks (page_id, chunk_text, chunk_source, chunk_index)
           VALUES ($1, $2, 'compiled_truth', $3)`,
          [pageId, truthChunks[i], i]
        );
      }

      for (let i = 0; i < timelineChunks.length; i++) {
        await this.engine.query(
          `INSERT INTO content_chunks (page_id, chunk_text, chunk_source, chunk_index)
           VALUES ($1, $2, 'timeline', $3)`,
          [pageId, timelineChunks[i], i]
        );
      }
    }
  }

  async syncAll(force?: boolean): Promise<{ synced: number; skipped: number }> {
    const pages = await this.pages.listPages({ limit: 10000 });
    let synced = 0;
    let skipped = 0;

    for (const page of pages) {
      if (!force) {
        // Check if page has already been chunked
        const chunks = await this.engine.query<{ count: number }>(
          "SELECT COUNT(*)::int as count FROM content_chunks WHERE page_id = $1",
          [page.id]
        );
        if (chunks[0]?.count > 0) {
          skipped++;
          continue;
        }
      }

      await this.rechunkPage(page.id);
      synced++;
    }

    return { synced, skipped };
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

    // Broken links: links where either page doesn't exist (shouldn't happen with FK, but just in case)
    const brokenLinks = 0;

    return {
      embed_coverage: embedCoverage,
      stale_pages: stalePages?.count ?? 0,
      orphan_pages: orphanPages?.count ?? 0,
      broken_links: brokenLinks,
      last_dream_cycle: null,
    };
  }

  async runDreamCycle(): Promise<{
    synced: number;
    skipped: number;
    health: HealthReport;
  }> {
    // Step 1-2: Sync and embed stale pages
    const syncResult = await this.syncAll(false);

    // Step 3-6: Health check
    const health = await this.getHealth();

    return {
      ...syncResult,
      health,
    };
  }
}
