import type { ShogunBrain } from "../brain.js";
import type { OAuthTokenManager } from "./oauth.js";
import { logger } from "../logger.js";

/**
 * Notion integration: imports pages and databases into SHOGUN memory.
 *
 * Uses Notion API (Internal Integration Token or OAuth) to:
 * - Fetch recently edited pages → create concept pages
 * - Fetch database entries → create typed pages
 * - Track page edits as timeline entries
 */

interface NotionPage {
  id: string;
  url: string;
  created_time: string;
  last_edited_time: string;
  properties: Record<string, { title?: { plain_text: string }[]; rich_text?: { plain_text: string }[] }>;
  parent: { type: string };
}

export class NotionIntegration {
  private baseUrl = "https://api.notion.com/v1";

  constructor(
    private brain: ShogunBrain,
    private auth: OAuthTokenManager
  ) {}

  async ingestRecentPages(options?: { limit?: number }): Promise<{ pages: number; created: number }> {
    const limit = options?.limit ?? 50;
    const token = await this.auth.getAccessToken();

    const res = await fetch(`${this.baseUrl}/search`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        sort: { direction: "descending", timestamp: "last_edited_time" },
        page_size: Math.min(limit, 100),
      }),
    });

    if (!res.ok) {
      logger.error(`Notion API error: ${res.status}`);
      return { pages: 0, created: 0 };
    }

    const data = await res.json() as { results: NotionPage[] };
    let created = 0;

    for (const page of data.results) {
      if (page.parent.type === "workspace" || page.parent.type === "page_id") {
        const title = this.extractTitle(page);
        const slug = `concepts/notion-${page.id.replace(/-/g, "").slice(0, 12)}`;

        const existing = await this.brain.pages.getPage(slug);
        if (existing) continue;

        // Fetch page content blocks
        const content = await this.fetchPageContent(token, page.id);

        await this.brain.pages.putPage({
          slug,
          type: "concept",
          title: title || "Untitled",
          compiled_truth: content.slice(0, 10000),
          frontmatter: { source: "notion", notion_id: page.id, notion_url: page.url },
        });

        const saved = await this.brain.pages.getPage(slug);
        if (saved) {
          await this.brain.tags.addTag(saved.id, "notion");
          await this.brain.timeline.addEntry(
            saved.id,
            page.last_edited_time.slice(0, 10),
            `Imported from Notion: ${title}`,
            "notion"
          );
        }
        created++;
      }
    }

    logger.info(`Notion ingest: ${data.results.length} pages found, ${created} created`);
    return { pages: data.results.length, created };
  }

  private extractTitle(page: NotionPage): string {
    for (const prop of Object.values(page.properties)) {
      if (prop.title && prop.title.length > 0) {
        return prop.title.map((t) => t.plain_text).join("");
      }
    }
    return "Untitled";
  }

  private async fetchPageContent(token: string, pageId: string): Promise<string> {
    try {
      const res = await fetch(`${this.baseUrl}/blocks/${pageId}/children?page_size=100`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Notion-Version": "2022-06-28",
        },
      });
      if (!res.ok) return "";

      const data = await res.json() as {
        results: {
          type: string;
          paragraph?: { rich_text: { plain_text: string }[] };
          heading_1?: { rich_text: { plain_text: string }[] };
          heading_2?: { rich_text: { plain_text: string }[] };
          heading_3?: { rich_text: { plain_text: string }[] };
          bulleted_list_item?: { rich_text: { plain_text: string }[] };
          numbered_list_item?: { rich_text: { plain_text: string }[] };
          to_do?: { rich_text: { plain_text: string }[]; checked: boolean };
        }[];
      };

      const lines: string[] = [];
      for (const block of data.results) {
        const richText = (block as Record<string, { rich_text?: { plain_text: string }[] }>)[block.type]?.rich_text;
        if (richText) {
          const text = richText.map((t) => t.plain_text).join("");
          if (text) lines.push(text);
        }
      }
      return lines.join("\n\n");
    } catch {
      return "";
    }
  }
}
