import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type BrainStats, type HealthReport } from "../lib/tauri";

export function Dashboard() {
  const [stats, setStats] = useState<BrainStats | null>(null);
  const [health, setHealth] = useState<HealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dreamRunning, setDreamRunning] = useState(false);
  const [dreamResult, setDreamResult] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.getBrainStats().then(setStats),
      api.getHealth().then(setHealth),
    ])
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const handleDreamCycle = async () => {
    setDreamRunning(true);
    setDreamResult(null);
    try {
      await api.runDreamCycle();
      setDreamResult("Dream Cycle completed!");
      // Refresh stats
      api.getBrainStats().then(setStats);
      api.getHealth().then(setHealth);
    } catch (err) {
      setDreamResult(`Failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
    setDreamRunning(false);
    setTimeout(() => setDreamResult(null), 5000);
  };

  // Greeting based on time
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "おはようございます" : hour < 18 ? "こんにちは" : "こんばんは";
  const brainLevel = getBrainLevel(stats?.total_pages ?? 0);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-shogun-red border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-fadeIn">
      {/* Greeting + Intelligence Score */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{greeting}!</h1>
          <p className="text-shogun-muted mt-1">
            {stats && stats.total_pages > 0
              ? `${stats.total_pages.toLocaleString()}件のメモリがあなたを待っています`
              : "SHOGUNへようこそ。最初のメモリを作りましょう"}
          </p>
        </div>
        {stats && stats.total_pages > 0 && (
          <div className="text-center">
            <div className="text-3xl font-bold text-shogun-red">{brainLevel.score}</div>
            <div className="text-xs text-shogun-muted">{brainLevel.label}</div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pages" value={stats?.total_pages ?? 0} icon="📄" delay={0} />
        <StatCard label="Chunks" value={stats?.total_chunks ?? 0} icon="📦" delay={50} />
        <StatCard label="Links" value={stats?.total_links ?? 0} icon="🔗" delay={100} />
        <StatCard label="Timeline" value={stats?.total_timeline_entries ?? 0} icon="📅" delay={150} />
      </div>

      {/* Health & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Health */}
        <div className="card animate-slideUp" style={{ animationDelay: "200ms" }}>
          <h2 className="text-lg font-semibold mb-4">Brain Health</h2>
          {health && (
            <div className="space-y-3">
              <HealthBar label="Embed Coverage" value={health.embed_coverage} color="bg-green-500" />
              <div className="flex justify-between text-sm">
                <span className="text-shogun-muted">Stale Pages</span>
                <span className={health.stale_pages > 0 ? "text-yellow-400" : "text-green-400"}>
                  {health.stale_pages}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-shogun-muted">Orphan Pages</span>
                <span className={health.orphan_pages > 0 ? "text-yellow-400" : "text-green-400"}>
                  {health.orphan_pages}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card animate-slideUp" style={{ animationDelay: "300ms" }}>
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <button
              onClick={() => navigate("/chat")}
              className="btn-secondary w-full text-left flex items-center gap-3"
            >
              <span>🧠</span>
              <div>
                <p className="font-medium">メモリに聞く / Ask Memory</p>
                <p className="text-xs text-shogun-muted">AIが記憶を使って回答</p>
              </div>
            </button>
            <button
              onClick={() => navigate("/search")}
              className="btn-secondary w-full text-left flex items-center gap-3"
            >
              <span>🔍</span>
              <div>
                <p className="font-medium">検索 / Search</p>
                <p className="text-xs text-shogun-muted">メモリを検索する</p>
              </div>
            </button>
            <button
              onClick={handleDreamCycle}
              disabled={dreamRunning}
              className="btn-secondary w-full text-left flex items-center gap-3 disabled:opacity-50"
            >
              {dreamRunning ? (
                <div className="w-5 h-5 border-2 border-shogun-muted border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>🌙</span>
              )}
              <div>
                <p className="font-medium">
                  {dreamRunning ? "実行中..." : "Dream Cycle"}
                </p>
                <p className="text-xs text-shogun-muted">
                  {dreamResult ?? "同期・整理・ヘルスチェック"}
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, delay }: { label: string; value: number; icon: string; delay: number }) {
  return (
    <div className="card flex items-center gap-4 animate-slideUp" style={{ animationDelay: `${delay}ms` }}>
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-2xl font-bold">{value.toLocaleString()}</p>
        <p className="text-sm text-shogun-muted">{label}</p>
      </div>
    </div>
  );
}

function HealthBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.round(value * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-shogun-muted">{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-1000 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function getBrainLevel(pages: number): { score: number; label: string } {
  if (pages >= 10000) return { score: 99, label: "全知 / Omniscient" };
  if (pages >= 5000) return { score: 85, label: "賢者 / Sage" };
  if (pages >= 1000) return { score: 70, label: "学者 / Scholar" };
  if (pages >= 100) return { score: 50, label: "見習い / Apprentice" };
  if (pages >= 10) return { score: 25, label: "初心者 / Novice" };
  return { score: Math.max(1, pages), label: "覚醒 / Awakening" };
}
