import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ShogunBrain } from "../src/brain.js";

describe("ShogunBrain", () => {
  let brain: ShogunBrain;

  beforeEach(async () => {
    brain = new ShogunBrain({ dataDir: "memory://" });
    await brain.init();
  });

  afterEach(async () => {
    await brain.close();
  });

  it("should initialize successfully", async () => {
    const stats = await brain.getStats();
    expect(stats.total_pages).toBe(0);
  });

  it("should create pages and get stats", async () => {
    await brain.pages.putPage({
      slug: "people/toru",
      type: "person",
      title: "Toru",
      compiled_truth: "A founder in Tokyo.",
    });

    await brain.pages.putPage({
      slug: "companies/select",
      type: "company",
      title: "Select KK",
      compiled_truth: "An AI company.",
    });

    const stats = await brain.getStats();
    expect(stats.total_pages).toBe(2);
    expect(stats.pages_by_type.person).toBe(1);
    expect(stats.pages_by_type.company).toBe(1);
  });

  it("should rechunk a page", async () => {
    const page = await brain.pages.putPage({
      slug: "concepts/test",
      type: "concept",
      title: "Test Concept",
      compiled_truth: "This is a test concept with enough content to be chunked properly.",
    });

    await brain.rechunkPage(page.id);

    const stats = await brain.getStats();
    expect(stats.total_chunks).toBeGreaterThan(0);
  });

  it("should run syncAll", async () => {
    await brain.pages.putPage({
      slug: "concepts/sync1",
      type: "concept",
      title: "Sync 1",
      compiled_truth: "Content for sync test.",
    });

    const result = await brain.syncAll(false);
    expect(result.synced).toBe(1);
    expect(result.skipped).toBe(0);

    // Running again should skip
    const result2 = await brain.syncAll(false);
    expect(result2.synced).toBe(0);
    expect(result2.skipped).toBe(1);
  });

  it("should get health report", async () => {
    const health = await brain.getHealth();
    expect(health).toHaveProperty("embed_coverage");
    expect(health).toHaveProperty("stale_pages");
    expect(health).toHaveProperty("orphan_pages");
  });

  it("should run dream cycle", async () => {
    await brain.pages.putPage({
      slug: "concepts/dream",
      type: "concept",
      title: "Dream",
      compiled_truth: "Dream cycle test content.",
    });

    const result = await brain.runDreamCycle();
    expect(result.synced).toBeGreaterThanOrEqual(0);
    expect(result.health).toBeTruthy();
  });

  it("should do full CRUD workflow", async () => {
    // Create
    const page = await brain.pages.putPage({
      slug: "people/workflow-test",
      type: "person",
      title: "Workflow Test",
      compiled_truth: "Initial bio.",
    });
    expect(page.id).toBeTruthy();

    // Add tags
    await brain.tags.addTag(page.id, "test");
    await brain.tags.addTag(page.id, "workflow");
    const tags = await brain.tags.getTagsForPage(page.id);
    expect(tags).toContain("test");

    // Add timeline entry
    await brain.timeline.addEntry(page.id, "2025-01-01", "Created for testing");
    const entries = await brain.timeline.getEntriesBySlug("people/workflow-test");
    expect(entries.length).toBe(1);

    // Create another page and link
    const company = await brain.pages.putPage({
      slug: "companies/workflow-co",
      type: "company",
      title: "Workflow Co",
      compiled_truth: "A test company.",
    });
    await brain.links.addLink(page.id, company.id, "works_at");

    const outgoing = await brain.links.getOutgoingLinks(page.id);
    expect(outgoing.length).toBe(1);

    // Update page (should version)
    await brain.pages.putPage({
      slug: "people/workflow-test",
      type: "person",
      title: "Workflow Test",
      compiled_truth: "Updated bio with more details.",
    });

    const versions = await brain.pages.getVersions("people/workflow-test");
    expect(versions.length).toBe(1);

    // Delete
    await brain.pages.deletePage("people/workflow-test");
    const deleted = await brain.pages.getPage("people/workflow-test");
    expect(deleted).toBeNull();
  });
});
