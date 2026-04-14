import { z } from "zod";
import type { ShogunBrain } from "../../brain.js";

export function defineAdminTools(brain: ShogunBrain) {
  return {
    revert_version: {
      description: "Revert a page's compiled truth to a previous version.",
      inputSchema: z.object({
        slug: z.string(),
        version_number: z.number().describe("Version number to revert to"),
      }),
      handler: async (input: { slug: string; version_number: number }) => {
        const page = await brain.pages.revertToVersion(input.slug, input.version_number);
        if (!page) {
          return { error: `Page or version not found: ${input.slug} v${input.version_number}` };
        }
        return { page: { slug: page.slug, title: page.title } };
      },
    },

    sync_brain: {
      description:
        "Incremental sync: re-chunk and re-embed all stale pages (pages where content changed since last embedding).",
      inputSchema: z.object({
        force: z.boolean().optional().default(false).describe("Force re-embedding of all pages"),
      }),
      handler: async (input: { force?: boolean }) => {
        const result = await brain.syncAll(input.force);
        return result;
      },
    },

    dream_cycle: {
      description: "Run the Dream Cycle: sync, embed stale, entity sweep, health check.",
      inputSchema: z.object({}),
      handler: async () => {
        const result = await brain.runDreamCycle();
        return result;
      },
    },
  };
}
