import type { ShogunBrain } from "../brain.js";
import type { Page } from "../types.js";
import { logger } from "../logger.js";

/**
 * Brain export/import: backup and restore SHOGUN memory.
 *
 * Export format: JSON with all pages, links, tags, timeline entries.
 * Each page includes full compiled_truth, timeline, and metadata.
 *
 * Import: creates/updates pages from export file, skipping
 * pages with matching content hashes (idempotent).
 */

interface ExportData {
  version: 1;
  exported_at: string;
  stats: {
    pages: number;
    links: number;
    tags: number;
    timeline_entries: number;
  };
  pages: ExportPage[];
  links: { from_slug: string; to_slug: string; link_type: string }[];
}

interface ExportPage {
  slug: string;
  type: string;
  title: string;
  compiled_truth: string;
  timeline: string;
  frontmatter: Record<string, unknown>;
  tags: string[];
  timeline_entries: {
    entry_date: string;
    content: string;
    source: string | null;
  }[];
}

export class BrainExporter {
  constructor(private brain: ShogunBrain) {}

  /**
   * Export the entire brain to a JSON object.
   */
  async exportAll(): Promise<ExportData> {
    const allPages = await this.brain.pages.listPages({ limit: 100000 });
    const exportPages: ExportPage[] = [];

    for (const page of allPages) {
      const tags = await this.brain.tags.getTagsForPage(page.id);
      const entries = await this.brain.timeline.getEntries(page.id, { limit: 10000 });

      exportPages.push({
        slug: page.slug,
        type: page.type,
        title: page.title,
        compiled_truth: page.compiled_truth,
        timeline: page.timeline,
        frontmatter: page.frontmatter,
        tags,
        timeline_entries: entries.map((e) => ({
          entry_date: e.entry_date,
          content: e.content,
          source: e.source,
        })),
      });
    }

    // Export links
    const links: { from_slug: string; to_slug: string; link_type: string }[] = [];
    for (const page of allPages) {
      const outgoing = await this.brain.links.getOutgoingLinks(page.id);
      for (const link of outgoing) {
        links.push({
          from_slug: page.slug,
          to_slug: link.to_slug,
          link_type: link.link_type,
        });
      }
    }

    logger.info(`Exported ${exportPages.length} pages, ${links.length} links`);

    return {
      version: 1,
      exported_at: new Date().toISOString(),
      stats: {
        pages: exportPages.length,
        links: links.length,
        tags: exportPages.reduce((sum, p) => sum + p.tags.length, 0),
        timeline_entries: exportPages.reduce((sum, p) => sum + p.timeline_entries.length, 0),
      },
      pages: exportPages,
      links,
    };
  }

  /**
   * Export to JSON string.
   */
  async exportToJSON(): Promise<string> {
    const data = await this.exportAll();
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import pages from an export JSON object.
   * Idempotent: skips pages with unchanged content.
   */
  async importAll(data: ExportData): Promise<{
    imported: number;
    skipped: number;
    links_created: number;
  }> {
    let imported = 0;
    let skipped = 0;

    // Phase 1: Import pages
    for (const exportPage of data.pages) {
      const existing = await this.brain.pages.getPage(exportPage.slug);

      const page = await this.brain.pages.putPage({
        slug: exportPage.slug,
        type: exportPage.type as Page["type"],
        title: exportPage.title,
        compiled_truth: exportPage.compiled_truth,
        timeline: exportPage.timeline,
        frontmatter: exportPage.frontmatter,
      });

      if (existing && existing.content_hash === page.content_hash) {
        skipped++;
      } else {
        imported++;
      }

      // Restore tags
      for (const tag of exportPage.tags) {
        await this.brain.tags.addTag(page.id, tag);
      }

      // Restore timeline entries
      for (const entry of exportPage.timeline_entries) {
        await this.brain.timeline.addEntry(
          page.id,
          entry.entry_date,
          entry.content,
          entry.source ?? undefined
        );
      }
    }

    // Phase 2: Import links
    let linksCreated = 0;
    for (const link of data.links) {
      const fromPage = await this.brain.pages.getPage(link.from_slug);
      const toPage = await this.brain.pages.getPage(link.to_slug);
      if (fromPage && toPage) {
        await this.brain.links.addLink(fromPage.id, toPage.id, link.link_type);
        linksCreated++;
      }
    }

    logger.info(`Import complete: ${imported} imported, ${skipped} skipped, ${linksCreated} links`);
    return { imported, skipped, links_created: linksCreated };
  }

  /**
   * Import from JSON string.
   */
  async importFromJSON(json: string): Promise<{
    imported: number;
    skipped: number;
    links_created: number;
  }> {
    const data = JSON.parse(json) as ExportData;
    if (data.version !== 1) {
      throw new Error(`Unsupported export version: ${data.version}`);
    }
    return this.importAll(data);
  }
}
