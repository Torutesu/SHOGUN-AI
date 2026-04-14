import { useEffect, useState } from "react";
import { api } from "../lib/tauri";
import { useLang } from "../lib/i18n";

/**
 * Integrations settings page — connect external services.
 */
export function Integrations() {
  const lang = useLang();
  const [tokens, setTokens] = useState({
    openai: "",
    slack: "",
    github: "",
    notion: "",
    linear: "",
    gmail_client_id: "",
    gmail_client_secret: "",
  });
  const [syncing, setSyncing] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, string>>({});

  useEffect(() => {
    api.loadSettings().then((s) => {
      setTokens({
        openai: s.openai_api_key ?? "",
        slack: "",
        github: "",
        notion: "",
        linear: "",
        gmail_client_id: "",
        gmail_client_secret: "",
      });
    }).catch(() => {});
  }, []);

  const sync = async (service: string, cmd: string, params: Record<string, unknown>) => {
    setSyncing(service);
    setResults((r) => ({ ...r, [service]: "" }));
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const apiAny = api as unknown as Record<string, (p: Record<string, unknown>) => Promise<unknown>>;
      const res = await apiAny[cmd]?.(params) ?? null;
      setResults((r) => ({ ...r, [service]: JSON.stringify(res).slice(0, 200) }));
    } catch (err) {
      setResults((r) => ({ ...r, [service]: `Error: ${err}` }));
    }
    setSyncing(null);
  };

  const services = [
    { id: "slack", name: "Slack", icon: "💬", fields: [{ key: "slack", label: "Bot Token", placeholder: "xoxb-..." }] },
    { id: "github", name: "GitHub", icon: "🐙", fields: [{ key: "github", label: "Personal Access Token", placeholder: "ghp_..." }] },
    { id: "notion", name: "Notion", icon: "📝", fields: [{ key: "notion", label: "Integration Token", placeholder: "ntn_..." }] },
    { id: "linear", name: "Linear", icon: "📐", fields: [{ key: "linear", label: "API Key", placeholder: "lin_api_..." }] },
  ];

  return (
    <div className="p-6 max-w-[600px] mx-auto space-y-4 animate-in">
      <h1 className="text-md font-semibold">{lang === "ja" ? "連携" : "Integrations"}</h1>
      <p className="text-xs text-text-disabled">{lang === "ja" ? "外部サービスからデータを取り込む" : "Import data from external services"}</p>

      {services.map((svc) => (
        <div key={svc.id} className="card space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-base">{svc.icon}</span>
            <span className="text-sm font-medium">{svc.name}</span>
          </div>

          {svc.fields.map((field) => (
            <label key={field.key} className="block">
              <span className="text-xs text-text-secondary">{field.label}</span>
              <input
                className="input mt-1"
                type="password"
                placeholder={field.placeholder}
                value={(tokens as Record<string, string>)[field.key] ?? ""}
                onChange={(e) => setTokens({ ...tokens, [field.key]: e.target.value })}
              />
            </label>
          ))}

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const token = (tokens as Record<string, string>)[svc.id] ?? "";
                if (!token) return;
                const cmds: Record<string, [string, Record<string, unknown>]> = {
                  slack: ["ingest_slack", { token, channel_id: "general" }],
                  github: ["ingest_github", { token, owner: "torutesu", repo: "shogun-ai" }],
                  notion: ["ingest_notion", { token }],
                  linear: ["ingest_linear", { api_key: token }],
                };
                const [cmd, params] = cmds[svc.id] ?? ["", {}];
                if (cmd) sync(svc.id, cmd, params);
              }}
              disabled={syncing === svc.id || !(tokens as Record<string, string>)[svc.id]}
              className="btn-gold text-xs py-1.5 px-3"
            >
              {syncing === svc.id ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 border-2 border-base border-t-transparent rounded-full animate-spin" />
                  {lang === "ja" ? "同期中..." : "Syncing..."}
                </span>
              ) : lang === "ja" ? "同期" : "Sync"}
            </button>
            {results[svc.id] && (
              <span className="text-[10px] text-text-disabled truncate flex-1">{results[svc.id]}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
