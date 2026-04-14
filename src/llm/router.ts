import { logger } from "../logger.js";

/**
 * Multi-provider LLM router: automatically selects the cheapest model
 * that meets the task requirements.
 *
 * Routing strategy:
 *   - Light tasks (classification, tagging, query expansion) → cheapest
 *   - Medium tasks (entity extraction, summarization) → balanced
 *   - Heavy tasks (memory consolidation, complex reasoning) → premium
 *
 * Providers supported:
 *   - Anthropic (Claude Haiku / Sonnet / Opus)
 *   - OpenAI (GPT-4o-mini / GPT-4o)
 *   - Local (Ollama - offline fallback)
 */

export type TaskComplexity = "light" | "medium" | "heavy";

export interface LLMProvider {
  name: string;
  call(prompt: string, options?: LLMCallOptions): Promise<string>;
  costPer1MTokens: number;
  available: boolean;
}

export interface LLMCallOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

interface ProviderConfig {
  name: string;
  costPer1MTokens: number;
  createFn: () => LLMProvider | null;
}

export class LLMRouter {
  private providers: LLMProvider[] = [];
  private taskRouting: Map<TaskComplexity, LLMProvider | null> = new Map();

  constructor(configs?: ProviderConfig[]) {
    if (configs) {
      for (const config of configs) {
        const provider = config.createFn();
        if (provider) {
          this.providers.push(provider);
        }
      }
    }
    this.updateRouting();
  }

  addProvider(provider: LLMProvider): void {
    this.providers.push(provider);
    this.updateRouting();
  }

  private updateRouting(): void {
    // Sort by cost ascending
    const available = this.providers
      .filter((p) => p.available)
      .sort((a, b) => a.costPer1MTokens - b.costPer1MTokens);

    if (available.length === 0) {
      this.taskRouting.set("light", null);
      this.taskRouting.set("medium", null);
      this.taskRouting.set("heavy", null);
      return;
    }

    // Light → cheapest, Medium → middle, Heavy → most expensive
    this.taskRouting.set("light", available[0]);
    this.taskRouting.set(
      "medium",
      available[Math.floor(available.length / 2)]
    );
    this.taskRouting.set("heavy", available[available.length - 1]);
  }

  async call(
    prompt: string,
    complexity: TaskComplexity = "light",
    options?: LLMCallOptions
  ): Promise<string> {
    const provider = this.taskRouting.get(complexity);

    if (!provider) {
      throw new Error(
        `No LLM provider available for complexity=${complexity}. ` +
        `Configure at least one provider (ANTHROPIC_API_KEY or OPENAI_API_KEY).`
      );
    }

    logger.info("LLM call", {
      provider: provider.name,
      complexity,
      cost: provider.costPer1MTokens,
    });

    return provider.call(prompt, options);
  }

  getProviderForTask(complexity: TaskComplexity): LLMProvider | null {
    return this.taskRouting.get(complexity) ?? null;
  }

  getCostEstimate(complexity: TaskComplexity, estimatedTokens: number): number {
    const provider = this.taskRouting.get(complexity);
    if (!provider) return 0;
    return (estimatedTokens / 1_000_000) * provider.costPer1MTokens;
  }

  listProviders(): { name: string; cost: number; available: boolean }[] {
    return this.providers.map((p) => ({
      name: p.name,
      cost: p.costPer1MTokens,
      available: p.available,
    }));
  }
}

/**
 * Create an Anthropic Claude provider.
 */
export function createClaudeProvider(
  apiKey: string,
  model: "haiku" | "sonnet" | "opus" = "haiku"
): LLMProvider {
  const modelMap = {
    haiku: { id: "claude-haiku-4-5-20251001", cost: 0.8 },
    sonnet: { id: "claude-sonnet-4-5-20241022", cost: 3.0 },
    opus: { id: "claude-opus-4-0-20250514", cost: 15.0 },
  };

  const config = modelMap[model];

  return {
    name: `claude-${model}`,
    costPer1MTokens: config.cost,
    available: true,
    async call(prompt: string, options?: LLMCallOptions): Promise<string> {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: config.id,
          max_tokens: options?.maxTokens ?? 1024,
          system: options?.systemPrompt,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as {
        content: { type: string; text: string }[];
      };
      return data.content[0]?.text ?? "";
    },
  };
}

/**
 * Create an OpenAI GPT provider.
 */
export function createOpenAIProvider(
  apiKey: string,
  model: "gpt-4o-mini" | "gpt-4o" = "gpt-4o-mini"
): LLMProvider {
  const costMap = {
    "gpt-4o-mini": 0.15,
    "gpt-4o": 2.5,
  };

  return {
    name: model,
    costPer1MTokens: costMap[model],
    available: true,
    async call(prompt: string, options?: LLMCallOptions): Promise<string> {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          max_tokens: options?.maxTokens ?? 1024,
          temperature: options?.temperature ?? 0.3,
          messages: [
            ...(options?.systemPrompt
              ? [{ role: "system" as const, content: options.systemPrompt }]
              : []),
            { role: "user" as const, content: prompt },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as {
        choices: { message: { content: string } }[];
      };
      return data.choices[0]?.message?.content ?? "";
    },
  };
}
