import type { PostgresEngine } from "../engine/postgres.js";
import type { EmbeddingProvider, Page } from "../types.js";

export interface VectorResult {
  page: Page;
  similarity: number;
  chunk_text: string;
}

export class VectorSearch {
  constructor(
    private engine: PostgresEngine,
    private embeddingProvider: EmbeddingProvider
  ) {}

  async search(
    query: string,
    options?: { limit?: number; type_filter?: string[] }
  ): Promise<VectorResult[]> {
    const [queryEmbedding] = await this.embeddingProvider.embed([query]);
    const vectorStr = `[${queryEmbedding.join(",")}]`;
    const limit = options?.limit ?? 20;

    const conditions: string[] = [];
    const params: unknown[] = [vectorStr, limit];
    let paramIndex = 3;

    if (options?.type_filter?.length) {
      conditions.push(`p.type = ANY($${paramIndex++}::text[])`);
      params.push(options.type_filter);
    }

    const where = conditions.length > 0 ? `AND ${conditions.join(" AND ")}` : "";

    const results = await this.engine.query<{
      page_id: number;
      chunk_text: string;
      similarity: number;
      slug: string;
      type: string;
      title: string;
      compiled_truth: string;
      timeline: string;
      frontmatter: Record<string, unknown>;
      content_hash: string;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT
        c.page_id, c.chunk_text,
        1 - (c.embedding <=> $1::vector) as similarity,
        p.id, p.slug, p.type, p.title, p.compiled_truth,
        p.timeline, p.frontmatter, p.content_hash,
        p.created_at, p.updated_at
       FROM content_chunks c
       JOIN pages p ON c.page_id = p.id
       WHERE c.embedding IS NOT NULL ${where}
       ORDER BY c.embedding <=> $1::vector
       LIMIT $2`,
      params
    );

    return results.map((r) => ({
      page: {
        id: r.page_id,
        slug: r.slug,
        type: r.type,
        title: r.title,
        compiled_truth: r.compiled_truth,
        timeline: r.timeline,
        frontmatter: r.frontmatter,
        content_hash: r.content_hash,
        created_at: r.created_at,
        updated_at: r.updated_at,
      } as Page,
      similarity: r.similarity,
      chunk_text: r.chunk_text,
    }));
  }

  async indexPage(pageId: number, chunks: string[], source: "compiled_truth" | "timeline"): Promise<void> {
    // Delete existing chunks for this page and source
    await this.engine.query(
      "DELETE FROM content_chunks WHERE page_id = $1 AND chunk_source = $2",
      [pageId, source]
    );

    if (chunks.length === 0) return;

    // Get embeddings
    const embeddings = await this.embeddingProvider.embed(chunks);

    // Insert chunks with embeddings
    for (let i = 0; i < chunks.length; i++) {
      const vectorStr = `[${embeddings[i].join(",")}]`;
      await this.engine.query(
        `INSERT INTO content_chunks (page_id, chunk_text, embedding, chunk_source, chunk_index)
         VALUES ($1, $2, $3::vector, $4, $5)`,
        [pageId, chunks[i], vectorStr, source, i]
      );
    }
  }
}
