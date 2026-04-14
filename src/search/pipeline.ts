import type { PostgresEngine } from "../engine/postgres.js";
import type { EmbeddingProvider, SearchOptions, SearchResult } from "../types.js";
import { KeywordSearch } from "./keyword.js";
import { VectorSearch } from "./vector.js";
import { rrfFusion } from "./fusion.js";
import { dedup } from "./dedup.js";
import type { QueryExpander } from "./expansion.js";
import { HeuristicExpander } from "./expansion.js";

export interface SearchPipelineOptions {
  engine: PostgresEngine;
  embeddingProvider?: EmbeddingProvider;
  queryExpander?: QueryExpander;
}

export class SearchPipeline {
  private keywordSearch: KeywordSearch;
  private vectorSearch: VectorSearch | null;
  private expander: QueryExpander;

  constructor(options: SearchPipelineOptions) {
    this.keywordSearch = new KeywordSearch(options.engine);
    this.vectorSearch = options.embeddingProvider
      ? new VectorSearch(options.engine, options.embeddingProvider)
      : null;
    this.expander = options.queryExpander ?? new HeuristicExpander();
  }

  /**
   * Full hybrid search pipeline:
   * 1. Multi-query expansion
   * 2. Parallel keyword + vector search
   * 3. RRF fusion
   * 4. 4-layer dedup
   */
  async query(options: SearchOptions): Promise<SearchResult[]> {
    const limit = options.limit ?? 20;

    // Step 1: Expand query
    const queries = await this.expander.expand(options.query);

    // Step 2: Run searches for each expanded query
    const allKeywordResults = [];
    const allVectorResults = [];

    for (const q of queries) {
      const keywordPromise = this.keywordSearch.search(q, {
        limit: limit * 2,
        type_filter: options.type_filter,
      });

      const vectorPromise = this.vectorSearch
        ? this.vectorSearch.search(q, {
            limit: limit * 2,
            type_filter: options.type_filter,
          })
        : Promise.resolve([]);

      const [keywordResults, vectorResults] = await Promise.all([
        keywordPromise,
        vectorPromise,
      ]);

      allKeywordResults.push(...keywordResults);
      allVectorResults.push(...vectorResults);
    }

    // Step 3: RRF fusion
    const fused = rrfFusion(allKeywordResults, allVectorResults, limit * 2);

    // Step 4: 4-layer dedup
    const deduped = dedup(fused, limit);

    return deduped;
  }

  /**
   * Simple keyword-only search (faster, no embedding needed)
   */
  async keywordOnly(query: string, limit: number = 20): Promise<SearchResult[]> {
    const results = await this.keywordSearch.search(query, { limit });
    return results.map((r) => ({
      page: r.page,
      score: r.rank,
      match_type: "keyword" as const,
    }));
  }

  getVectorSearch(): VectorSearch | null {
    return this.vectorSearch;
  }
}
