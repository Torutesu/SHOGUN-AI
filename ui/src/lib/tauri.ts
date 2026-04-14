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
}

interface SearchResult {
  slug: string;
  title: string;
  page_type: string;
  score: number;
  snippet: string;
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

// Check if running inside Tauri
const isTauri = typeof window !== "undefined" && "__TAURI__" in window;

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (isTauri) {
    const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
    return tauriInvoke<T>(cmd, args);
  }
  // Mock fallback for browser dev
  return getMockResponse<T>(cmd);
}

function getMockResponse<T>(cmd: string): T {
  const mocks: Record<string, unknown> = {
    get_brain_stats: {
      total_pages: 42,
      total_chunks: 156,
      embedded_chunks: 120,
      total_links: 38,
      total_tags: 67,
    },
    search_memory: [],
    get_page: null,
    get_health: { embed_coverage: 0.77, stale_pages: 5, orphan_pages: 12 },
    load_settings: {
      openai_api_key: null,
      anthropic_api_key: null,
      data_dir: "./pgdata",
      embedding_tier: "balanced",
      encryption_enabled: false,
      dream_cycle_enabled: true,
      language: "ja",
      onboarding_completed: false,
    },
  };
  return (mocks[cmd] ?? null) as T;
}

export const api = {
  getBrainStats: () => invoke<BrainStats>("get_brain_stats"),
  searchMemory: (query: string, limit?: number) =>
    invoke<SearchResult[]>("search_memory", { query, limit }),
  getPage: (slug: string) => invoke<PageData | null>("get_page", { slug }),
  putPage: (data: {
    slug: string;
    title: string;
    page_type: string;
    compiled_truth: string;
    tags: string[];
  }) => invoke<PageData>("put_page", data),
  deletePage: (slug: string) => invoke<boolean>("delete_page", { slug }),
  getHealth: () => invoke<HealthReport>("get_health"),
  runDreamCycle: () => invoke<string>("run_dream_cycle"),
  saveSettings: (settings: AppSettings) =>
    invoke<void>("save_settings", { settings }),
  loadSettings: () => invoke<AppSettings>("load_settings"),
};

export type { BrainStats, SearchResult, PageData, HealthReport, AppSettings };
