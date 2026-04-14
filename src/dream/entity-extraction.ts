import type { PostgresEngine } from "../engine/postgres.js";
import type { PageStore } from "../memory/pages.js";
import type { LinkStore } from "../memory/links.js";
import type { TagStore } from "../memory/tags.js";
import type { LLMRouter } from "../llm/router.js";
import type { Page, PageType } from "../types.js";
import { logger } from "../logger.js";

interface ExtractedEntity {
  name: string;
  type: PageType;
  description: string;
  relationship?: string;
}

const EXTRACTION_PROMPT = `You are an entity extraction system for a personal knowledge base.

Given the following text from a page titled "{title}" (type: {type}), extract any mentioned entities (people, companies, concepts) that are distinct from the page subject itself.

For each entity, provide:
- name: The entity's proper name
- type: "person", "company", or "concept"
- description: A one-line description based on context
- relationship: How this entity relates to the page subject

Return ONLY valid JSON array. If no entities found, return [].

Example output:
[{"name":"John Smith","type":"person","description":"CTO at Acme Corp","relationship":"colleague"},{"name":"Acme Corp","type":"company","description":"AI startup in Tokyo","relationship":"employer"}]

Text:
{text}`;

/**
 * Entity extraction: scans page content for mentions of people,
 * companies, and concepts, then auto-creates pages and links.
 *
 * Uses LLM (medium complexity) for extraction.
 */
export class EntityExtractor {
  constructor(
    private engine: PostgresEngine,
    private pages: PageStore,
    private links: LinkStore,
    private tags: TagStore,
    private llmRouter: LLMRouter
  ) {}

  /**
   * Extract entities from a single page's content.
   */
  async extractFromPage(page: Page): Promise<ExtractedEntity[]> {
    const text = `${page.compiled_truth}\n\n${page.timeline}`.trim();
    if (text.length < 20) return [];

    const prompt = EXTRACTION_PROMPT
      .replace("{title}", page.title)
      .replace("{type}", page.type)
      .replace("{text}", text.slice(0, 4000)); // Cap input to control cost

    try {
      const response = await this.llmRouter.call(prompt, "medium", {
        maxTokens: 1024,
        temperature: 0.1,
      });

      return this.parseEntities(response);
    } catch (error: unknown) {
      const err = error as Error;
      logger.warn(`Entity extraction failed for ${page.slug}: ${err.message}`);
      return [];
    }
  }

  /**
   * Run entity sweep across all pages updated since last sweep.
   * Creates new pages for discovered entities and links them
   * to their source pages.
   */
  async sweep(options?: {
    sinceDate?: Date;
    limit?: number;
  }): Promise<{ new_entities: number; new_links: number }> {
    let newEntities = 0;
    let newLinks = 0;

    // Get pages to scan
    const sinceDate = options?.sinceDate;
    const limit = options?.limit ?? 100;

    let pages: Page[];
    if (sinceDate) {
      pages = await this.engine.query<Page>(
        `SELECT * FROM pages WHERE updated_at > $1 ORDER BY updated_at DESC LIMIT $2`,
        [sinceDate, limit]
      );
    } else {
      pages = await this.engine.query<Page>(
        `SELECT * FROM pages ORDER BY updated_at DESC LIMIT $1`,
        [limit]
      );
    }

    logger.info(`Entity sweep: scanning ${pages.length} pages`);

    for (const page of pages) {
      const entities = await this.extractFromPage(page);

      for (const entity of entities) {
        const slug = this.generateSlug(entity);

        // Check if page already exists
        const existing = await this.pages.getPage(slug);
        if (existing) {
          // Link exists? If not, create link
          const linkExists = await this.engine.queryOne(
            `SELECT 1 FROM links WHERE from_page_id = $1 AND to_page_id = $2`,
            [page.id, existing.id]
          );
          if (!linkExists) {
            await this.links.addLink(
              page.id,
              existing.id,
              entity.relationship ?? "mentions"
            );
            newLinks++;
          }
          continue;
        }

        // Create new page for entity
        const newPage = await this.pages.putPage({
          slug,
          type: entity.type,
          title: entity.name,
          compiled_truth: entity.description,
          frontmatter: { auto_extracted: true, source_page: page.slug },
        });

        newEntities++;

        // Link source page → new entity
        await this.links.addLink(
          page.id,
          newPage.id,
          entity.relationship ?? "mentions"
        );
        newLinks++;

        // Auto-tag
        await this.tags.addTag(newPage.id, "auto-extracted");

        logger.info(`New entity: ${entity.type}/${entity.name} (from ${page.slug})`);
      }
    }

    logger.info(`Entity sweep complete: ${newEntities} new entities, ${newLinks} new links`);
    return { new_entities: newEntities, new_links: newLinks };
  }

  private generateSlug(entity: ExtractedEntity): string {
    const prefix = entity.type === "person" ? "people" :
                   entity.type === "company" ? "companies" : "concepts";
    const name = entity.name
      .toLowerCase()
      .replace(/[^a-z0-9\u3000-\u9fff\u30a0-\u30ff\u3040-\u309f]+/g, "-")
      .replace(/^-|-$/g, "");
    return `${prefix}/${name}`;
  }

  private parseEntities(response: string): ExtractedEntity[] {
    try {
      // Extract JSON from response (handle markdown code blocks)
      let json = response.trim();
      const jsonMatch = json.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        json = jsonMatch[0];
      }

      const parsed = JSON.parse(json);
      if (!Array.isArray(parsed)) return [];

      return parsed.filter(
        (e: unknown): e is ExtractedEntity =>
          typeof e === "object" &&
          e !== null &&
          typeof (e as ExtractedEntity).name === "string" &&
          typeof (e as ExtractedEntity).type === "string" &&
          ["person", "company", "concept"].includes((e as ExtractedEntity).type)
      );
    } catch {
      logger.warn("Failed to parse entity extraction response");
      return [];
    }
  }
}
