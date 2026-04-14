import { describe, it, expect } from "vitest";
import { LLMRouter } from "../src/llm/router.js";
import type { LLMProvider } from "../src/llm/router.js";

function mockProvider(name: string, cost: number): LLMProvider {
  return {
    name,
    costPer1MTokens: cost,
    available: true,
    async call(prompt: string) {
      return `Response from ${name}: ${prompt.slice(0, 20)}`;
    },
  };
}

describe("LLMRouter", () => {
  it("should route light tasks to cheapest provider", async () => {
    const router = new LLMRouter();
    router.addProvider(mockProvider("expensive", 15.0));
    router.addProvider(mockProvider("cheap", 0.15));
    router.addProvider(mockProvider("mid", 3.0));

    const result = await router.call("test query", "light");
    expect(result).toContain("cheap");
  });

  it("should route heavy tasks to most expensive provider", async () => {
    const router = new LLMRouter();
    router.addProvider(mockProvider("cheap", 0.15));
    router.addProvider(mockProvider("expensive", 15.0));

    const result = await router.call("complex reasoning", "heavy");
    expect(result).toContain("expensive");
  });

  it("should throw when no providers available", async () => {
    const router = new LLMRouter();
    await expect(router.call("test", "light")).rejects.toThrow("No LLM provider available");
  });

  it("should list providers with costs", () => {
    const router = new LLMRouter();
    router.addProvider(mockProvider("a", 1.0));
    router.addProvider(mockProvider("b", 5.0));

    const list = router.listProviders();
    expect(list.length).toBe(2);
    expect(list[0].name).toBe("a");
    expect(list[0].cost).toBe(1.0);
  });

  it("should estimate cost", () => {
    const router = new LLMRouter();
    router.addProvider(mockProvider("model", 10.0));

    const cost = router.getCostEstimate("light", 1_000_000);
    expect(cost).toBe(10.0);
  });

  it("should handle single provider for all tiers", async () => {
    const router = new LLMRouter();
    router.addProvider(mockProvider("only-one", 3.0));

    // Single provider handles all complexity levels
    const light = await router.call("light task", "light");
    const heavy = await router.call("heavy task", "heavy");
    expect(light).toContain("only-one");
    expect(heavy).toContain("only-one");
  });
});
