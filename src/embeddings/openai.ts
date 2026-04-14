import OpenAI from "openai";
import type { EmbeddingProvider } from "../types.js";

export interface OpenAIEmbeddingOptions {
  apiKey: string;
  model?: string;
  dimensions?: number;
  batchSize?: number;
}

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private client: OpenAI;
  private model: string;
  public dimensions: number;
  private batchSize: number;

  constructor(options: OpenAIEmbeddingOptions) {
    this.client = new OpenAI({ apiKey: options.apiKey });
    this.model = options.model ?? "text-embedding-3-large";
    this.dimensions = options.dimensions ?? 1536;
    this.batchSize = options.batchSize ?? 100;
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const allEmbeddings: number[][] = [];

    // Process in batches
    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize);
      const response = await this.client.embeddings.create({
        model: this.model,
        input: batch,
        dimensions: this.dimensions,
      });

      const sorted = response.data.sort((a, b) => a.index - b.index);
      allEmbeddings.push(...sorted.map((e) => e.embedding));
    }

    return allEmbeddings;
  }
}
