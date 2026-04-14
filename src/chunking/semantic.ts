import type { EmbeddingProvider } from "../types.js";
import { recursiveChunk } from "./recursive.js";

export interface SemanticChunkOptions {
  maxChunkSize?: number;
  similarityThreshold?: number;
  embeddingProvider?: EmbeddingProvider;
}

/**
 * Semantic chunking: first split into small segments, then merge
 * adjacent segments that are semantically similar.
 *
 * Requires an embedding provider. Falls back to recursive chunking
 * if no provider is available.
 */
export async function semanticChunk(
  text: string,
  options: SemanticChunkOptions = {}
): Promise<string[]> {
  const maxSize = options.maxChunkSize ?? 1500;
  const threshold = options.similarityThreshold ?? 0.75;
  const provider = options.embeddingProvider;

  // Small initial segments
  const segments = recursiveChunk(text, {
    maxChunkSize: 200,
    chunkOverlap: 0,
  });

  if (segments.length <= 1) return segments;
  if (!provider) {
    // No embedding provider, fall back to recursive
    return recursiveChunk(text, { maxChunkSize: maxSize });
  }

  // Get embeddings for all segments
  const embeddings = await provider.embed(segments);

  // Merge adjacent segments with high similarity
  const merged: string[] = [];
  let current = segments[0];
  let currentIdx = 0;

  for (let i = 1; i < segments.length; i++) {
    const sim = cosineSimilarity(embeddings[currentIdx], embeddings[i]);
    const candidate = current + "\n" + segments[i];

    if (sim >= threshold && candidate.length <= maxSize) {
      current = candidate;
    } else {
      merged.push(current);
      current = segments[i];
      currentIdx = i;
    }
  }

  if (current.trim()) {
    merged.push(current);
  }

  return merged;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}
