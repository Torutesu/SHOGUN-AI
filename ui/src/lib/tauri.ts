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

// Check if running inside Tauri
const isTauri = typeof window !== "undefined" && "__TAURI__" in window;

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (isTauri) {
    const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
    return tauriInvoke<T>(cmd, args);
  }
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
    put_page: { slug: "test/page", title: "Test", page_type: "concept" },
    delete_page: true,
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
  saveSettings: (settings: AppSettings) =>
    invoke<void>("save_settings", { settings }),
  loadSettings: () => invoke<AppSettings>("load_settings"),
};

export type { BrainStats, SearchResult, PageData, HealthReport, AppSettings, PageListItem };
