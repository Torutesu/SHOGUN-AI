import type { Page, SearchResult } from "../types.js";
import type { KeywordResult } from "./keyword.js";
import type { VectorResult } from "./vector.js";

const RRF_K = 60;

interface RankedItem {
  page: Page;
  chunk_text?: string;
  keywordRank?: number;
  vectorRank?: number;
  rrfScore: number;
}

/**
 * Reciprocal Rank Fusion (RRF) to combine keyword and vector search results.
 * score = sum(1 / (K + rank)) for each result list where the page appears.
 */
export function rrfFusion(
  keywordResults: KeywordResult[],
  vectorResults: VectorResult[],
  limit: number = 20
): SearchResult[] {
  const pageMap = new Map<string, RankedItem>();

  // Process keyword results
  for (let i = 0; i < keywordResults.length; i++) {
    const kr = keywordResults[i];
    const key = kr.page.slug;

    if (!pageMap.has(key)) {
      pageMap.set(key, {
        page: kr.page,
        keywordRank: i + 1,
        rrfScore: 0,
      });
    }
    const item = pageMap.get(key)!;
    item.keywordRank = i + 1;
    item.rrfScore += 1 / (RRF_K + i + 1);
  }

  // Process vector results
  for (let i = 0; i < vectorResults.length; i++) {
    const vr = vectorResults[i];
    const key = vr.page.slug;

    if (!pageMap.has(key)) {
      pageMap.set(key, {
        page: vr.page,
        chunk_text: vr.chunk_text,
        vectorRank: i + 1,
        rrfScore: 0,
      });
    }
    const item = pageMap.get(key)!;
    item.vectorRank = i + 1;
    item.chunk_text = item.chunk_text ?? vr.chunk_text;
    item.rrfScore += 1 / (RRF_K + i + 1);
  }

  // Sort by RRF score descending
  const sorted = Array.from(pageMap.values()).sort(
    (a, b) => b.rrfScore - a.rrfScore
  );

  return sorted.slice(0, limit).map((item) => ({
    page: item.page,
    score: item.rrfScore,
    chunk_text: item.chunk_text,
    match_type:
      item.keywordRank && item.vectorRank
        ? "hybrid"
        : item.keywordRank
          ? "keyword"
          : "vector",
  }));
}
