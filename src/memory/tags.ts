import type { PostgresEngine } from "../engine/postgres.js";
import type { Tag } from "../types.js";

export class TagStore {
  constructor(private engine: PostgresEngine) {}

  async addTag(pageId: number, tag: string): Promise<Tag> {
    const result = await this.engine.queryOne<Tag>(
      `INSERT INTO tags (page_id, tag) VALUES ($1, $2)
       ON CONFLICT (page_id, tag) DO NOTHING RETURNING *`,
      [pageId, tag.toLowerCase().trim()]
    );

    if (!result) {
      return (await this.engine.queryOne<Tag>(
        "SELECT * FROM tags WHERE page_id = $1 AND tag = $2",
        [pageId, tag.toLowerCase().trim()]
      ))!;
    }
    return result;
  }

  async removeTag(pageId: number, tag: string): Promise<boolean> {
    const result = await this.engine.query(
      "DELETE FROM tags WHERE page_id = $1 AND tag = $2 RETURNING id",
      [pageId, tag.toLowerCase().trim()]
    );
    return result.length > 0;
  }

  async getTagsForPage(pageId: number): Promise<string[]> {
    const tags = await this.engine.query<{ tag: string }>(
      "SELECT tag FROM tags WHERE page_id = $1 ORDER BY tag",
      [pageId]
    );
    return tags.map((t) => t.tag);
  }

  async getPagesByTag(tag: string): Promise<number[]> {
    const results = await this.engine.query<{ page_id: number }>(
      "SELECT page_id FROM tags WHERE tag = $1",
      [tag.toLowerCase().trim()]
    );
    return results.map((r) => r.page_id);
  }

  async getAllTags(): Promise<{ tag: string; count: number }[]> {
    return this.engine.query(
      "SELECT tag, COUNT(*)::int as count FROM tags GROUP BY tag ORDER BY count DESC"
    );
  }
}
