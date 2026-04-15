/**
 * Tauri IPC bridge — wraps invoke calls with type safety.
 * Falls back to mock data when running in browser (dev without Tauri).
 */

interface BrainStats {
  total_pages: number;
  total_chunks: number;
  embedded_chunks: number;
  total_links: number;
  total_tags: number;
  total_timeline_entries: number;
  pages_by_type: Record<string, number>;
}

interface SearchResult {
  slug: string;
  title: string;
  page_type: string;
  score: number;
  snippet: string;
  match_type?: string;
}

interface PageData {
  slug: string;
  title: string;
  page_type: string;
  compiled_truth: string;
  timeline: string;
  tags: string[];
  updated_at: string;
}

interface HealthReport {
  embed_coverage: number;
  stale_pages: number;
  orphan_pages: number;
  broken_links: number;
  last_dream_cycle: string | null;
}

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

interface PageListItem {
  slug: string;
  title: string;
  page_type: string;
  updated_at: string;
}

// Bridge HTTP base URL
const BRIDGE_URL = "http://localhost:3847";

// Map command names to HTTP endpoints
const CMD_TO_PATH: Record<string, { method: string; path: string }> = {
  get_brain_stats: { method: "GET", path: "/api/stats" },
  get_health: { method: "GET", path: "/api/health" },
  search_memory: { method: "POST", path: "/api/search" },
  hybrid_search: { method: "POST", path: "/api/search" },
  get_page: { method: "POST", path: "/api/page" },
  put_page: { method: "POST", path: "/api/page/put" },
  delete_page: { method: "POST", path: "/api/page/delete" },
  list_pages: { method: "GET", path: "/api/pages" },
  chat: { method: "POST", path: "/api/chat" },
  run_dream_cycle: { method: "POST", path: "/api/dream" },
  get_timeline_range: { method: "POST", path: "/api/timeline" },
  load_settings: { method: "GET", path: "/api/settings/load" },
  save_settings: { method: "POST", path: "/api/settings/save" },
};

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  // Strategy 1: Try HTTP bridge (works regardless of Tauri)
  const route = CMD_TO_PATH[cmd];
  if (route) {
    try {
      const res = await fetch(`${BRIDGE_URL}${route.path}`, {
        method: route.method,
        headers: { "Content-Type": "application/json" },
        body: route.method === "POST" ? JSON.stringify(args ?? {}) : undefined,
      });
      if (res.ok) return res.json() as Promise<T>;
    } catch {
      // Bridge not running — fall through
    }
  }

  // Strategy 2: Try Tauri invoke (if inside Tauri WebView)
  if (typeof window !== "undefined" && "__TAURI__" in window) {
    try {
      const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
      return await tauriInvoke<T>(cmd, args);
    } catch {
      // Tauri invoke failed — fall through
    }
  }

  // Strategy 3: Mock fallback (dev mode)
  return getMockResponse<T>(cmd, args);
}

