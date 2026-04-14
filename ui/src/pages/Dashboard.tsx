import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type BrainStats, type HealthReport } from "../lib/tauri";
import { useLang, t } from "../lib/i18n";

export function Dashboard() {
  const [stats, setStats] = useState<BrainStats | null>(null);
  const [health, setHealth] = useState<HealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dreamRunning, setDreamRunning] = useState(false);
  const [dreamDone, setDreamDone] = useState(false);
  const navigate = useNavigate();
  const lang = useLang();

  useEffect(() => {
    Promise.all([
      api.getBrainStats().then(setStats),
      api.getHealth().then(setHealth),
    ]).catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? t("dash.greeting.morning", lang)
    : hour < 18 ? t("dash.greeting.afternoon", lang)
    : t("dash.greeting.evening", lang);

  const score = getScore(stats?.total_pages ?? 0);

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-5 h-5 border-2 border-gold border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="p-6 max-w-[960px] mx-auto space-y-6 animate-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">{greeting}</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {stats && stats.total_pages > 0
              ? `${stats.total_pages.toLocaleString()} ${t("dash.memories", lang)}`
              : t("dash.first", lang)}
          </p>
        </div>
        {stats && stats.total_pages > 0 && (
          <div className="text-right">
            <div className="text-2xl font-semibold text-gold">{score.value}</div>
            <div className="text-[10px] text-text-disabled uppercase tracking-widest">{score.label}</div>
          </div>
        )}
      </div>

      {error && <div className="bg-status-error/10 border border-status-error/20 rounded-md px-3 py-2 text-sm text-status-error animate-down">{error}</div>}

      <div className="grid grid-cols-4 gap-3">
        <Metric label={t("metric.pages", lang)} value={stats?.total_pages ?? 0} delay={0} />
        <Metric label={t("metric.chunks", lang)} value={stats?.total_chunks ?? 0} delay={50} />
        <Metric label={t("metric.links", lang)} value={stats?.total_links ?? 0} delay={100} />
        <Metric label={t("metric.events", lang)} value={stats?.total_timeline_entries ?? 0} delay={150} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card animate-up" style={{ animationDelay: "200ms" }}>
          <div className="text-[10px] text-text-disabled uppercase tracking-widest mb-3">{t("dash.health", lang)}</div>
          {health && (
            <div className="space-y-3">
              <ProgressBar label={t("metric.coverage", lang)} value={health.embed_coverage} />
              <Row label={t("metric.stale", lang)} value={health.stale_pages} warn={health.stale_pages > 0} />
              <Row label={t("metric.orphans", lang)} value={health.orphan_pages} warn={health.orphan_pages > 0} />
            </div>
          )}
        </div>

        <div className="card animate-up" style={{ animationDelay: "300ms" }}>
          <div className="text-[10px] text-text-disabled uppercase tracking-widest mb-3">{t("dash.actions", lang)}</div>
          <div className="space-y-1.5">
            <ActionBtn icon="🧠" label={t("dash.ask", lang)} sub={t("dash.ask.sub", lang)} onClick={() => navigate("/chat")} />
            <ActionBtn icon="🔍" label={t("dash.search", lang)} sub={t("dash.search.sub", lang)} onClick={() => navigate("/search")} />
            <ActionBtn
              icon={dreamRunning ? undefined : "🌙"}
              label={dreamRunning ? t("dash.dream.running", lang) : dreamDone ? t("dash.dream.done", lang) : t("dash.dream", lang)}
              sub={t("dash.dream.sub", lang)}
              spinning={dreamRunning}
              onClick={async () => {
                if (dreamRunning) return;
                setDreamRunning(true);
                try { await api.runDreamCycle(); setDreamDone(true); api.getBrainStats().then(setStats); api.getHealth().then(setHealth); setTimeout(() => setDreamDone(false), 3000); } catch {}
                setDreamRunning(false);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, delay }: { label: string; value: number; delay: number }) {
  return (
    <div className="card animate-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="text-xl font-semibold">{value.toLocaleString()}</div>
      <div className="text-[10px] text-text-disabled uppercase tracking-widest mt-0.5">{label}</div>
    </div>
  );
}

function ProgressBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-text-secondary">{label}</span><span>{pct}%</span>
      </div>
      <div className="h-1 bg-border rounded-full overflow-hidden">
        <div className="h-full bg-gold rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Row({ label, value, warn }: { label: string; value: number; warn: boolean }) {
  return <div className="flex justify-between text-xs"><span className="text-text-secondary">{label}</span><span className={warn ? "text-status-warn" : "text-status-active"}>{value}</span></div>;
}

function ActionBtn({ icon, label, sub, onClick, spinning }: { icon?: string; label: string; sub: string; onClick: () => void; spinning?: boolean }) {
  return (
    <button onClick={onClick} className="btn-surface w-full text-left flex items-center gap-3 py-2">
      {spinning ? <div className="w-4 h-4 border-2 border-gold border-t-transparent rounded-full animate-spin" /> : <span className="text-base">{icon}</span>}
      <div className="min-w-0"><div className="text-sm font-medium text-text-primary truncate">{label}</div><div className="text-[11px] text-text-disabled truncate">{sub}</div></div>
    </button>
  );
}

function getScore(pages: number) {
  if (pages >= 10000) return { value: 99, label: "Omniscient" };
  if (pages >= 5000) return { value: 85, label: "Sage" };
  if (pages >= 1000) return { value: 70, label: "Scholar" };
  if (pages >= 100) return { value: 50, label: "Apprentice" };
  if (pages >= 10) return { value: 25, label: "Novice" };
  return { value: Math.max(1, pages), label: "Awakening" };
}
