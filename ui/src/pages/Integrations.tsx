import { useEffect, useState } from "react";
import { api } from "../lib/tauri";
import { Icon } from "../components/Icon";
import { useLang } from "../lib/i18n";

export function Integrations() {
  const lang = useLang();
  const [tokens, setTokens] = useState<Record<string, string>>({});
  const [syncing, setSyncing] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, string>>({});

  useEffect(() => {
    api.loadSettings().then((s) => {
      setTokens({ openai: s.openai_api_key ?? "" });
    }).catch(() => {});
  }, []);

  const syncService = async (serviceId: string) => {
    const token = tokens[serviceId] ?? "";
    if (!token) return;
    setSyncing(serviceId);
    setResults((r) => ({ ...r, [serviceId]: "" }));
    try {
      let res: unknown;
      switch (serviceId) {
        case "slack":  res = await api.ingestSlack(token, "general"); break;
        case "github": res = await api.ingestGitHub(token, "torutesu", "shogun-ai"); break;
        case "notion": res = await api.ingestNotion(token); break;
        case "linear": res = await api.ingestLinear(token); break;
        case "gmail":  res = await api.ingestGmail({ client_id: "", client_secret: "", access_token: token, refresh_token: "" }); break;
        case "gcal":   res = await api.ingestCalendar(token); break;
      }
      setResults((r) => ({ ...r, [serviceId]: "✓ " + (JSON.stringify(res).slice(0, 120)) }));
    } catch (err) {
      setResults((r) => ({ ...r, [serviceId]: `✗ ${err}` }));
    }
    setSyncing(null);
  };

  const services = [
    { id: "slack",  name: "Slack",   icon: "slack",    connected: false },
    { id: "github", name: "GitHub",  icon: "terminal", connected: false },
    { id: "notion", name: "Notion",  icon: "note",     connected: false },
    { id: "linear", name: "Linear",  icon: "zap",      connected: false },
    { id: "gmail",  name: "Gmail",   icon: "mail",     connected: false },
    { id: "gcal",   name: "Calendar",icon: "calendar", connected: false },
  ];

  return (
    <div className="content-inner" style={{ maxWidth: 820, margin: "0 auto", padding: "32px 40px 64px" }}>
      <div className="page-head">
        <div>
          <div className="t-mono" style={{ marginBottom: 6 }}>INTEGRATIONS · 接続</div>
          <h1><span className="en-only">Integrations</span><span className="jp">接続</span></h1>
          <div style={{ color: "var(--text-mute)", fontSize: 14, marginTop: 6 }}>
            {lang === "ja" ? "外部サービスからデータを取り込む" : "Import data from external services"}
          </div>
        </div>
      </div>

      <div className="col" style={{ gap: 12 }}>
        {services.map((svc) => (
          <div key={svc.id} className="card">
            <div className="row" style={{ gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: "var(--radius-md)", background: "var(--surface-2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name={svc.icon} size={18} className="gold" />
              </div>
              <div style={{ flex: 1 }}>
                <div className="row" style={{ gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{svc.name}</span>
                  {svc.connected && <span className="label label-success">CONNECTED</span>}
                </div>
                {results[svc.id] && (
                  <div style={{ fontSize: 11, color: results[svc.id].startsWith("✓") ? "var(--success)" : "var(--danger)", fontFamily: "var(--font-mono)" }}>
                    {results[svc.id]}
                  </div>
                )}
              </div>
              <input
                className="input"
                type="password"
                placeholder={`${svc.name} token`}
                style={{ width: 200 }}
                value={tokens[svc.id] ?? ""}
                onChange={(e) => setTokens({ ...tokens, [svc.id]: e.target.value })}
              />
              <button
                onClick={() => syncService(svc.id)}
                disabled={syncing === svc.id || !tokens[svc.id]}
                className="btn btn-sm btn-primary"
              >
                {syncing === svc.id ? "Syncing..." : "Sync"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
