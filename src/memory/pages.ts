import { createHash } from "crypto";
import type { PostgresEngine } from "../engine/postgres.js";
import type { Page, PageInput, PageType } from "../types.js";

function computeHash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

export class PageStore {
  constructor(private engine: PostgresEngine) {}

  async getPage(slug: string): Promise<Page | null> {
    return this.engine.queryOne<Page>(
      "SELECT * FROM pages WHERE slug = $1",
      [slug]
    );
  }

  async getPageById(id: number): Promise<Page | null> {
    return this.engine.queryOne<Page>(
      "SELECT * FROM pages WHERE id = $1",
      [id]
    );
  }

  async putPage(input: PageInput): Promise<Page> {
    const contentForHash = input.compiled_truth + (input.timeline ?? "");
    const contentHash = computeHash(contentForHash);

    const existing = await this.getPage(input.slug);

    if (existing) {
      // Check idempotency — skip if content unchanged
      if (existing.content_hash === contentHash) {
        return existing;
      }

      // Save version before update
      const versionResult = await this.engine.queryOne<{ max_version: number }>(
        "SELECT COALESCE(MAX(version_number), 0) as max_version FROM page_versions WHERE page_id = $1",
        [existing.id]
      );
      const nextVersion = (versionResult?.max_version ?? 0) + 1;

      await this.engine.query(
        `INSERT INTO page_versions (page_id, version_number, compiled_truth, content_hash)
         VALUES ($1, $2, $3, $4)`,
        [existing.id, nextVersion, existing.compiled_truth, existing.content_hash]
      );

      // Update the page
      const updated = await this.engine.queryOne<Page>(
        `UPDATE pages SET
           type = $2,
           title = $3,
           compiled_truth = $4,
           timeline = $5,
           frontmatter = $6,
           content_hash = $7
         WHERE slug = $1
         RETURNING *`,
        [
          input.slug,
          input.type,
          input.title,
          input.compiled_truth,
          input.timeline ?? existing.timeline,
          JSON.stringify({ type: input.type, title: input.title, ...input.frontmatter }),
          contentHash,
        ]
      );

      return updated!;
    }

    // Create new page
    const frontmatter = { type: input.type, title: input.title, ...input.frontmatter };
    const created = await this.engine.queryOne<Page>(
      `INSERT INTO pages (slug, type, title, compiled_truth, timeline, frontmatter, content_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        input.slug,
        input.type,
        input.title,
        input.compiled_truth,
        input.timeline ?? "",
        JSON.stringify(frontmatter),
        contentHash,
      ]
    );

    return created!;
  }

  async deletePage(slug: string): Promise<boolean> {
    const result = await this.engine.query(
      "DELETE FROM pages WHERE slug = $1 RETURNING id",
      [slug]
    );
    return result.length > 0;
  }

  async listPages(options?: {
    type?: PageType;
    tag?: string;
    limit?: number;
    offset?: number;
  }): Promise<Page[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (options?.type) {
      conditions.push(`p.type = $${paramIndex++}`);
      params.push(options.type);
    }

    if (options?.tag) {
      conditions.push(`EXISTS (SELECT 1 FROM tags t WHERE t.page_id = p.id AND t.tag = $${paramIndex++})`);
      params.push(options.tag);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    return this.engine.query<Page>(
      `SELECT p.* FROM pages p ${where} ORDER BY p.updated_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...params, limit, offset]
    );
  }

  async getVersions(slug: string): Promise<{ version_number: number; content_hash: string; created_at: Date }[]> {
    const page = await this.getPage(slug);
    if (!page) return [];

    return this.engine.query(
      `SELECT version_number, content_hash, created_at
       FROM page_versions WHERE page_id = $1 ORDER BY version_number DESC`,
      [page.id]
    );
  }

  async revertToVersion(slug: string, versionNumber: number): Promise<Page | null> {
    const page = await this.getPage(slug);
    if (!page) return null;

    const version = await this.engine.queryOne<{ compiled_truth: string; content_hash: string }>(
      "SELECT compiled_truth, content_hash FROM page_versions WHERE page_id = $1 AND version_number = $2",
      [page.id, versionNumber]
    );
    if (!version) return null;

    // Save current as a new version before reverting
    const maxVersion = await this.engine.queryOne<{ max_version: number }>(
      "SELECT COALESCE(MAX(version_number), 0) as max_version FROM page_versions WHERE page_id = $1",
      [page.id]
    );

    await this.engine.query(
      `INSERT INTO page_versions (page_id, version_number, compiled_truth, content_hash)
       VALUES ($1, $2, $3, $4)`,
      [page.id, (maxVersion?.max_version ?? 0) + 1, page.compiled_truth, page.content_hash]
    );

    // Revert
    const reverted = await this.engine.queryOne<Page>(
      `UPDATE pages SET compiled_truth = $2, content_hash = $3 WHERE id = $1 RETURNING *`,
      [page.id, version.compiled_truth, version.content_hash]
    );

    return reverted;
  }

  async renderMarkdown(page: Page): Promise<string> {
    const fm = page.frontmatter ?? {};
    const tags = (fm.tags as string[]) ?? [];
    const tagLine = tags.length > 0 ? `tags: [${tags.join(", ")}]` : "";

    let md = "---\n";
    md += `type: ${page.type}\n`;
    md += `title: ${page.title}\n`;
    if (tagLine) md += `${tagLine}\n`;
    md += "---\n\n";
    md += page.compiled_truth;

    if (page.timeline) {
      md += "\n\n---\n\n";
      md += page.timeline;
    }

    return md;
  }
}
