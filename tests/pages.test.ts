import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PostgresEngine } from "../src/engine/postgres.js";
import { PageStore } from "../src/memory/pages.js";
import { TagStore } from "../src/memory/tags.js";
import { TimelineStore } from "../src/memory/timeline.js";
import { LinkStore } from "../src/memory/links.js";

describe("PageStore", () => {
  let engine: PostgresEngine;
  let pages: PageStore;

  beforeEach(async () => {
    engine = new PostgresEngine({ dataDir: "memory://" });
    await engine.init();
    pages = new PageStore(engine);
  });

  afterEach(async () => {
    await engine.close();
  });

  it("should create a new page", async () => {
    const page = await pages.putPage({
      slug: "people/toru-yamamoto",
      type: "person",
      title: "Toru Yamamoto",
      compiled_truth: "Select KK founder. Building SHOGUN.",
    });

    expect(page.slug).toBe("people/toru-yamamoto");
    expect(page.type).toBe("person");
    expect(page.title).toBe("Toru Yamamoto");
    expect(page.compiled_truth).toBe("Select KK founder. Building SHOGUN.");
    expect(page.content_hash).toBeTruthy();
  });

  it("should retrieve a page by slug", async () => {
    await pages.putPage({
      slug: "companies/select-kk",
      type: "company",
      title: "Select KK",
      compiled_truth: "Tokyo-based AI company.",
    });

    const retrieved = await pages.getPage("companies/select-kk");
    expect(retrieved).not.toBeNull();
    expect(retrieved!.title).toBe("Select KK");
  });

  it("should update an existing page and auto-version", async () => {
    await pages.putPage({
      slug: "concepts/memory-layer",
      type: "concept",
      title: "Memory Layer",
      compiled_truth: "Version 1 content",
    });

    const updated = await pages.putPage({
      slug: "concepts/memory-layer",
      type: "concept",
      title: "Memory Layer",
      compiled_truth: "Version 2 content - updated",
    });

    expect(updated.compiled_truth).toBe("Version 2 content - updated");

    // Check version was saved
    const versions = await pages.getVersions("concepts/memory-layer");
    expect(versions.length).toBe(1);
    expect(versions[0].version_number).toBe(1);
  });

  it("should skip update when content hash matches (idempotency)", async () => {
    const first = await pages.putPage({
      slug: "concepts/idempotent",
      type: "concept",
      title: "Idempotent",
      compiled_truth: "Same content",
    });

    const second = await pages.putPage({
      slug: "concepts/idempotent",
      type: "concept",
      title: "Idempotent",
      compiled_truth: "Same content",
    });

    expect(second.id).toBe(first.id);

    // No new version created since content didn't change
    const versions = await pages.getVersions("concepts/idempotent");
    expect(versions.length).toBe(0);
  });

  it("should delete a page", async () => {
    await pages.putPage({
      slug: "people/delete-me",
      type: "person",
      title: "Delete Me",
      compiled_truth: "To be deleted",
    });

    const deleted = await pages.deletePage("people/delete-me");
    expect(deleted).toBe(true);

    const retrieved = await pages.getPage("people/delete-me");
    expect(retrieved).toBeNull();
  });

  it("should list pages with type filter", async () => {
    await pages.putPage({ slug: "people/a", type: "person", title: "A", compiled_truth: "A" });
    await pages.putPage({ slug: "people/b", type: "person", title: "B", compiled_truth: "B" });
    await pages.putPage({ slug: "companies/c", type: "company", title: "C", compiled_truth: "C" });

    const personPages = await pages.listPages({ type: "person" });
    expect(personPages.length).toBe(2);

    const companyPages = await pages.listPages({ type: "company" });
    expect(companyPages.length).toBe(1);
  });

  it("should revert to a previous version", async () => {
    await pages.putPage({
      slug: "concepts/revert",
      type: "concept",
      title: "Revert Test",
      compiled_truth: "Original content",
    });

    await pages.putPage({
      slug: "concepts/revert",
      type: "concept",
      title: "Revert Test",
      compiled_truth: "Modified content",
    });

    const reverted = await pages.revertToVersion("concepts/revert", 1);
    expect(reverted).not.toBeNull();
    expect(reverted!.compiled_truth).toBe("Original content");
  });

  it("should render page as markdown", async () => {
    const page = await pages.putPage({
      slug: "people/test",
      type: "person",
      title: "Test Person",
      compiled_truth: "A test person for unit tests.",
      timeline: "- 2025-01-01: Created",
      frontmatter: { tags: ["test", "dev"] },
    });

    const md = await pages.renderMarkdown(page);
    expect(md).toContain("type: person");
    expect(md).toContain("title: Test Person");
    expect(md).toContain("tags: [test, dev]");
    expect(md).toContain("A test person for unit tests.");
    expect(md).toContain("- 2025-01-01: Created");
  });
});

