import { z } from "zod";
import type { ShogunBrain } from "../../brain.js";
import { slugSchema, limitSchema, depthSchema, dateSchema } from "../../security/validation.js";
import type { PageType } from "../../types.js";

export function defineReadTools(brain: ShogunBrain) {
  return {
    get_page: {
      description: "Get a page by its slug. Returns the full page content including compiled truth and timeline.",
      inputSchema: z.object({
        slug: slugSchema.describe("Page slug (e.g. 'people/toru-yamamoto')"),
      }),
      handler: async (input: { slug: string }) => {
        const page = await brain.pages.getPage(input.slug);
        if (!page) {
          return { error: `Page not found: ${input.slug}` };
        }
        const markdown = await brain.pages.renderMarkdown(page);
        return { page, markdown };
      },
    },

    list_pages: {
      description: "List pages with optional type and tag filters.",
      inputSchema: z.object({
        type: z.enum(["person", "company", "session", "concept"]).optional(),
        tag: z.string().max(100).optional(),
        limit: limitSchema,
        offset: z.number().int().min(0).max(10000).optional().default(0),
      }),
      handler: async (input: { type?: string; tag?: string; limit?: number; offset?: number }) => {
        const pages = await brain.pages.listPages({
          type: input.type as PageType | undefined,
          tag: input.tag,
          limit: input.limit,
          offset: input.offset,
        });
        return {
          pages: pages.map((p) => ({
            slug: p.slug,
            type: p.type,
            title: p.title,
            updated_at: p.updated_at,
          })),
          count: pages.length,
        };
      },
    },

    search: {
      description: "Keyword search across all pages using full-text search.",
      inputSchema: z.object({
        query: z.string().min(1).max(1000).describe("Search query"),
        limit: limitSchema.default(20),
      }),
      handler: async (input: { query: string; limit?: number }) => {
        const results = await brain.searchPipeline.keywordOnly(input.query, input.limit);
        return {
          results: results.map((r) => ({
            slug: r.page.slug,
            title: r.page.title,
            type: r.page.type,
            score: r.score,
          })),
        };
      },
    },

    query: {
      description: "Full hybrid search using keyword + vector search with RRF fusion and deduplication.",
      inputSchema: z.object({
        query: z.string().min(1).max(2000).describe("Natural language query"),
        limit: limitSchema.default(10),
        type_filter: z.array(z.enum(["person", "company", "session", "concept"])).max(4).optional(),
        tag_filter: z.array(z.string().max(100)).max(20).optional(),
      }),
      handler: async (input: { query: string; limit?: number; type_filter?: string[]; tag_filter?: string[] }) => {
        const results = await brain.searchPipeline.query({
          query: input.query,
          limit: input.limit,
          type_filter: input.type_filter as PageType[] | undefined,
          tag_filter: input.tag_filter,
        });
        return {
          results: results.map((r) => ({
            slug: r.page.slug,
            title: r.page.title,
            type: r.page.type,
            score: r.score,
            match_type: r.match_type,
            chunk_text: r.chunk_text,
          })),
        };
      },
    },

    get_timeline: {
      description: "Get structured timeline entries for a page.",
      inputSchema: z.object({
        slug: slugSchema,
        limit: limitSchema,
        after: dateSchema.optional().describe("Filter entries after this date (YYYY-MM-DD)"),
        before: dateSchema.optional().describe("Filter entries before this date (YYYY-MM-DD)"),
      }),
      handler: async (input: { slug: string; limit?: number; after?: string; before?: string }) => {
        const entries = await brain.timeline.getEntriesBySlug(input.slug, {
          limit: input.limit,
          after: input.after,
          before: input.before,
        });
        return { entries };
      },
    },

    get_backlinks: {
      description: "Get pages that link to a given page (incoming links).",
      inputSchema: z.object({
        slug: slugSchema,
      }),
      handler: async (input: { slug: string }) => {
        const page = await brain.pages.getPage(input.slug);
        if (!page) {
          return { error: `Page not found: ${input.slug}` };
        }
        const backlinks = await brain.links.getBacklinks(page.id);
        return {
          backlinks: backlinks.map((l) => ({
            slug: l.from_slug,
            title: l.from_title,
            link_type: l.link_type,
          })),
        };
      },
    },

    traverse_graph: {
      description: "Traverse the link graph starting from a page, up to a given depth (max 10).",
      inputSchema: z.object({
        slug: slugSchema,
        depth: depthSchema,
        link_type: z.string().max(100).optional(),
      }),
      handler: async (input: { slug: string; depth?: number; link_type?: string }) => {
        const page = await brain.pages.getPage(input.slug);
        if (!page) {
          return { error: `Page not found: ${input.slug}` };
        }
        const graph = await brain.links.traverseGraph(page.id, input.depth, input.link_type);
        return {
          nodes: graph.map((n) => ({
            slug: n.page.slug,
            title: n.page.title,
            type: n.page.type,
            depth: n.depth,
            link_type: n.link_type,
          })),
        };
      },
    },

    get_stats: {
      description: "Get brain statistics: total pages, chunks, links, etc.",
      inputSchema: z.object({}),
      handler: async () => {
        return brain.getStats();
      },
    },

    get_health: {
      description: "Get brain health report: embed coverage, stale pages, orphans.",
      inputSchema: z.object({}),
      handler: async () => {
        return brain.getHealth();
      },
    },

    get_versions: {
      description: "Get version history for a page's compiled truth.",
      inputSchema: z.object({
        slug: slugSchema,
      }),
      handler: async (input: { slug: string }) => {
        const versions = await brain.pages.getVersions(input.slug);
        return { versions };
      },
    },
  };
}
