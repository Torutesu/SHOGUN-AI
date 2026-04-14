import type { PostgresEngine } from "../engine/postgres.js";
import { logger } from "../logger.js";

/**
 * Japanese/CJK text search support.
 *
 * PostgreSQL's default tsvector tokenizer doesn't handle CJK text well
 * because it relies on whitespace word boundaries. Japanese, Chinese,
 * and Korean text has no spaces between words.
 *
 * Strategy:
 * 1. Detect CJK characters in text
 * 2. Generate character bigrams for CJK portions
 * 3. Store bigrams as tsvector tokens alongside normal English tokens
 * 4. Search queries also get bigram expansion for CJK
 *
 * This approach is:
 * - Zero external dependencies (no MeCab, kuromoji, etc.)
 * - Works in PGLite WASM environment
 * - Good recall (bigrams catch all substrings)
 * - Acceptable precision (some false positives, but dedup handles it)
 */

// CJK Unicode ranges
const CJK_REGEX = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/;
const CJK_BLOCK_REGEX = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]+/g;

/**
 * Check if text contains CJK characters.
 */
export function containsCJK(text: string): boolean {
  return CJK_REGEX.test(text);
}

/**
 * Generate character bigrams from CJK text.
 * "東京都" → ["東京", "京都"]
 */
export function cjkBigrams(text: string): string[] {
  const bigrams: string[] = [];
  const matches = text.match(CJK_BLOCK_REGEX);
  if (!matches) return bigrams;

  for (const block of matches) {
    for (let i = 0; i < block.length - 1; i++) {
      bigrams.push(block.slice(i, i + 2));
    }
    // Also add individual characters for single-char searches
    if (block.length === 1) {
      bigrams.push(block);
    }
  }

  return [...new Set(bigrams)];
}

/**
 * Tokenize text for tsvector: handles both English (whitespace) and CJK (bigrams).
 * Returns space-separated tokens suitable for to_tsvector('simple', ...).
 */
export function tokenizeForSearch(text: string): string {
  const tokens: string[] = [];

  // Extract English words
  const englishWords = text
    .replace(CJK_BLOCK_REGEX, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .map((w) => w.toLowerCase());
  tokens.push(...englishWords);

  // Extract CJK bigrams
  if (containsCJK(text)) {
    tokens.push(...cjkBigrams(text));
  }

  return tokens.join(" ");
}

/**
 * Expand a search query with CJK bigrams for better recall.
 */
export function expandQueryForCJK(query: string): string {
  if (!containsCJK(query)) return query;

  const parts: string[] = [];

  // Keep original English parts
  const englishParts = query
    .replace(CJK_BLOCK_REGEX, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0);
  parts.push(...englishParts);

  // Add CJK bigrams
  const bigrams = cjkBigrams(query);
  parts.push(...bigrams);

  return parts.join(" | ");
}

/**
 * JapaneseSearchEnhancer: hooks into the page save pipeline
 * to store CJK bigrams in a separate search column.
 */
export class JapaneseSearchEnhancer {
  constructor(private engine: PostgresEngine) {}

  /**
   * Initialize the Japanese search column and trigger.
   */
  async init(): Promise<void> {
    // Add a cjk_search_vector column if it doesn't exist
    await this.engine.exec(`
      DO $$ BEGIN
        ALTER TABLE pages ADD COLUMN IF NOT EXISTS cjk_tokens TEXT NOT NULL DEFAULT '';
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;

      CREATE INDEX IF NOT EXISTS idx_pages_cjk_tokens ON pages USING GIN(to_tsvector('simple', cjk_tokens));
    `);
    logger.info("Japanese search enhancer initialized");
  }

  /**
   * Update CJK tokens for a page.
   */
  async updateTokens(pageId: number): Promise<void> {
    const page = await this.engine.queryOne<{
      title: string;
      compiled_truth: string;
      timeline: string;
    }>(
      "SELECT title, compiled_truth, timeline FROM pages WHERE id = $1",
      [pageId]
    );
    if (!page) return;

    const fullText = `${page.title} ${page.compiled_truth} ${page.timeline}`;
    if (!containsCJK(fullText)) return;

    const tokens = tokenizeForSearch(fullText);
    await this.engine.query(
      "UPDATE pages SET cjk_tokens = $2 WHERE id = $1",
      [pageId, tokens]
    );
  }

  /**
   * Search using CJK-aware tokenization.
   */
  async search(
    query: string,
    limit: number = 20
  ): Promise<{ id: number; slug: string; title: string; rank: number }[]> {
    const expandedQuery = expandQueryForCJK(query);

    return this.engine.query(
      `SELECT id, slug, title,
        ts_rank(to_tsvector('simple', cjk_tokens), to_tsquery('simple', $1)) as rank
       FROM pages
       WHERE to_tsvector('simple', cjk_tokens) @@ to_tsquery('simple', $1)
       ORDER BY rank DESC
       LIMIT $2`,
      [expandedQuery, limit]
    );
  }
}
