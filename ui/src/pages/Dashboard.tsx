import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type BrainStats, type HealthReport } from "../lib/tauri";

export function Dashboard() {
  const [stats, setStats] = useState<BrainStats | null>(null);
  const [health, setHealth] = useState<HealthReport | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.getBrainStats().then(setStats);
    api.getHealth().then(setHealth);
  }, []);

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-shogun-muted mt-1">SHOGUN Memory Layer の状態</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Pages"
          value={stats?.total_pages ?? 0}
          icon="&#x1F4C4;"
        />
        <StatCard
          label="Chunks"
          value={stats?.total_chunks ?? 0}
          icon="&#x1F4E6;"
        />
        <StatCard
          label="Links"
          value={stats?.total_links ?? 0}
          icon="&#x1F517;"
        />
        <StatCard
          label="Tags"
          value={stats?.total_tags ?? 0}
          icon="&#x1F3F7;&#xFE0F;"
        />
      </div>

      {/* Health & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Health */}
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold">Brain Health</h2>
          {health && (
            <div className="space-y-3">
              <HealthBar
                label="Embed Coverage"
                value={health.embed_coverage}
                color="bg-green-500"
              />
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
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold">Quick Actions</h2>
          <div className="space-y-2">
            <button
              onClick={() => navigate("/search")}
              className="btn-secondary w-full text-left flex items-center gap-3"
            >
              <span>&#x1F50D;</span>
              <div>
                <p className="font-medium">検索 / Search</p>
                <p className="text-xs text-shogun-muted">メモリを検索する</p>
              </div>
            </button>
            <button
              onClick={() => api.runDreamCycle()}
              className="btn-secondary w-full text-left flex items-center gap-3"
            >
              <span>&#x1F319;</span>
              <div>
                <p className="font-medium">Dream Cycle</p>
                <p className="text-xs text-shogun-muted">手動で実行する</p>
              </div>
            </button>
            <button
              onClick={() => navigate("/settings")}
              className="btn-secondary w-full text-left flex items-center gap-3"
            >
              <span>&#x2699;&#xFE0F;</span>
              <div>
                <p className="font-medium">設定 / Settings</p>
                <p className="text-xs text-shogun-muted">APIキー・暗号化を管理</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="card flex items-center gap-4">
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
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
