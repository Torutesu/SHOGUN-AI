import { z } from "zod";
import type { ShogunBrain } from "../../brain.js";

export function defineWriteTools(brain: ShogunBrain) {
  return {
    put_page: {
      description:
        "Create or update a page. Compiled truth is overwritten; timeline is append-only. Auto-versions on update.",
      inputSchema: z.object({
        slug: z.string().describe("Page slug (e.g. 'people/toru-yamamoto')"),
        type: z.enum(["person", "company", "session", "concept"]),
        title: z.string(),
        compiled_truth: z.string().describe("Current best understanding (overwritten on update)"),
        timeline: z.string().optional().describe("Timeline text (append-only)"),
        tags: z.array(z.string()).optional(),
      }),
      handler: async (input: {
        slug: string;
        type: string;
        title: string;
        compiled_truth: string;
        timeline?: string;
        tags?: string[];
      }) => {
        const page = await brain.pages.putPage({
          slug: input.slug,
          type: input.type as any,
          title: input.title,
          compiled_truth: input.compiled_truth,
          timeline: input.timeline,
          frontmatter: input.tags ? { tags: input.tags } : {},
        });

        // Add tags if provided
        if (input.tags) {
          for (const tag of input.tags) {
            await brain.tags.addTag(page.id, tag);
          }
        }

        // Re-chunk and re-index if embedding provider is available
        await brain.rechunkPage(page.id);

        return { page: { slug: page.slug, id: page.id, title: page.title } };
      },
    },

    delete_page: {
      description: "Delete a page and all associated data (chunks, links, tags, timeline entries).",
      inputSchema: z.object({
        slug: z.string(),
      }),
      handler: async (input: { slug: string }) => {
        const deleted = await brain.pages.deletePage(input.slug);
        return { deleted, slug: input.slug };
      },
    },

    add_tag: {
      description: "Add a tag to a page.",
      inputSchema: z.object({
        slug: z.string(),
        tag: z.string(),
      }),
      handler: async (input: { slug: string; tag: string }) => {
        const page = await brain.pages.getPage(input.slug);
        if (!page) {
          return { error: `Page not found: ${input.slug}` };
        }
        const tag = await brain.tags.addTag(page.id, input.tag);
        return { tag };
      },
    },

    remove_tag: {
      description: "Remove a tag from a page.",
      inputSchema: z.object({
        slug: z.string(),
        tag: z.string(),
      }),
      handler: async (input: { slug: string; tag: string }) => {
        const page = await brain.pages.getPage(input.slug);
        if (!page) {
          return { error: `Page not found: ${input.slug}` };
        }
        const removed = await brain.tags.removeTag(page.id, input.tag);
        return { removed };
      },
    },

    add_link: {
      description: "Create a typed link between two pages.",
      inputSchema: z.object({
        from_slug: z.string(),
        to_slug: z.string(),
        link_type: z.string().optional().default("related"),
      }),
      handler: async (input: { from_slug: string; to_slug: string; link_type?: string }) => {
        const fromPage = await brain.pages.getPage(input.from_slug);
        const toPage = await brain.pages.getPage(input.to_slug);

        if (!fromPage) return { error: `Page not found: ${input.from_slug}` };
        if (!toPage) return { error: `Page not found: ${input.to_slug}` };

        const link = await brain.links.addLink(fromPage.id, toPage.id, input.link_type);
        return { link };
      },
    },

    remove_link: {
      description: "Remove a link between two pages.",
      inputSchema: z.object({
        from_slug: z.string(),
        to_slug: z.string(),
        link_type: z.string().optional(),
      }),
      handler: async (input: { from_slug: string; to_slug: string; link_type?: string }) => {
        const fromPage = await brain.pages.getPage(input.from_slug);
        const toPage = await brain.pages.getPage(input.to_slug);

        if (!fromPage) return { error: `Page not found: ${input.from_slug}` };
        if (!toPage) return { error: `Page not found: ${input.to_slug}` };

        const removed = await brain.links.removeLink(fromPage.id, toPage.id, input.link_type);
        return { removed };
      },
    },

    add_timeline_entry: {
      description: "Append a timeline event to a page. Timeline entries are append-only and never edited.",
      inputSchema: z.object({
        slug: z.string(),
        entry_date: z.string().describe("Date in YYYY-MM-DD format"),
        content: z.string().describe("Event description"),
        source: z.string().optional().describe("Source of the information"),
      }),
      handler: async (input: { slug: string; entry_date: string; content: string; source?: string }) => {
        const page = await brain.pages.getPage(input.slug);
        if (!page) {
          return { error: `Page not found: ${input.slug}` };
        }
        const entry = await brain.timeline.addEntry(
          page.id,
          input.entry_date,
          input.content,
          input.source
        );
        return { entry };
      },
    },
  };
}
