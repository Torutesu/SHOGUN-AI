#!/usr/bin/env node
/**
 * SHOGUN Bridge Server — HTTP mode.
 *
 * Starts an HTTP server on localhost:3847 that the Tauri WebView
 * and browser extension can call directly via fetch().
 *
 * This replaces the stdio JSON-RPC approach which was unreliable
 * when spawned as a Tauri sidecar.
 */

import { createServer, type IncomingMessage, type ServerResponse } from "http";
import { ShogunBrain } from "../brain.js";
import { OpenAIEmbeddingProvider } from "../embeddings/openai.js";
import { DreamCycle } from "../dream/cycle.js";
import { LLMRouter, createClaudeProvider, createOpenAIProvider } from "../llm/router.js";
import { PIIFilter } from "../security/pii.js";
import { ChatEngine } from "../chat/engine.js";
import { logger } from "../logger.js";
import type { ShogunBrainOptions } from "../brain.js";

const PORT = parseInt(process.env.SHOGUN_PORT ?? "3847");

logger.setLevel((process.env.SHOGUN_LOG_LEVEL as "debug" | "info" | "warn" | "error") ?? "info");

async function main() {
  const dataDir = process.env.SHOGUN_DATA_DIR ?? "./pgdata";
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const piiEnabled = process.env.SHOGUN_PII_REMOVAL !== "false";
  const piiFilter = new PIIFilter({ enabled: piiEnabled, logDetections: false });

  const brainOptions: ShogunBrainOptions = { dataDir };

  if (openaiKey) {
    const dims = { fast: 256, balanced: 1536, full: 3072 }[process.env.SHOGUN_EMBEDDING_TIER ?? "balanced"] ?? 1536;
    brainOptions.embeddingProvider = new OpenAIEmbeddingProvider({ apiKey: openaiKey, dimensions: dims });
  }

  const llmRouter = new LLMRouter();
  if (openaiKey) llmRouter.addProvider(createOpenAIProvider(openaiKey, "gpt-4o-mini"));
  if (anthropicKey) {
    llmRouter.addProvider(createClaudeProvider(anthropicKey, "haiku"));
    llmRouter.addProvider(createClaudeProvider(anthropicKey, "sonnet"));
  }
  if (llmRouter.listProviders().length > 0) brainOptions.llmRouter = llmRouter;

  const brain = new ShogunBrain(brainOptions);
  await brain.init();

  const dreamCycle = new DreamCycle(brain, { llmRouter: brainOptions.llmRouter });
  let chatEngine: ChatEngine | null = null;

  logger.info(`SHOGUN bridge starting on http://localhost:${PORT}`);

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    // CORS for Tauri WebView
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") { res.writeHead(200); res.end(); return; }

    const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
    const path = url.pathname;

    try {
      const body = req.method === "POST" ? await readBody(req) : {};
      const result = await dispatch(brain, piiFilter, dreamCycle, chatEngine, llmRouter, path, body as Record<string, unknown>, url.searchParams);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: msg }));
    }
  });

  server.listen(PORT, () => {
    logger.info(`SHOGUN bridge ready on http://localhost:${PORT}`);
  });

  process.on("SIGTERM", async () => { await brain.close(); process.exit(0); });
  process.on("SIGINT", async () => { await brain.close(); process.exit(0); });
}

async function dispatch(
  brain: ShogunBrain,
  piiFilter: PIIFilter,
  dreamCycle: DreamCycle,
  chatEngine: ChatEngine | null,
  llmRouter: LLMRouter,
  path: string,
  params: Record<string, unknown>,
  query: URLSearchParams
): Promise<unknown> {
  switch (path) {
    case "/api/stats":
      return brain.getStats();

    case "/api/health":
      return brain.getHealth();

    case "/api/pages":
      return brain.pages.listPages({
        type: (query.get("type") ?? params.type) as "person" | "company" | "session" | "concept" | undefined,
        limit: Number(query.get("limit") ?? params.limit ?? 50),
      });

    case "/api/page": {
      const slug = String(query.get("slug") ?? params.slug ?? "");
      if (!slug) throw new Error("slug required");
      const page = await brain.pages.getPage(slug);
      if (!page) return null;
      const tags = await brain.tags.getTagsForPage(page.id);
      return { ...page, page_type: page.type, tags, updated_at: page.updated_at?.toISOString?.() ?? "" };
    }

    case "/api/page/put": {
      const filterText = (t: string) => piiFilter.filter(t);
      const page = await brain.pages.putPage({
        slug: String(params.slug),
        type: String(params.page_type ?? params.type) as "person" | "company" | "session" | "concept",
        title: filterText(String(params.title)),
        compiled_truth: filterText(String(params.compiled_truth)),
        timeline: params.timeline ? filterText(String(params.timeline)) : undefined,
      });
      if (params.tags && Array.isArray(params.tags)) {
        for (const tag of params.tags as string[]) await brain.tags.addTag(page.id, tag);
      }
      await brain.rechunkPage(page.id);
      const tags = await brain.tags.getTagsForPage(page.id);
      return { ...page, page_type: page.type, tags, updated_at: page.updated_at?.toISOString?.() ?? "" };
    }

    case "/api/page/delete":
      return { deleted: await brain.pages.deletePage(String(params.slug)) };

    case "/api/search": {
      const q = String(params.query ?? query.get("q") ?? "");
      const results = await brain.searchPipeline.keywordOnly(q, Number(params.limit ?? 20));
      return results.map((r) => ({
        slug: r.page.slug, title: r.page.title, page_type: r.page.type,
        score: r.score, snippet: r.page.compiled_truth.slice(0, 200),
      }));
    }

    case "/api/chat": {
      const message = String(params.message ?? "");
      if (!message) throw new Error("message required");
      const router = brain.getLLMRouter();
      if (!router) throw new Error("No LLM configured");
      const { ChatEngine: CE } = await import("../chat/engine.js");
      if (!chatEngine) chatEngine = new CE(brain, router);
      return chatEngine.chat(message);
    }

    case "/api/capture": {
      const text = piiFilter.filter(String(params.text ?? ""));
      const date = new Date().toISOString().slice(0, 10);
      const slug = `sessions/${date}`;
      let page = await brain.pages.getPage(slug);
      if (!page) {
        page = await brain.pages.putPage({ slug, type: "session", title: `Session ${date}`, compiled_truth: "Daily activity log." });
      }
      await brain.timeline.addEntry(page.id, date, text, String(params.source ?? "capture"));
      return { ok: true, slug };
    }

    case "/api/dream":
      return dreamCycle.run();

    case "/api/timeline": {
      const { TimelineService } = await import("../memory/timeline-service.js");
      const svc = new TimelineService(brain);
      const start = String(params.start_date ?? query.get("start") ?? new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10));
      const end = String(params.end_date ?? query.get("end") ?? new Date().toISOString().slice(0, 10));
      return svc.getRange({ startDate: start, endDate: end });
    }

    case "/api/settings/load":
      return { language: "ja", onboarding_completed: false };

    case "/api/settings/save":
      return { saved: true };

    default:
      throw new Error(`Unknown: ${path}`);
  }
}

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => { data += chunk; });
    req.on("end", () => { try { resolve(JSON.parse(data || "{}")); } catch { resolve({}); } });
    req.on("error", reject);
  });
}

main().catch((err) => {
  console.error("SHOGUN bridge failed:", err);
  process.exit(1);
});
