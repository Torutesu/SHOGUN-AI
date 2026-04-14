#!/usr/bin/env node
/**
 * SHOGUN Bridge Server — JSON-RPC over stdio.
 *
 * This process is spawned by Tauri as a sidecar. It receives JSON-RPC
 * requests from Rust via stdin and sends responses to stdout.
 *
 * This bridges the gap between Tauri (Rust) and ShogunBrain (TypeScript).
 */

import { createInterface } from "readline";
import { ShogunBrain } from "../brain.js";
import { OpenAIEmbeddingProvider } from "../embeddings/openai.js";
import { DreamCycle } from "../dream/cycle.js";
import { LLMRouter, createClaudeProvider, createOpenAIProvider } from "../llm/router.js";
import { PIIFilter } from "../security/pii.js";
import { logger } from "../logger.js";
import type { ShogunBrainOptions } from "../brain.js";

interface JsonRpcRequest {
  id: number;
  method: string;
  params: Record<string, unknown>;
}

interface JsonRpcResponse {
  id: number;
  result?: unknown;
  error?: { code: number; message: string };
}

// Suppress logger from writing to stderr during bridge mode
logger.setLevel("warn");

async function main() {
  const dataDir = process.env.SHOGUN_DATA_DIR ?? "./pgdata";
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const embeddingTier = process.env.SHOGUN_EMBEDDING_TIER ?? "balanced";
  let encryptionPassphrase = process.env.SHOGUN_ENCRYPTION_PASSPHRASE;
  const piiEnabled = process.env.SHOGUN_PII_REMOVAL !== "false"; // Default ON
  const piiFilter = new PIIFilter({ enabled: piiEnabled, logDetections: false });

  // If encryption requested but no passphrase, try OS keychain
  if (encryptionPassphrase === "keychain") {
    const { KeychainManager } = await import("../security/keychain.js");
    const keychain = new KeychainManager();
    const available = await keychain.isAvailable();
    if (available) {
      encryptionPassphrase = await keychain.getOrCreatePassphrase();
    } else {
      encryptionPassphrase = undefined;
      process.stderr.write("Warning: OS keychain not available. Encryption disabled.\n");
    }
  }

  // Configure brain with all available providers
  const brainOptions: ShogunBrainOptions = {
    dataDir,
    encryptionPassphrase: encryptionPassphrase || undefined,
  };

  // Map tier to dimensions
  const tierDims: Record<string, number> = { fast: 256, balanced: 1536, full: 3072 };
  const dimensions = tierDims[embeddingTier] ?? 1536;

  if (openaiKey) {
    brainOptions.embeddingProvider = new OpenAIEmbeddingProvider({
      apiKey: openaiKey,
      dimensions,
    });
  }

  // Build LLM router with available providers
  const llmRouter = new LLMRouter();
  if (openaiKey) {
    llmRouter.addProvider(createOpenAIProvider(openaiKey, "gpt-4o-mini"));
  }
  if (anthropicKey) {
    llmRouter.addProvider(createClaudeProvider(anthropicKey, "haiku"));
    llmRouter.addProvider(createClaudeProvider(anthropicKey, "sonnet"));
  }
  if (llmRouter.listProviders().length > 0) {
    brainOptions.llmRouter = llmRouter;
  }

  const brain = new ShogunBrain(brainOptions);
  await brain.init();

  // Create full DreamCycle with entity extraction + consolidation
  const dreamCycle = new DreamCycle(brain, { llmRouter: brainOptions.llmRouter });

  const rl = createInterface({ input: process.stdin });

  rl.on("line", async (line) => {
    let req: JsonRpcRequest;
    try {
      req = JSON.parse(line);
    } catch {
      return;
    }

    let response: JsonRpcResponse;
    try {
      const result = await dispatch(brain, piiFilter, dreamCycle, req.method, req.params);
      response = { id: req.id, result };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      response = { id: req.id, error: { code: -1, message: msg } };
    }

    process.stdout.write(JSON.stringify(response) + "\n");
  });

  rl.on("close", async () => {
    await brain.close();
    process.exit(0);
  });

  // Graceful shutdown on SIGTERM (sent by Tauri when app closes)
  process.on("SIGTERM", async () => {
    await brain.close();
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    await brain.close();
    process.exit(0);
  });
}