describe("TagStore", () => {
  let engine: PostgresEngine;
  let pages: PageStore;
  let tags: TagStore;

  beforeEach(async () => {
    engine = new PostgresEngine({ dataDir: "memory://" });
    await engine.init();
    pages = new PageStore(engine);
    tags = new TagStore(engine);
  });

  afterEach(async () => {
    await engine.close();
  });

  it("should add and retrieve tags", async () => {
    const page = await pages.putPage({
      slug: "people/tagged",
      type: "person",
      title: "Tagged Person",
      compiled_truth: "Has tags.",
    });

    await tags.addTag(page.id, "founder");
    await tags.addTag(page.id, "tokyo");

    const pageTags = await tags.getTagsForPage(page.id);
    expect(pageTags).toContain("founder");
    expect(pageTags).toContain("tokyo");
  });

  it("should remove tags", async () => {
    const page = await pages.putPage({
      slug: "people/untag",
      type: "person",
      title: "Untag Person",
      compiled_truth: "Will lose a tag.",
    });

    await tags.addTag(page.id, "removeme");
    const removed = await tags.removeTag(page.id, "removeme");
    expect(removed).toBe(true);

    const pageTags = await tags.getTagsForPage(page.id);
    expect(pageTags).not.toContain("removeme");
  });

  it("should be idempotent on duplicate tags", async () => {
    const page = await pages.putPage({
      slug: "people/duptag",
      type: "person",
      title: "Dup Tag",
      compiled_truth: "Dup.",
    });

    await tags.addTag(page.id, "unique");
    await tags.addTag(page.id, "unique"); // Should not throw

    const pageTags = await tags.getTagsForPage(page.id);
    expect(pageTags.filter((t) => t === "unique").length).toBe(1);
  });
});

describe("TimelineStore", () => {
  let engine: PostgresEngine;
  let pages: PageStore;
  let timeline: TimelineStore;

  beforeEach(async () => {
    engine = new PostgresEngine({ dataDir: "memory://" });
    await engine.init();
    pages = new PageStore(engine);
    timeline = new TimelineStore(engine);
  });

  afterEach(async () => {
    await engine.close();
  });

  it("should add timeline entries and update page timeline", async () => {
    const page = await pages.putPage({
      slug: "people/timeline-test",
      type: "person",
      title: "Timeline Test",
      compiled_truth: "Person with timeline.",
    });

    await timeline.addEntry(page.id, "2025-01-15", "Founded company");
    await timeline.addEntry(page.id, "2025-06-01", "Launched product");

    const entries = await timeline.getEntries(page.id);
    expect(entries.length).toBe(2);

    // Check page timeline was updated
    const updated = await pages.getPage("people/timeline-test");
    expect(updated!.timeline).toContain("2025-01-15: Founded company");
    expect(updated!.timeline).toContain("2025-06-01: Launched product");
  });
});

describe("LinkStore", () => {
  let engine: PostgresEngine;
  let pages: PageStore;
  let links: LinkStore;

  beforeEach(async () => {
    engine = new PostgresEngine({ dataDir: "memory://" });
    await engine.init();
    pages = new PageStore(engine);
    links = new LinkStore(engine);
  });

  afterEach(async () => {
    await engine.close();
  });

  it("should create and query links", async () => {
    const person = await pages.putPage({
      slug: "people/founder",
      type: "person",
      title: "Founder",
      compiled_truth: "A founder.",
    });
    const company = await pages.putPage({
      slug: "companies/startup",
      type: "company",
      title: "Startup",
      compiled_truth: "A startup.",
    });

    await links.addLink(person.id, company.id, "founded");

    const outgoing = await links.getOutgoingLinks(person.id);
    expect(outgoing.length).toBe(1);
    expect(outgoing[0].to_slug).toBe("companies/startup");
    expect(outgoing[0].link_type).toBe("founded");

    const backlinks = await links.getBacklinks(company.id);
    expect(backlinks.length).toBe(1);
    expect(backlinks[0].from_slug).toBe("people/founder");
  });

  it("should traverse the graph", async () => {
    const a = await pages.putPage({ slug: "concepts/a", type: "concept", title: "A", compiled_truth: "A" });
    const b = await pages.putPage({ slug: "concepts/b", type: "concept", title: "B", compiled_truth: "B" });
    const c = await pages.putPage({ slug: "concepts/c", type: "concept", title: "C", compiled_truth: "C" });

    await links.addLink(a.id, b.id, "related");
    await links.addLink(b.id, c.id, "related");

    const graph = await links.traverseGraph(a.id, 2);
    expect(graph.length).toBe(2);
    expect(graph.map((n) => n.page.slug)).toContain("concepts/b");
    expect(graph.map((n) => n.page.slug)).toContain("concepts/c");
  });
});
