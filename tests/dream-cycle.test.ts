import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ShogunBrain } from "../src/brain.js";
import { DreamCycle } from "../src/dream/cycle.js";
import { MemoryConsolidator } from "../src/dream/consolidation.js";

describe("DreamCycle", () => {
  let brain: ShogunBrain;

  beforeEach(async () => {
    brain = new ShogunBrain({ dataDir: "memory://" });
    await brain.init();
  });

  afterEach(async () => {
    await brain.close();
  });

  it("should run full cycle without LLM router", async () => {
    await brain.pages.putPage({
      slug: "concepts/test",
      type: "concept",
      title: "Test",
      compiled_truth: "A test concept.",
    });

    const cycle = new DreamCycle(brain);
    const result = await cycle.run();

    expect(result.started_at).toBeInstanceOf(Date);
    expect(result.completed_at).toBeInstanceOf(Date);
    expect(result.sync.synced).toBeGreaterThanOrEqual(0);
    expect(result.entity_sweep.new_entities).toBe(0); // No LLM router
    expect(result.consolidation.merged).toBe(0); // No LLM router
    expect(result.health).toBeDefined();
  });

  it("should fix dead links", async () => {
    const pageA = await brain.pages.putPage({
      slug: "concepts/a",
      type: "concept",
      title: "A",
      compiled_truth: "Page A",
    });
    const pageB = await brain.pages.putPage({
      slug: "concepts/b",
      type: "concept",
      title: "B",
      compiled_truth: "Page B",
    });

    await brain.links.addLink(pageA.id, pageB.id, "related");

    // Delete pageB to create a dead link scenario
    // (FK cascade will handle this, but test the cycle's detection)
    await brain.pages.deletePage("concepts/b");

    const cycle = new DreamCycle(brain);
    const result = await cycle.run();

    // Dead link should have been cascade-deleted by FK
    expect(result.citation_fix.fixed).toBe(0);
  });

  it("should sync and embed stale pages", async () => {
    await brain.pages.putPage({
      slug: "concepts/stale",
      type: "concept",
      title: "Stale Page",
      compiled_truth: "This page needs to be chunked.",
    });

    const cycle = new DreamCycle(brain);
    const result = await cycle.run();

    expect(result.sync.synced).toBeGreaterThan(0);
  });
});

describe("MemoryConsolidator", () => {
  let brain: ShogunBrain;

  beforeEach(async () => {
    brain = new ShogunBrain({ dataDir: "memory://" });
    await brain.init();
  });

  afterEach(async () => {
    await brain.close();
  });

  it("should find merge candidates with similar titles", async () => {
    await brain.pages.putPage({
      slug: "people/john-smith",
      type: "person",
      title: "John Smith",
      compiled_truth: "An engineer.",
    });
    await brain.pages.putPage({
      slug: "people/john-smith-2",
      type: "person",
      title: "John Smith",
      compiled_truth: "A software engineer.",
    });
    await brain.pages.putPage({
      slug: "companies/acme",
      type: "company",
      title: "Acme Corp",
      compiled_truth: "A corporation.",
    });

    // Create a mock LLM router - not needed for findCandidates
    const consolidator = new MemoryConsolidator(
      brain.engine,
      brain.pages,
      brain.links,
      brain.tags,
      brain.timeline,
      { call: async () => '{"should_merge": false}' } as any
    );

    const candidates = await consolidator.findCandidates();

    // Should find the two John Smiths as candidates (same type, similar title)
    expect(candidates.length).toBe(1);
    expect(candidates[0].similarity).toBeGreaterThan(0.7);
  });

  it("should not find candidates across different types", async () => {
    await brain.pages.putPage({
      slug: "people/acme",
      type: "person",
      title: "Acme Person",
      compiled_truth: "A person.",
    });
    await brain.pages.putPage({
      slug: "companies/acme",
      type: "company",
      title: "Acme Company",
      compiled_truth: "A company.",
    });

    const consolidator = new MemoryConsolidator(
      brain.engine,
      brain.pages,
      brain.links,
      brain.tags,
      brain.timeline,
      { call: async () => '{"should_merge": false}' } as any
    );

    const candidates = await consolidator.findCandidates();
    expect(candidates.length).toBe(0);
  });
});