// Module-level singleton for chat engine (avoids globalThis pollution)
let chatEngineInstance: InstanceType<typeof import("../chat/engine.js").ChatEngine> | null = null;

async function dispatch(
  brain: ShogunBrain,
  piiFilter: PIIFilter,
  dreamCycle: DreamCycle,
  method: string,
  params: Record<string, unknown>
): Promise<unknown> {
  switch (method) {
    case "get_brain_stats":
      return brain.getStats();

    case "get_health":
      return brain.getHealth();

    case "search_memory": {
      const query = String(params.query ?? "");
      const limit = Number(params.limit ?? 20);
      const results = await brain.searchPipeline.keywordOnly(query, limit);
      return results.map((r) => ({
        slug: r.page.slug,
        title: r.page.title,
        page_type: r.page.type,
        score: r.score,
        snippet: r.page.compiled_truth.slice(0, 200),
      }));
    }

    case "hybrid_search": {
      const query = String(params.query ?? "");
      const limit = Number(params.limit ?? 10);
      const results = await brain.searchPipeline.query({ query, limit });
      return results.map((r) => ({
        slug: r.page.slug,
        title: r.page.title,
        page_type: r.page.type,
        score: r.score,
        snippet: r.chunk_text ?? r.page.compiled_truth.slice(0, 200),
        match_type: r.match_type,
      }));
    }

    case "get_page": {
      const slug = String(params.slug ?? "");
      const page = await brain.pages.getPage(slug);
      if (!page) return null;
      const tags = await brain.tags.getTagsForPage(page.id);
      return {
        slug: page.slug,
        title: page.title,
        page_type: page.type,
        compiled_truth: page.compiled_truth,
        timeline: page.timeline,
        tags,
        updated_at: page.updated_at?.toISOString?.() ?? "",
      };
    }

    case "put_page": {
      const filterText = (t: string) => piiFilter.filter(t);
      const page = await brain.pages.putPage({
        slug: String(params.slug),
        type: String(params.page_type ?? params.type) as "person" | "company" | "session" | "concept",
        title: filterText(String(params.title)),
        compiled_truth: filterText(String(params.compiled_truth)),
        timeline: params.timeline ? filterText(String(params.timeline)) : undefined,
      });
      const tags = (params.tags as string[]) ?? [];
      for (const tag of tags) {
        await brain.tags.addTag(page.id, tag);
      }
      await brain.rechunkPage(page.id);
      const allTags = await brain.tags.getTagsForPage(page.id);
      return {
        slug: page.slug,
        title: page.title,
        page_type: page.type,
        compiled_truth: page.compiled_truth,
        timeline: page.timeline,
        tags: allTags,
        updated_at: page.updated_at?.toISOString?.() ?? "",
      };
    }

    case "delete_page": {
      const deleted = await brain.pages.deletePage(String(params.slug));
      return deleted;
    }

    case "list_pages": {
      const validTypes = ["person", "company", "session", "concept"];
      const typeParam = params.type ? String(params.type) : undefined;
      const pages = await brain.pages.listPages({
        type: typeParam && validTypes.includes(typeParam) ? typeParam as "person" | "company" | "session" | "concept" : undefined,
        tag: params.tag ? String(params.tag) : undefined,
        limit: Number(params.limit ?? 50),
        offset: Number(params.offset ?? 0),
      });
      return pages.map((p) => ({
        slug: p.slug,
        title: p.title,
        page_type: p.type,
        updated_at: p.updated_at?.toISOString?.() ?? "",
      }));
    }

    case "run_dream_cycle": {
      // Use full 6-step DreamCycle (entity extraction + consolidation)
      const result = await dreamCycle.run();
      return result;
    }

    case "add_clipboard_entry": {
      // Passive capture: clipboard content
      const text = piiFilter.filter(String(params.text ?? ""));
      const source = String(params.source ?? "clipboard");
      const date = new Date().toISOString().slice(0, 10);
      const slug = `sessions/${date}`;

      let page = await brain.pages.getPage(slug);
      if (!page) {
        page = await brain.pages.putPage({
          slug,
          type: "session",
          title: `Session ${date}`,
          compiled_truth: "Daily activity log.",
        });
      }

      await brain.timeline.addEntry(page.id, date, text, source);
      return { slug, entry_added: true };
    }

    case "add_window_entry": {
      // Passive capture: active window info
      const appName = String(params.app_name ?? "");
      const windowTitle = piiFilter.filter(String(params.window_title ?? ""));
      const date = new Date().toISOString().slice(0, 10);
      const slug = `sessions/${date}`;

      let page = await brain.pages.getPage(slug);
      if (!page) {
        page = await brain.pages.putPage({
          slug,
          type: "session",
          title: `Session ${date}`,
          compiled_truth: "Daily activity log.",
        });
      }

      await brain.timeline.addEntry(
        page.id,
        date,
        `[${appName}] ${windowTitle}`,
        "window_capture"
      );
      return { slug, entry_added: true };
    }

    case "export_brain": {
      const { BrainExporter } = await import("../integrations/export.js");
      const exporter = new BrainExporter(brain);
      return exporter.exportAll();
    }

    case "import_brain": {
      const { BrainExporter } = await import("../integrations/export.js");
      const exporter = new BrainExporter(brain);
      return exporter.importAll(params.data as Parameters<typeof exporter.importAll>[0]);
    }

    case "ingest_slack": {
      const token = String(params.token ?? "");
      const channelId = String(params.channel_id ?? "");
      if (!token || !channelId) throw new Error("token and channel_id required");
      const { SlackIntegration } = await import("../integrations/slack.js");
      const slack = new SlackIntegration(brain, token);
      return slack.ingestChannel(channelId, {
        limit: Number(params.limit ?? 200),
      });
    }

    case "ingest_github": {
      const token = String(params.token ?? "");
      const owner = String(params.owner ?? "");
      const repo = String(params.repo ?? "");
      if (!token || !owner || !repo) throw new Error("token, owner, repo required");
      const { GitHubIntegration } = await import("../integrations/github.js");
      const gh = new GitHubIntegration(brain, token);
      const issueResult = await gh.ingestIssues(owner, repo, {
        limit: Number(params.limit ?? 50),
      });
      const commitResult = await gh.ingestCommits(owner, repo, {
        limit: Number(params.limit ?? 50),
      });
      return { ...issueResult, commits: commitResult.commits };
    }

    case "ingest_google_calendar": {
      const token = String(params.token ?? "");
      if (!token) throw new Error("token required");
      const { GoogleCalendarIntegration } = await import("../integrations/google-calendar.js");
      const cal = new GoogleCalendarIntegration(brain, token);
      return cal.ingestEvents({
        limit: Number(params.limit ?? 50),
      });
    }

    case "start_capture": {
      // Start passive capture engine within the bridge process
      const { PassiveCaptureEngine } = await import("../capture/passive.js");
      const captureEngine = new PassiveCaptureEngine({
        intervalMs: Number(params.interval_ms ?? 5000),
        piiFilter: piiFilter,
        onCapture: async (event) => {
          const date = event.timestamp.toISOString().slice(0, 10);
          const slug = `sessions/${date}`;

          let page = await brain.pages.getPage(slug);
          if (!page) {
            page = await brain.pages.putPage({
              slug,
              type: "session",
              title: `Session ${date}`,
              compiled_truth: "Daily activity log.",
            });
          }

          const text = event.type === "window" && event.appName
            ? `[${event.appName}] ${event.text}`
            : event.text;

          await brain.timeline.addEntry(page.id, date, text, event.type);
        },
      });
      captureEngine.start();
      return { started: true };
    }

    case "chat": {
      const message = String(params.message ?? "");
      if (!message) throw new Error("message required");

      const router = brain.getLLMRouter();
      if (!router) throw new Error("No LLM configured. Add OPENAI_API_KEY or ANTHROPIC_API_KEY.");

      const { ChatEngine } = await import("../chat/engine.js");
      // Singleton chat engine per bridge session
      if (!chatEngineInstance) {
        chatEngineInstance = new ChatEngine(brain, router);
      }
      return chatEngineInstance.chat(message);
    }

    case "start_ocr_capture": {
      const { OCRCaptureEngine } = await import("../capture/ocr.js");
      const ocrEngine = new OCRCaptureEngine({
        intervalMs: Number(params.interval_ms ?? 2000),
        piiFilter,
        onCapture: async (result) => {
          const date = result.timestamp.toISOString().slice(0, 10);
          const slug = `sessions/${date}`;
          let page = await brain.pages.getPage(slug);
          if (!page) {
            page = await brain.pages.putPage({
              slug, type: "session",
              title: `Session ${date}`,
              compiled_truth: "Daily activity log.",
            });
          }
          await brain.timeline.addEntry(
            page.id, date,
            `[${result.source}] [${result.appName}] ${result.text.slice(0, 2000)}`,
            "ocr_capture"
          );
        },
      });
      await ocrEngine.start();
      return { started: true };
    }

    case "start_audio_capture": {
      const { AudioCaptureEngine } = await import("../capture/audio.js");
      const audioEngine = new AudioCaptureEngine({
        piiFilter,
        whisperModel: (params.model as "tiny" | "base" | "small" | "medium") ?? "base",
        onTranscript: async (segments, meetingApp) => {
          const date = new Date().toISOString().slice(0, 10);
          const time = new Date().toISOString().slice(11, 16);
          const slug = `sessions/${date}-meeting-${time.replace(":", "")}`;

          const transcript = segments.map((s) => s.text).join(" ");
          let page = await brain.pages.getPage(slug);
          if (!page) {
            page = await brain.pages.putPage({
              slug, type: "session",
              title: `${meetingApp} Meeting — ${date} ${time}`,
              compiled_truth: transcript,
              frontmatter: { source: "audio_capture", app: meetingApp },
            });
            await brain.tags.addTag(page.id, "meeting");
            await brain.tags.addTag(page.id, meetingApp.toLowerCase().replace(/\s+/g, "-"));
          } else {
            // Append transcript to existing page
            await brain.pages.putPage({
              slug, type: "session",
              title: page.title,
              compiled_truth: page.compiled_truth + "\n" + transcript,
            });
          }

          // Add timeline entry for each segment
          for (const seg of segments) {
            await brain.timeline.addEntry(
              page.id, date,
              seg.text,
              `${meetingApp} (${seg.start.toFixed(0)}s-${seg.end.toFixed(0)}s)`
            );
          }
        },
        // Auto-summary when meeting ends (Granola-style)
        onMeetingEnd: async (meetingApp, fullTranscript) => {
          const router = brain.getLLMRouter();
          if (!router || !fullTranscript.trim()) return;

          const { SYSTEM_PROMPTS } = await import("../identity.js");
          const summary = await router.call(
            `${SYSTEM_PROMPTS.meetingSummary}\n\nTranscript:\n${fullTranscript.slice(0, 8000)}`,
            "medium",
            { maxTokens: 1024 }
          );

          // Save summary as a page
          const date = new Date().toISOString().slice(0, 10);
          const slug = `sessions/${date}-${meetingApp.toLowerCase().replace(/\s+/g, "-")}-summary`;
          await brain.pages.putPage({
            slug,
            type: "session",
            title: `${meetingApp} Summary — ${date}`,
            compiled_truth: summary,
            frontmatter: { source: "meeting_summary", app: meetingApp, auto_generated: true },
          });
          const summaryPage = await brain.pages.getPage(slug);
          if (summaryPage) {
            await brain.tags.addTag(summaryPage.id, "meeting-summary");
            await brain.tags.addTag(summaryPage.id, "auto-generated");
          }

          // Trigger action engine event
          const { ActionEngine, BUILTIN_ACTIONS } = await import("../actions/engine.js");
          const actionEngine = new ActionEngine(brain, router);
          for (const tmpl of BUILTIN_ACTIONS) {
            if (tmpl.trigger.type === "event" && tmpl.trigger.event === "meeting_ended") {
              actionEngine.addAction({ ...tmpl, id: `meeting-${Date.now()}`, enabled: true, createdAt: new Date() });
            }
          }
          await actionEngine.triggerEvent("meeting_ended", {
            meetingApp,
            transcript: fullTranscript.slice(0, 4000),
            summary,
          });
        },
      });
      audioEngine.start();
      return { started: true };
    }

    default:
      throw new Error(`Unknown method: ${method}`);
  }
}

main().catch((err) => {
  process.stderr.write(`Bridge server failed: ${err}\n`);
  process.exit(1);
});
