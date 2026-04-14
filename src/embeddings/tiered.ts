import OpenAI from "openai";
import type { EmbeddingProvider } from "../types.js";
import { logger } from "../logger.js";

/**
 * Tiered embedding provider: supports multiple dimension sizes
 * for cost/quality tradeoff.
 *
 * Tier 1: 256 dims  — fastest, cheapest (classification, routing)
 * Tier 2: 1536 dims — balanced (general search)
 * Tier 3: 3072 dims — highest quality (precision search)
 */
export type EmbeddingTier = "fast" | "balanced" | "full";

const TIER_CONFIG: Record<EmbeddingTier, { dimensions: number }> = {
  fast: { dimensions: 256 },
  balanced: { dimensions: 1536 },
  full: { dimensions: 3072 },
};

export class TieredEmbeddingProvider implements EmbeddingProvider {
  private client: OpenAI;
  private model: string;
  private tier: EmbeddingTier;
  public dimensions: number;
  private batchSize: number;
  private rateLimitDelay: number;

  constructor(options: {
    apiKey: string;
    model?: string;
    tier?: EmbeddingTier;
    batchSize?: number;
    rateLimitRPM?: number;
  }) {
    this.client = new OpenAI({ apiKey: options.apiKey });
    this.model = options.model ?? "text-embedding-3-large";
    this.tier = options.tier ?? "balanced";
    this.dimensions = TIER_CONFIG[this.tier].dimensions;
    this.batchSize = options.batchSize ?? 100;
    // Rate limit: convert RPM to delay between batches
    const rpm = options.rateLimitRPM ?? 3000;
    this.rateLimitDelay = Math.ceil(60000 / rpm);
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const allEmbeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize);

      if (i > 0 && this.rateLimitDelay > 0) {
        await sleep(this.rateLimitDelay);
      }

      try {
        const response = await this.client.embeddings.create({
          model: this.model,
          input: batch,
          dimensions: this.dimensions,
        });

        const sorted = response.data.sort((a, b) => a.index - b.index);
        allEmbeddings.push(...sorted.map((e) => e.embedding));

        logger.debug(
          `Embedded batch ${Math.floor(i / this.batchSize) + 1}: ${batch.length} texts, tier=${this.tier}`
        );
      } catch (error: unknown) {
        const err = error as { status?: number; message?: string };
        if (err.status === 429) {
          // Rate limited — exponential backoff
          const wait = this.rateLimitDelay * 4;
          logger.warn(`Rate limited, waiting ${wait}ms before retry`);
          await sleep(wait);

          const response = await this.client.embeddings.create({
            model: this.model,
            input: batch,
            dimensions: this.dimensions,
          });

          const sorted = response.data.sort((a, b) => a.index - b.index);
          allEmbeddings.push(...sorted.map((e) => e.embedding));
        } else {
          throw error;
        }
      }
    }

    return allEmbeddings;
  }

  getTier(): EmbeddingTier {
    return this.tier;
  }

  getCostEstimate(tokenCount: number): number {
    // text-embedding-3-large pricing: $0.13 per 1M tokens
    return (tokenCount / 1_000_000) * 0.13;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
