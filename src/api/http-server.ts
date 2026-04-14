import { createServer, type IncomingMessage, type ServerResponse } from "http";
import type { ShogunBrain } from "../brain.js";
import { logger } from "../logger.js";

/**
 * SHOGUN REST API Server — lightweight HTTP interface.
 *
 * Provides the same operations as the MCP server but via HTTP.
 * Designed for integrations, webhooks, and external tools.
 *
 * Default port: 3847
 */

export class HTTPAPIServer {
  private server: ReturnType<typeof createServer> | null = null;

  constructor(
    private brain: ShogunBrain,
    private port: number = 3847
  ) {}

  start(): void {
    this.server = createServer(async (req, res) => {
      // CORS
      res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

      if (req.method === "OPTIONS") { res.writeHead(200); res.end(); return; }

      try {
        const url = new URL(req.url ?? "/", `http://localhost:${this.port}`);
        const body = req.method === "POST" ? await readBody(req) : null;

        const result = await this.route(req.method ?? "GET", url.pathname, url.searchParams, body);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: msg }));
      }
    });

    this.server.listen(this.port, () => {
      logger.info(`REST API server listening on http://localhost:${this.port}`);
    });
  }

  stop(): void {
    this.server?.close();
    this.server = null;
  }

  private async route(method: string, path: string, params: URLSearchParams, body: unknown): Promise<unknown> {
    switch (`${method} ${path}`) {
      case "GET /api/stats":
        return this.brain.getStats();

      case "GET /api/health":
        return this.brain.getHealth();

      case "GET /api/pages": {
        const type = params.get("type") ?? undefined;
        const limit = parseInt(params.get("limit") ?? "50");
        return this.brain.pages.listPages({ type: type as "person" | "company" | "session" | "concept" | undefined, limit });
      }

      case "GET /api/page": {
        const slug = params.get("slug");
        if (!slug) throw new Error("slug parameter required");
        return this.brain.pages.getPage(slug);
      }

      case "POST /api/page": {
        const data = body as { slug: string; type: string; title: string; compiled_truth: string };
        return this.brain.pages.putPage({
          slug: data.slug,
          type: data.type as "person" | "company" | "session" | "concept",
          title: data.title,
          compiled_truth: data.compiled_truth,
        });
      }

      case "DELETE /api/page": {
        const slug = params.get("slug");
        if (!slug) throw new Error("slug parameter required");
        return { deleted: await this.brain.pages.deletePage(slug) };
      }

      case "POST /api/search": {
        const data = body as { query: string; limit?: number };
        const results = await this.brain.searchPipeline.keywordOnly(data.query, data.limit ?? 20);
        return results.map((r) => ({ slug: r.page.slug, title: r.page.title, score: r.score }));
      }

      case "POST /api/capture": {
        // Browser extension endpoint
        const data = body as { type: string; text: string; url?: string; title?: string };
        const date = new Date().toISOString().slice(0, 10);
        const slug = `sessions/${date}`;
        let page = await this.brain.pages.getPage(slug);
        if (!page) {
          page = await this.brain.pages.putPage({ slug, type: "session", title: `Session ${date}`, compiled_truth: "Daily activity log." });
        }
        await this.brain.timeline.addEntry(page.id, date, `[${data.type}] ${data.text.slice(0, 2000)}`, data.type);
        return { ok: true };
      }

      default:
        throw new Error(`Unknown route: ${method} ${path}`);
    }
  }
}

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => { data += chunk; });
    req.on("end", () => { try { resolve(JSON.parse(data)); } catch { resolve(data); } });
    req.on("error", reject);
  });
}
