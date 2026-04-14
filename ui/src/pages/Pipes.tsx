import { useEffect, useState } from "react";
import { api } from "../lib/tauri";
import { useLang } from "../lib/i18n";

interface Pipe {
  id: string;
  name: string;
  description: string;
  trigger: { type: string; cron?: string; event?: string; description?: string };
  enabled: boolean;
  lastRun?: string;
  lastResult?: string;
}

export function Pipes() {
  const [pipes, setPipes] = useState<Pipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningId, setRunningId] = useState<string | null>(null);
  const lang = useLang();

  useEffect(() => {
    api.listPipes()
      .then((res) => setPipes((res as { pipes: Pipe[] })?.pipes ?? []))
      .catch(() => setPipes([]))
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (id: string, enabled: boolean) => {
    try {
      await api.setPipeEnabled(id, enabled);
      setPipes((prev) => prev.map((p) => p.id === id ? { ...p, enabled } : p));
    } catch {}
  };

  const run = async (id: string) => {
    setRunningId(id);
    try {
      const res = await api.runPipe(id) as { result: string };
      setPipes((prev) => prev.map((p) => p.id === id ? { ...p, lastResult: res.result, lastRun: new Date().toISOString() } : p));
    } catch {}
    setRunningId(null);
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-5 h-5 border-2 border-gold border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="p-6 max-w-[720px] mx-auto space-y-4 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-md font-semibold">Pipes</h1>
          <p className="text-xs text-text-disabled">{lang === "ja" ? "バックグラウンドエージェント" : "Background agents"}</p>
        </div>
      </div>

      {pipes.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-sm text-text-disabled">{lang === "ja" ? "Pipeがありません" : "No pipes available"}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pipes.map((pipe) => (
            <div key={pipe.id} className={`card ${pipe.enabled ? "border-gold-dim" : ""}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium">{pipe.name}</h3>
                    {pipe.enabled && <span className="dot-pulse" />}
                  </div>
                  <p className="text-[11px] text-text-disabled mt-0.5">{pipe.description}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] text-text-disabled">
                      {pipe.trigger.type === "schedule" ? `⏰ ${pipe.trigger.description ?? pipe.trigger.cron}` :
                       pipe.trigger.type === "event" ? `⚡ ${pipe.trigger.event}` : "🖐 Manual"}
                    </span>
                    {pipe.lastRun && (
                      <span className="text-[10px] text-text-disabled">
                        Last: {new Date(pipe.lastRun).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => run(pipe.id)}
                    disabled={runningId === pipe.id}
                    className="btn-ghost text-xs"
                  >
                    {runningId === pipe.id ? (
                      <div className="w-3 h-3 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                    ) : (
                      lang === "ja" ? "実行" : "Run"
                    )}
                  </button>
                  <button
                    onClick={() => toggle(pipe.id, !pipe.enabled)}
                    className={`w-8 h-[18px] rounded-full relative transition-colors shrink-0 ${pipe.enabled ? "bg-gold" : "bg-border"}`}
                  >
                    <div className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white transition-transform ${pipe.enabled ? "translate-x-[16px]" : "translate-x-[2px]"}`} />
                  </button>
                </div>
              </div>

              {/* Last result preview */}
              {pipe.lastResult && (
                <div className="mt-2 pt-2 border-t border-border-subtle">
                  <p className="text-[10px] text-text-disabled uppercase tracking-widest mb-1">{lang === "ja" ? "最新結果" : "Latest Result"}</p>
                  <p className="text-[11px] text-text-secondary line-clamp-3">{pipe.lastResult.slice(0, 300)}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
