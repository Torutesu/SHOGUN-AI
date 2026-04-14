import type { SearchResult, PageType } from "../types.js";

const COSINE_DEDUP_THRESHOLD = 0.85;
const TYPE_DIVERSITY_CAP = 0.6;
const PER_PAGE_CHUNK_CAP = 3;

/**
 * 4-layer deduplication pipeline:
 * 1. Best chunk per page
 * 2. Cosine similarity > 0.85 between result chunks
 * 3. Type diversity (60% cap per type)
 * 4. Per-page chunk cap
 */
export function dedup(
  results: SearchResult[],
  limit: number = 20
): SearchResult[] {
  let deduped = results;

  // Layer 1: Best chunk per page (keep highest scoring result per page slug)
  deduped = bestChunkPerPage(deduped);

  // Layer 2: Remove near-duplicate chunks by text similarity
  deduped = removeNearDuplicates(deduped);

  // Layer 3: Type diversity cap
  deduped = enforceTypeDiversity(deduped);

  // Layer 4: Per-page chunk cap
  deduped = enforcePerPageCap(deduped);

  return deduped.slice(0, limit);
}

function bestChunkPerPage(results: SearchResult[]): SearchResult[] {
  const bestBySlug = new Map<string, SearchResult>();

  for (const result of results) {
    const existing = bestBySlug.get(result.page.slug);
    if (!existing || result.score > existing.score) {
      bestBySlug.set(result.page.slug, result);
    }
  }

  return Array.from(bestBySlug.values()).sort((a, b) => b.score - a.score);
}

function removeNearDuplicates(results: SearchResult[]): SearchResult[] {
  const kept: SearchResult[] = [];

  for (const result of results) {
    const isDuplicate = kept.some((existing) => {
      if (!existing.chunk_text || !result.chunk_text) return false;
      return textSimilarity(existing.chunk_text, result.chunk_text) > COSINE_DEDUP_THRESHOLD;
    });

    if (!isDuplicate) {
      kept.push(result);
    }
  }

  return kept;
}

function enforceTypeDiversity(results: SearchResult[]): SearchResult[] {
  const maxPerType = Math.ceil(results.length * TYPE_DIVERSITY_CAP);
  const typeCounts = new Map<PageType, number>();
  const kept: SearchResult[] = [];

  for (const result of results) {
    const count = typeCounts.get(result.page.type) ?? 0;
    if (count < maxPerType) {
      kept.push(result);
      typeCounts.set(result.page.type, count + 1);
    }
  }

  return kept;
}

function enforcePerPageCap(results: SearchResult[]): SearchResult[] {
  const pageCounts = new Map<string, number>();
  const kept: SearchResult[] = [];

  for (const result of results) {
    const count = pageCounts.get(result.page.slug) ?? 0;
    if (count < PER_PAGE_CHUNK_CAP) {
      kept.push(result);
      pageCounts.set(result.page.slug, count + 1);
    }
  }

  return kept;
}

/**
 * Simple text similarity using Jaccard similarity on word n-grams.
 * Used for near-duplicate detection.
 */
function textSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));

  let intersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) intersection++;
  }

  const union = wordsA.size + wordsB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}
