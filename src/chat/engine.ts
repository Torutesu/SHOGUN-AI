import type { ShogunBrain } from "../brain.js";
import type { LLMRouter } from "../llm/router.js";
import type { SearchResult } from "../types.js";
import { SYSTEM_PROMPTS } from "../identity.js";
import { logger } from "../logger.js";

/**
 * SHOGUN Chat Engine — "Ask Your Memory"
 *
 * Conversational interface that queries the Brain and uses LLM
 * to synthesize answers from memory. This is the killer feature
 * that differentiates SHOGUN from file-based note tools.
 *
 * Flow:
 * 1. User asks a question ("Who did I meet last week?")
 * 2. Hybrid search finds relevant pages/chunks
 * 3. LLM synthesizes answer using search results as context
 * 4. Response includes citations (page slugs)
 */

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  citations?: { slug: string; title: string; snippet: string }[];
  timestamp: Date;
}

export interface ChatOptions {
  /** Max search results to include as context */
  maxContext?: number;
  /** LLM complexity for response generation */
  complexity?: "light" | "medium" | "heavy";
  /** Include timeline entries in context */
  includeTimeline?: boolean;
}

const SYSTEM_PROMPT = SYSTEM_PROMPTS.chat;

export class ChatEngine {
  private history: ChatMessage[] = [];

  constructor(
    private brain: ShogunBrain,
    private llmRouter: LLMRouter
  ) {}

  /**
   * Send a message and get a response grounded in memory.
   */
  async chat(
    userMessage: string,
    options: ChatOptions = {}
  ): Promise<ChatMessage> {
    const maxContext = options.maxContext ?? 8;
    const complexity = options.complexity ?? "medium";

    // Record user message
    this.history.push({
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    });

    // Step 1: Search memory for relevant context
    const searchResults = await this.brain.searchPipeline.query({
      query: userMessage,
      limit: maxContext,
    });

    // Step 2: Build context from search results
    const context = this.buildContext(searchResults, options.includeTimeline ?? true);
    const citations = searchResults.map((r) => ({
      slug: r.page.slug,
      title: r.page.title,
      snippet: r.chunk_text ?? r.page.compiled_truth.slice(0, 150),
    }));

    // Step 3: Generate response with LLM
    const prompt = this.buildPrompt(userMessage, context);

    let responseText: string;
    try {
      responseText = await this.llmRouter.call(prompt, complexity, {
        systemPrompt: SYSTEM_PROMPT,
        maxTokens: 2048,
        temperature: 0.3,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`Chat LLM call failed: ${msg}`);
      responseText = searchResults.length > 0
        ? `I found ${searchResults.length} relevant memories but couldn't generate a response. Here are the top results:\n\n${citations.map((c) => `- **${c.title}** (${c.slug}): ${c.snippet}`).join("\n")}`
        : "I couldn't find any relevant information in your memory for that question.";
    }

    // Record assistant message
    const response: ChatMessage = {
      role: "assistant",
      content: responseText,
      citations: citations.length > 0 ? citations : undefined,
      timestamp: new Date(),
    };
    this.history.push(response);

    return response;
  }

  private buildContext(results: SearchResult[], includeTimeline: boolean): string {
    if (results.length === 0) return "<memory>\nNo relevant information found in memory.\n</memory>";

    const sections = results.map((r) => {
      let section = `## ${r.page.title} (${r.page.slug})\nType: ${r.page.type} | Score: ${r.score.toFixed(3)}\n\n`;
      section += r.page.compiled_truth;
      if (includeTimeline && r.page.timeline) {
        section += `\n\nTimeline:\n${r.page.timeline}`;
      }
      return section;
    });

    return `<memory>\n${sections.join("\n\n---\n\n")}\n</memory>`;
  }

  private buildPrompt(userMessage: string, context: string): string {
    // Include recent conversation history for multi-turn
    const recentHistory = this.history
      .slice(-6) // Last 3 turns
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n\n");

    return `${context}\n\nConversation:\n${recentHistory}\n\nUser: ${userMessage}\n\nAssistant:`;
  }

  getHistory(): ChatMessage[] {
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [];
  }
}
