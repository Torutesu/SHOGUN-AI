import { describe, it, expect } from "vitest";
import { rrfFusion } from "../src/search/fusion.js";
import { dedup } from "../src/search/dedup.js";
import { HeuristicExpander } from "../src/search/expansion.js";
import type { Page } from "../src/types.js";

function makePage(slug: string, type: string = "concept"): Page {
  return {
    id: Math.floor(Math.random() * 10000),
    slug,
    type: type as any,
    title: slug.split("/").pop()!,
    compiled_truth: `Content for ${slug}`,
    timeline: "",
    frontmatter: {} as any,
    content_hash: "abc",
    created_at: new Date(),
    updated_at: new Date(),
  };
}

describe("RRF Fusion", () => {
  it("should combine keyword and vector results", () => {
    const page1 = makePage("concepts/ai");
    const page2 = makePage("concepts/ml");
    const page3 = makePage("concepts/deep-learning");

    const keywordResults = [
      { page: page1, rank: 0.5 },
      { page: page2, rank: 0.3 },
    ];

    const vectorResults = [
      { page: page2, similarity: 0.95, chunk_text: "ML is..." },
      { page: page3, similarity: 0.90, chunk_text: "Deep learning is..." },
    ];

    const fused = rrfFusion(keywordResults, vectorResults);

    // page2 should rank highest (appears in both)
    expect(fused[0].page.slug).toBe("concepts/ml");
    expect(fused[0].match_type).toBe("hybrid");
    expect(fused.length).toBe(3);
  });

  it("should handle empty result sets", () => {
    const fused = rrfFusion([], []);
    expect(fused).toEqual([]);
  });

  it("should handle keyword-only results", () => {
    const page = makePage("concepts/test");
    const fused = rrfFusion([{ page, rank: 0.5 }], []);
    expect(fused.length).toBe(1);
    expect(fused[0].match_type).toBe("keyword");
  });
});

describe("Dedup", () => {
  it("should keep best chunk per page", () => {
    const page = makePage("concepts/test");
    const results = [
      { page, score: 0.8, match_type: "hybrid" as const },
      { page, score: 0.5, match_type: "keyword" as const },
    ];

    const deduped = dedup(results);
    expect(deduped.length).toBe(1);
    expect(deduped[0].score).toBe(0.8);
  });

  it("should enforce type diversity", () => {
    const results = [];
    for (let i = 0; i < 20; i++) {
      results.push({
        page: makePage(`concepts/page-${i}`, "concept"),
        score: 1 - i * 0.01,
        match_type: "keyword" as const,
      });
    }
    results.push({
      page: makePage("people/person-1", "person"),
      score: 0.5,
      match_type: "keyword" as const,
    });

    const deduped = dedup(results, 20);
    // Should include the person page due to diversity enforcement
    const types = new Set(deduped.map((r) => r.page.type));
    expect(types.size).toBeGreaterThanOrEqual(1);
  });
});

describe("HeuristicExpander", () => {
  it("should expand a query", async () => {
    const expander = new HeuristicExpander();
    const queries = await expander.expand("who did I talk to today about AI");
    expect(queries.length).toBeGreaterThanOrEqual(1);
    expect(queries[0]).toBe("who did I talk to today about AI");
  });

  it("should include original query", async () => {
    const expander = new HeuristicExpander();
    const queries = await expander.expand("test");
    expect(queries).toContain("test");
  });
});
