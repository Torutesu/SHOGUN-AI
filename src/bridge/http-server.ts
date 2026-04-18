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
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
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

// ─── Settings persistence ──────────────────────────────────────────
interface AppSettings {
  openai_api_key: string | null;
  anthropic_api_key: string | null;
  data_dir: string;
  embedding_tier: string;
  encryption_enabled: boolean;
  dream_cycle_enabled: boolean;
  language: string;
  onboarding_completed: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  openai_api_key: null,
  anthropic_api_key: null,
  data_dir: "./pgdata",
  embedding_tier: "balanced",
  encryption_enabled: false,
  dream_cycle_enabled: true,
  language: "ja",
  onboarding_completed: false,
};

function getSettingsPath(dataDir: string): string {
  return join(dataDir, "shogun-settings.json");
}

function loadSettingsFile(dataDir: string): AppSettings {
  const path = getSettingsPath(dataDir);
  try {
    if (existsSync(path)) {
      const raw = readFileSync(path, "utf-8");
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch { /* fallback */ }
  return { ...DEFAULT_SETTINGS };
}

function saveSettingsFile(dataDir: string, settings: AppSettings): void {
  const path = getSettingsPath(dataDir);
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  writeFileSync(path, JSON.stringify(settings, null, 2), "utf-8");
}

// ─── Capture state ─────────────────────────────────────────────────
let captureActive = true;

// ─── Main ──────────────────────────────────────────────────────────
async function main() {
  const dataDir = process.env.SHOGUN_DATA_DIR ?? "./pgdata";
  const settings = loadSettingsFile(dataDir);

  const openaiKey = process.env.OPENAI_API_KEY ?? settings.openai_api_key ?? undefined;
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? settings.anthropic_api_key ?? undefined;
  const piiEnabled = process.env.SHOGUN_PII_REMOVAL !== "false";
  const piiFilter = new PIIFilter({ enabled: piiEnabled, logDetections: false });

  const brainOptions: ShogunBrainOptions = { dataDir };

  if (openaiKey) {
    const dims = { fast: 256, balanced: 1536, full: 3072 }[settings.embedding_tier] ?? 1536;
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
      const result = await dispatch(brain, piiFilter, dreamCycle, chatEngine, llmRouter, dataDir, path, body as Record<string, unknown>, url.searchParams);

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
  dataDir: string,
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
      if (!captureActive) return { ok: false, reason: "capture paused" };
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

    case "/api/timeline/today": {
      const { TimelineService } = await import("../memory/timeline-service.js");
      const svc = new TimelineService(brain);
      return svc.getToday();
    }

    case "/api/timeline/delete": {
      const { TimelineService } = await import("../memory/timeline-service.js");
      const svc = new TimelineService(brain);
      const range = String(params.range ?? "last_5min");
      const deleted = await svc.deleteRange(range);
      return { deleted };
    }

    // ─── Settings ─────────────────────────────────────────
    case "/api/settings/load":
      return loadSettingsFile(dataDir);

    case "/api/settings/save": {
      const current = loadSettingsFile(dataDir);
      const incoming = (params.settings ?? params) as Partial<AppSettings>;
      const merged = { ...current, ...incoming };
      saveSettingsFile(dataDir, merged);
      return { saved: true, settings: merged };
    }

    // ─── Capture control ──────────────────────────────────
    case "/api/capture/status":
      return { active: captureActive };

    case "/api/capture/pause":
      captureActive = false;
      return { paused: true };

    case "/api/capture/resume":
      captureActive = true;
      return { resumed: true };

    // ─── Pipes (Agents) ──────────────────────────────────
    case "/api/pipes": {
      const { BUILTIN_ACTIONS } = await import("../actions/engine.js");
      const settings = loadSettingsFile(dataDir);
      const pipeStates = (settings as Record<string, unknown>).pipe_states as Record<string, boolean> | undefined ?? {};
      const pipes = BUILTIN_ACTIONS.map((a, i) => ({
        ...a,
        id: `builtin-${i}`,
        enabled: pipeStates[`builtin-${i}`] ?? a.enabled,
        createdAt: new Date().toISOString(),
      }));
      return { pipes };
    }

    case "/api/pipes/enable": {
      const id = String(params.id);
      const enabled = Boolean(params.enabled);
      const settings = loadSettingsFile(dataDir) as Record<string, unknown>;
      const pipeStates = (settings.pipe_states as Record<string, boolean> | undefined) ?? {};
      pipeStates[id] = enabled;
      settings.pipe_states = pipeStates;
      saveSettingsFile(dataDir, settings as AppSettings);

      const router = brain.getLLMRouter();
      if (router) {
        const { ActionEngine, BUILTIN_ACTIONS } = await import("../actions/engine.js");
        const engine = new ActionEngine(brain, router);
        BUILTIN_ACTIONS.forEach((a, i) => engine.addAction({ ...a, id: `builtin-${i}`, createdAt: new Date() }));
        engine.setEnabled(id, enabled);
      }
      return { id, enabled };
    }

    case "/api/pipes/run": {
      const router = brain.getLLMRouter();
      if (!router) throw new Error("LLM router required for pipes. Add API keys in Settings.");
      const { ActionEngine, BUILTIN_ACTIONS } = await import("../actions/engine.js");
      const engine = new ActionEngine(brain, router);
      const id = String(params.id);
      BUILTIN_ACTIONS.forEach((a, i) => engine.addAction({ ...a, id: `builtin-${i}`, enabled: true, createdAt: new Date() }));
      const action = engine.listActions().find((a) => a.id === id);
      if (!action) throw new Error(`Pipe not found: ${id}`);
      const result = await engine.executeAction(action, params.data as Record<string, unknown> | undefined);
      return { result };
    }

    // ─── Integrations ─────────────────────────────────────
    case "/api/ingest/slack": {
      const token = String(params.token ?? "");
      const channelId = String(params.channel_id ?? "general");
      if (!token) throw new Error("token required");
      const { SlackIntegration } = await import("../integrations/slack.js");
      const slack = new SlackIntegration(brain, token);
      return slack.ingestChannel(channelId, { limit: Number(params.limit ?? 200) });
    }

    case "/api/ingest/github": {
      const token = String(params.token ?? "");
      const owner = String(params.owner ?? "");
      const repo = String(params.repo ?? "");
      if (!token || !owner || !repo) throw new Error("token, owner, repo required");
      const { GitHubIntegration } = await import("../integrations/github.js");
      const gh = new GitHubIntegration(brain, token);
      const issueResult = await gh.ingestIssues(owner, repo, { limit: Number(params.limit ?? 50) });
      const commitResult = await gh.ingestCommits(owner, repo, { limit: Number(params.limit ?? 50) });
      return { ...issueResult, commits: commitResult.commits };
    }

    case "/api/ingest/notion": {
      const token = String(params.token ?? "");
      if (!token) throw new Error("token required");
      const { NotionIntegration } = await import("../integrations/notion.js");
      const { OAuthTokenManager } = await import("../integrations/oauth.js");
      const auth = new OAuthTokenManager({
        clientId: "", clientSecret: "", tokenUrl: "",
        accessToken: token, refreshToken: "",
      });
      const notion = new NotionIntegration(brain, auth);
      return notion.ingestRecentPages({ limit: Number(params.limit ?? 50) });
    }

    case "/api/ingest/linear": {
      const apiKey = String(params.api_key ?? "");
      if (!apiKey) throw new Error("api_key required");
      const { LinearIntegration } = await import("../integrations/linear.js");
      const linear = new LinearIntegration(brain, apiKey);
      return linear.ingestIssues({ limit: Number(params.limit ?? 50), teamKey: params.team_key as string | undefined });
    }

    case "/api/ingest/gmail": {
      const { GmailIntegration } = await import("../integrations/gmail.js");
      const { createGoogleOAuth } = await import("../integrations/oauth.js");
      const oauth = createGoogleOAuth({
        clientId: String(params.client_id ?? ""),
        clientSecret: String(params.client_secret ?? ""),
        accessToken: String(params.access_token ?? ""),
        refreshToken: String(params.refresh_token ?? ""),
      });
      const gmail = new GmailIntegration(brain, oauth);
      return gmail.ingestRecent({ maxResults: Number(params.limit ?? 50) });
    }

    case "/api/ingest/calendar": {
      const token = String(params.token ?? "");
      if (!token) throw new Error("token required");
      const { GoogleCalendarIntegration } = await import("../integrations/google-calendar.js");
      const cal = new GoogleCalendarIntegration(brain, token);
      return cal.ingestEvents({ limit: Number(params.limit ?? 50) });
    }

    // ─── Export / Import ──────────────────────────────────
    case "/api/export": {
      const { BrainExporter } = await import("../integrations/export.js");
      const exporter = new BrainExporter(brain);
      return exporter.exportAll();
    }

    case "/api/import": {
      const { BrainExporter } = await import("../integrations/export.js");
      const exporter = new BrainExporter(brain);
      return exporter.importAll(params.data as Parameters<typeof exporter.importAll>[0]);
    }

    // ─── Briefing ─────────────────────────────────────────
    case "/api/briefing": {
      const router = brain.getLLMRouter();
      if (!router) throw new Error("LLM router required");
      const { BriefingGenerator } = await import("../agents/briefing.js");
      const gen = new BriefingGenerator(brain, router);
      const type = String(params.type ?? "morning");
      return type === "evening" ? gen.generateEvening() : gen.generateMorning();
    }

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