function getMockResponse<T>(cmd: string, _args?: Record<string, unknown>): T {
  const mocks: Record<string, unknown> = {
    get_brain_stats: {
      total_pages: 42,
      total_chunks: 156,
      embedded_chunks: 120,
      total_links: 38,
      total_tags: 67,
      total_timeline_entries: 234,
      pages_by_type: { person: 15, company: 8, session: 12, concept: 7 },
    },
    search_memory: [
      { slug: "people/demo-user", title: "Demo User", page_type: "person", score: 0.95, snippet: "A demo user for development testing." },
      { slug: "concepts/memory-layer", title: "Memory Layer", page_type: "concept", score: 0.82, snippet: "SHOGUN's core memory engine." },
    ],
    hybrid_search: [
      { slug: "people/demo-user", title: "Demo User", page_type: "person", score: 0.95, snippet: "A demo user.", match_type: "hybrid" },
    ],
    get_page: {
      slug: "people/demo-user",
      title: "Demo User",
      page_type: "person",
      compiled_truth: "A demo user created during development. This page demonstrates the SHOGUN page format.",
      timeline: "- 2025-01-01: Page created for testing",
      tags: ["demo", "test"],
      updated_at: new Date().toISOString(),
    },
    list_pages: [
      { slug: "people/demo-user", title: "Demo User", page_type: "person", updated_at: new Date().toISOString() },
      { slug: "concepts/memory-layer", title: "Memory Layer", page_type: "concept", updated_at: new Date().toISOString() },
    ],
    get_health: {
      embed_coverage: 0.77,
      stale_pages: 5,
      orphan_pages: 12,
      broken_links: 0,
      last_dream_cycle: null,
    },
    run_dream_cycle: { synced: 3, skipped: 39, health: { embed_coverage: 0.82 } },
    export_brain: { version: 1, pages: [], links: [] },
    import_brain: { imported: 0, skipped: 0, links_created: 0 },
    start_capture: { started: true },
    chat: { content: "Based on your memory, here is what I found...", citations: [{ slug: "people/demo-user", title: "Demo User", snippet: "A demo user for testing." }] },
    start_ocr_capture: { started: true },
    start_audio_capture: { started: true },
    load_settings: {
      openai_api_key: null,
      anthropic_api_key: null,
      data_dir: "./pgdata",
      embedding_tier: "balanced",
      encryption_enabled: false,
      dream_cycle_enabled: true,
      language: "ja",
      onboarding_completed: true, // true in dev mode to avoid redirect loop
    },
    save_settings: undefined,
    put_page: { slug: "test/page", title: "Test", page_type: "concept", compiled_truth: "", timeline: "", tags: [], updated_at: new Date().toISOString() },
    delete_page: true,
    pause_capture: { paused: true },
    resume_capture: { resumed: true },
    get_timeline_range: [
      { date: new Date().toISOString().slice(0, 10), entries: [
        { content: "[Chrome] SHOGUN documentation", source: "window_capture", created_at: new Date().toISOString() },
        { content: "[VSCode] src/brain.ts", source: "window_capture", created_at: new Date().toISOString() },
      ], pageSlug: `sessions/${new Date().toISOString().slice(0, 10)}`, totalEntries: 42, appBreakdown: { Chrome: 18, VSCode: 15, Slack: 9 }, sources: { window_capture: 30, clipboard: 8, ocr_capture: 4 } },
    ],
    get_today_timeline: { date: new Date().toISOString().slice(0, 10), entries: [], pageSlug: `sessions/${new Date().toISOString().slice(0, 10)}`, totalEntries: 0, appBreakdown: {}, sources: {} },
    delete_timeline_range: { deleted: 0 },
    list_pipes: { pipes: [
      { id: "builtin-0", name: "Weekly Digest", description: "Compile weekly activity digest every Friday", trigger: { type: "schedule", cron: "0 18 * * 5", description: "Every Friday at 18:00" }, enabled: false },
      { id: "builtin-1", name: "Meeting Action Items", description: "Extract action items after each meeting", trigger: { type: "event", event: "meeting_ended" }, enabled: true },
      { id: "builtin-2", name: "New Contact Summary", description: "Auto-search related info for new contacts", trigger: { type: "event", event: "page_created" }, enabled: false },
      { id: "builtin-3", name: "Daily Standup Prep", description: "Summarize yesterday's work for standup", trigger: { type: "schedule", cron: "0 9 * * 1-5", description: "Weekdays at 09:00" }, enabled: false },
    ] },
    set_pipe_enabled: { id: "", enabled: true },
    run_pipe: { result: "Pipe executed successfully. Generated summary of 5 key events." },
  };
  return (mocks[cmd] ?? null) as T;
}

export const api = {
  getBrainStats: () => invoke<BrainStats>("get_brain_stats"),
  searchMemory: (query: string, limit?: number) =>
    invoke<SearchResult[]>("search_memory", { query, limit }),
  hybridSearch: (query: string, limit?: number) =>
    invoke<SearchResult[]>("hybrid_search", { query, limit }),
  getPage: (slug: string) => invoke<PageData | null>("get_page", { slug }),
  putPage: (data: {
    slug: string;
    title: string;
    page_type: string;
    compiled_truth: string;
    tags: string[];
  }) => invoke<PageData>("put_page", data),
  deletePage: (slug: string) => invoke<boolean>("delete_page", { slug }),
  listPages: (options?: { page_type?: string; tag?: string; limit?: number }) =>
    invoke<PageListItem[]>("list_pages", options ?? {}),
  getHealth: () => invoke<HealthReport>("get_health"),
  runDreamCycle: () => invoke<unknown>("run_dream_cycle"),
  exportBrain: () => invoke<unknown>("export_brain"),
  importBrain: (data: unknown) => invoke<unknown>("import_brain", { data }),
  startCapture: (intervalMs?: number) =>
    invoke<unknown>("start_capture", { interval_ms: intervalMs }),
  chat: (message: string) => invoke<unknown>("chat", { message }),
  pauseCapture: () => invoke<unknown>("pause_capture"),
  resumeCapture: () => invoke<unknown>("resume_capture"),
  startOCRCapture: () => invoke<unknown>("start_ocr_capture"),
  startAudioCapture: () => invoke<unknown>("start_audio_capture"),
  // Timeline
  getTimelineRange: (startDate: string, endDate: string, limit?: number) =>
    invoke<unknown>("get_timeline_range", { start_date: startDate, end_date: endDate, limit }),
  getTodayTimeline: () => invoke<unknown>("get_today_timeline"),
  deleteTimelineRange: (range: string) => invoke<unknown>("delete_timeline_range", { range }),

  // Pipes
  listPipes: () => invoke<unknown>("list_pipes"),
  setPipeEnabled: (id: string, enabled: boolean) => invoke<unknown>("set_pipe_enabled", { id, enabled }),
  runPipe: (id: string) => invoke<unknown>("run_pipe", { id }),

  saveSettings: (settings: AppSettings) =>
    invoke<void>("save_settings", { settings }),
  loadSettings: () => invoke<AppSettings>("load_settings"),
};

export type { BrainStats, SearchResult, PageData, HealthReport, AppSettings, PageListItem };
