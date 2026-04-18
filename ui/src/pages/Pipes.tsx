import { useEffect, useState } from "react";
import { api } from "../lib/tauri";
import { Icon } from "../components/Icon";
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
    try { await api.setPipeEnabled(id, enabled); setPipes((p) => p.map((x) => x.id === id ? { ...x, enabled } : x)); } catch {}
  };
  const run = async (id: string) => {
    setRunningId(id);
    try {
      const res = await api.runPipe(id) as { result: string };
      setPipes((p) => p.map((x) => x.id === id ? { ...x, lastResult: res.result, lastRun: new Date().toISOString() } : x));
    } catch {}
    setRunningId(null);
  };

  if (loading) return <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ width: 20, height: 20, border: "2px solid var(--gold)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} /></div>;

  return (
    <div className="content-inner" style={{ maxWidth: 820, margin: "0 auto", padding: "32px 40px 64px" }}>
      <div className="page-head">
        <div>
          <div className="t-mono" style={{ marginBottom: 6 }}>AGENTS · 家臣</div>
          <h1><span className="en-only">Agents</span><span className="jp">家臣</span></h1>
          <div style={{ color: "var(--text-mute)", fontSize: 14, marginTop: 6 }}>
            {lang === "ja" ? "バックグラウンドで動くエージェント" : "Background agents that work for you"}
          </div>
        </div>
        <button className="btn btn-sm btn-secondary"><Icon name="plus" size={14} /> New</button>
      </div>

      {pipes.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 40, color: "var(--text-dim)" }}>
          {lang === "ja" ? "エージェントがありません" : "No agents configured"}
        </div>
      ) : (
        <div className="col" style={{ gap: 12 }}>
          {pipes.map((pipe) => (
            <div key={pipe.id} className="card" style={{ borderColor: pipe.enabled ? "var(--gold-dim)" : "var(--border)" }}>
              <div className="row" style={{ alignItems: "flex-start", gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: "var(--radius-md)", background: "var(--surface-2)", border: "1px solid " + (pipe.enabled ? "var(--gold-dim)" : "var(--border)"), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon name={pipe.trigger.type === "schedule" ? "clock" : pipe.trigger.type === "event" ? "zap" : "bot"} size={18} className={pipe.enabled ? "gold" : "dim"} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row" style={{ gap: 8, marginBottom: 4 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 500 }}>{pipe.name}</h3>
                    {pipe.enabled && <span className="label label-success">ACTIVE</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-mute)", marginBottom: 10 }}>{pipe.description}</div>

                  <div className="row" style={{ gap: 12, fontSize: 11 }}>
                    <span className="t-mono" style={{ fontSize: 10 }}>
                      {pipe.trigger.type === "schedule" ? "◷ " + (pipe.trigger.description ?? pipe.trigger.cron) :
                       pipe.trigger.type === "event" ? "⚡ " + pipe.trigger.event :
                       "✋ Manual"}
                    </span>
                    {pipe.lastRun && (
                      <span className="t-mono" style={{ fontSize: 10 }}>
                        Last: {new Date(pipe.lastRun).toLocaleString()}
                      </span>
                    )}
                  </div>

                  {pipe.lastResult && (
                    <div className="card" style={{ padding: 12, marginTop: 12, background: "var(--bg)" }}>
                      <div className="t-mono" style={{ fontSize: 9, marginBottom: 4 }}>LATEST OUTPUT</div>
                      <div style={{ fontSize: 12, color: "var(--text-mute)", lineHeight: 1.5 }}>
                        {pipe.lastResult.slice(0, 240)}
                      </div>
                    </div>
                  )}
                </div>

                <div className="col" style={{ gap: 8, alignItems: "flex-end" }}>
                  <div className={"switch " + (pipe.enabled ? "on" : "")} onClick={() => toggle(pipe.id, !pipe.enabled)} />
                  <button
                    onClick={() => run(pipe.id)}
                    disabled={runningId === pipe.id}
                    className="btn btn-sm btn-secondary"
                  >
                    {runningId === pipe.id ? (
                      <div style={{ width: 12, height: 12, border: "2px solid var(--gold)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                    ) : (
                      <><Icon name="play" size={11} />Run</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
