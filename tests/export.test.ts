import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ShogunBrain } from "../src/brain.js";
import { BrainExporter } from "../src/integrations/export.js";

describe("BrainExporter", () => {
  let brain: ShogunBrain;

  beforeEach(async () => {
    brain = new ShogunBrain({ dataDir: "memory://" });
    await brain.init();
  });

  afterEach(async () => {
    await brain.close();
  });

  it("should export empty brain", async () => {
    const exporter = new BrainExporter(brain);
    const data = await exporter.exportAll();

    expect(data.version).toBe(1);
    expect(data.pages).toEqual([]);
    expect(data.links).toEqual([]);
    expect(data.stats.pages).toBe(0);
  });

  it("should export and import pages with tags and links", async () => {
    // Create test data
    const pageA = await brain.pages.putPage({
      slug: "people/alice",
      type: "person",
      title: "Alice",
      compiled_truth: "Alice is a developer.",
    });
    const pageB = await brain.pages.putPage({
      slug: "companies/acme",
      type: "company",
      title: "Acme Corp",
      compiled_truth: "A tech company.",
    });

    await brain.tags.addTag(pageA.id, "engineer");
    await brain.tags.addTag(pageA.id, "tokyo");
    await brain.links.addLink(pageA.id, pageB.id, "works_at");
    await brain.timeline.addEntry(pageA.id, "2025-01-15", "Joined Acme", "hr");

    // Export
    const exporter = new BrainExporter(brain);
    const exported = await exporter.exportAll();

    expect(exported.stats.pages).toBe(2);
    expect(exported.stats.links).toBe(1);
    expect(exported.stats.tags).toBe(2);
    expect(exported.stats.timeline_entries).toBe(1);

    const alicePage = exported.pages.find((p) => p.slug === "people/alice");
    expect(alicePage).toBeTruthy();
    expect(alicePage!.tags).toContain("engineer");
    expect(alicePage!.timeline_entries.length).toBe(1);

    // Import into fresh brain
    const brain2 = new ShogunBrain({ dataDir: "memory://" });
    await brain2.init();

    const exporter2 = new BrainExporter(brain2);
    const result = await exporter2.importAll(exported);

    expect(result.imported).toBe(2);
    expect(result.links_created).toBe(1);

    // Verify imported data
    const alice = await brain2.pages.getPage("people/alice");
    expect(alice).toBeTruthy();
    expect(alice!.title).toBe("Alice");

    const tags = await brain2.tags.getTagsForPage(alice!.id);
    expect(tags).toContain("engineer");

    await brain2.close();
  });

  it("should be idempotent on re-import", async () => {
    await brain.pages.putPage({
      slug: "concepts/test",
      type: "concept",
      title: "Test",
      compiled_truth: "Test content.",
    });

    const exporter = new BrainExporter(brain);
    const exported = await exporter.exportAll();

    // Import same data again
    const result = await exporter.importAll(exported);
    expect(result.skipped).toBe(1); // Same content hash
  });

  it("should export to JSON string and import back", async () => {
    await brain.pages.putPage({
      slug: "people/bob",
      type: "person",
      title: "Bob",
      compiled_truth: "Bob is a designer.",
    });

    const exporter = new BrainExporter(brain);
    const json = await exporter.exportToJSON();
    expect(typeof json).toBe("string");

    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(1);
    expect(parsed.pages.length).toBe(1);

    // Import from JSON
    const brain2 = new ShogunBrain({ dataDir: "memory://" });
    await brain2.init();
    const exporter2 = new BrainExporter(brain2);
    const result = await exporter2.importFromJSON(json);
    expect(result.imported).toBe(1);
    await brain2.close();
  });
});
