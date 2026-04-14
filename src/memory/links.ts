import type { PostgresEngine } from "../engine/postgres.js";
import type { Link, Page } from "../types.js";

export class LinkStore {
  constructor(private engine: PostgresEngine) {}

  async addLink(fromPageId: number, toPageId: number, linkType: string = "related"): Promise<Link> {
    const link = await this.engine.queryOne<Link>(
      `INSERT INTO links (from_page_id, to_page_id, link_type)
       VALUES ($1, $2, $3)
       ON CONFLICT (from_page_id, to_page_id, link_type) DO NOTHING
       RETURNING *`,
      [fromPageId, toPageId, linkType]
    );

    // If ON CONFLICT hit, fetch the existing link
    if (!link) {
      return (await this.engine.queryOne<Link>(
        "SELECT * FROM links WHERE from_page_id = $1 AND to_page_id = $2 AND link_type = $3",
        [fromPageId, toPageId, linkType]
      ))!;
    }
    return link;
  }

  async removeLink(fromPageId: number, toPageId: number, linkType?: string): Promise<boolean> {
    let sql = "DELETE FROM links WHERE from_page_id = $1 AND to_page_id = $2";
    const params: unknown[] = [fromPageId, toPageId];

    if (linkType) {
      sql += " AND link_type = $3";
      params.push(linkType);
    }

    const result = await this.engine.query(sql + " RETURNING id", params);
    return result.length > 0;
  }

  async getOutgoingLinks(pageId: number): Promise<(Link & { to_slug: string; to_title: string })[]> {
    return this.engine.query(
      `SELECT l.*, p.slug as to_slug, p.title as to_title
       FROM links l JOIN pages p ON l.to_page_id = p.id
       WHERE l.from_page_id = $1 ORDER BY l.created_at DESC`,
      [pageId]
    );
  }

  async getBacklinks(pageId: number): Promise<(Link & { from_slug: string; from_title: string })[]> {
    return this.engine.query(
      `SELECT l.*, p.slug as from_slug, p.title as from_title
       FROM links l JOIN pages p ON l.from_page_id = p.id
       WHERE l.to_page_id = $1 ORDER BY l.created_at DESC`,
      [pageId]
    );
  }

  async traverseGraph(
    startPageId: number,
    depth: number = 2,
    linkType?: string
  ): Promise<{ page: Page; depth: number; link_type: string }[]> {
    const visited = new Set<number>();
    const results: { page: Page; depth: number; link_type: string }[] = [];

    const queue: { pageId: number; currentDepth: number }[] = [
      { pageId: startPageId, currentDepth: 0 },
    ];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current.pageId) || current.currentDepth > depth) continue;
      visited.add(current.pageId);

      if (current.currentDepth > 0) {
        const page = await this.engine.queryOne<Page>(
          "SELECT * FROM pages WHERE id = $1",
          [current.pageId]
        );
        if (page) {
          // Get the link type that brought us here
          const link = await this.engine.queryOne<{ link_type: string }>(
            "SELECT link_type FROM links WHERE to_page_id = $1 AND from_page_id = ANY($2::int[])",
            [current.pageId, Array.from(visited)]
          );
          results.push({
            page,
            depth: current.currentDepth,
            link_type: link?.link_type ?? "related",
          });
        }
      }

      if (current.currentDepth < depth) {
        let linksQuery = "SELECT to_page_id, link_type FROM links WHERE from_page_id = $1";
        const params: unknown[] = [current.pageId];

        if (linkType) {
          linksQuery += " AND link_type = $2";
          params.push(linkType);
        }

        const linked = await this.engine.query<{ to_page_id: number; link_type: string }>(
          linksQuery,
          params
        );

        for (const l of linked) {
          if (!visited.has(l.to_page_id)) {
            queue.push({ pageId: l.to_page_id, currentDepth: current.currentDepth + 1 });
          }
        }
      }
    }

    return results;
  }
}
