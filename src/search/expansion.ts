/**
 * Multi-query expansion: takes a user query and expands it into multiple
 * search queries for better recall. Uses an LLM (Claude Haiku) for expansion,
 * or falls back to simple heuristic expansion.
 */

export interface QueryExpander {
  expand(query: string): Promise<string[]>;
}

/**
 * Heuristic query expander (no LLM required).
 * Generates variations of the query for broader search coverage.
 */
export class HeuristicExpander implements QueryExpander {
  async expand(query: string): Promise<string[]> {
    const queries = [query];

    // Add a noun-phrase focused version
    const words = query.split(/\s+/).filter((w) => w.length > 2);
    if (words.length > 3) {
      // Take key terms (skip stopwords)
      const stopwords = new Set([
        "the", "a", "an", "is", "are", "was", "were", "be", "been",
        "being", "have", "has", "had", "do", "does", "did", "will",
        "would", "could", "should", "may", "might", "can", "shall",
        "about", "with", "from", "into", "what", "when", "where",
        "who", "how", "which", "that", "this", "these", "those",
      ]);
      const keyTerms = words.filter((w) => !stopwords.has(w.toLowerCase()));
      if (keyTerms.length >= 2) {
        queries.push(keyTerms.join(" "));
      }
    }

    // Add a Japanese-aware version if query contains CJK characters
    if (/[\u3000-\u9fff]/.test(query)) {
      queries.push(query);
    }

    return queries;
  }
}

/**
 * LLM-based query expander using Claude Haiku or similar.
 * Generates semantically diverse queries for better recall.
 */
export class LLMExpander implements QueryExpander {
  private callLLM: (prompt: string) => Promise<string>;

  constructor(llmCallFn: (prompt: string) => Promise<string>) {
    this.callLLM = llmCallFn;
  }

  async expand(query: string): Promise<string[]> {
    const prompt = `Given the search query "${query}", generate 3 alternative search queries that would help find relevant information. Each query should approach the topic from a different angle.

Return ONLY the queries, one per line. Do not number them or add explanations.`;

    try {
      const response = await this.callLLM(prompt);
      const expanded = response
        .split("\n")
        .map((q) => q.trim())
        .filter((q) => q.length > 0);

      return [query, ...expanded];
    } catch {
      // Fallback to original query on LLM failure
      return [query];
    }
  }
}
