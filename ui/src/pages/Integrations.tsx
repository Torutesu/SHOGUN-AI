import { Icon } from "../components/Icon";
import { useLang } from "../lib/i18n";

const tools = [
  { name: "Gmail", cat: "Mail", jp: "メール", connected: true, ops: ["read", "draft", "send"] },
  { name: "Google Calendar", cat: "Calendar", jp: "予定", connected: true, ops: ["read", "create"] },
  { name: "Slack", cat: "Chat", jp: "会話", connected: true, ops: ["read", "post"] },
  { name: "Notion", cat: "Docs", jp: "文書", connected: true, ops: ["read", "write"] },
  { name: "Linear", cat: "Tasks", jp: "課題", connected: true, ops: ["read", "create"] },
  { name: "GitHub", cat: "Code", jp: "コード", connected: true, ops: ["read", "comment"] },
  { name: "Arc Browser", cat: "Web", jp: "閲覧", connected: true, ops: ["capture"] },
  { name: "Claude", cat: "LLM", jp: "対話", connected: true, ops: ["chat"] },
  { name: "Figma", cat: "Design", jp: "意匠", connected: false, ops: ["read"] },
  { name: "Raycast", cat: "Launcher", jp: "起動", connected: false, ops: ["trigger"] },
  { name: "Obsidian", cat: "Notes", jp: "手記", connected: false, ops: ["read", "write"] },
  { name: "Zapier MCP", cat: "Bridge", jp: "橋梁", connected: false, ops: ["any"] },
];

export function Integrations() {
  const lang = useLang();
  return (
    <div className="content-inner">
      <div className="page-head">
        <div>
          <div className="t-mono" style={{ marginBottom: 8 }}>CONNECTION LAYER</div>
          <h1>Integrations <span className="jp">接続</span></h1>
          <div className="sub">{lang === "ja" ? "20のMCPツール。エージェントが外部と連携するために使用。" : "20 MCP tools. Your agents use these to act on the outside world."}</div>
        </div>
        <div className="row">
          <div style={{ fontSize: 13, color: "var(--text-mute)" }}><span className="gold" style={{ fontSize: 20, fontWeight: 600 }}>8</span> / 20 connected</div>
          <button className="btn btn-primary"><Icon name="plus" size={14} />Add tool</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {tools.map((t, i) => (
          <div key={i} className="card card-hover" style={{ padding: 20, opacity: t.connected ? 1 : 0.6 }}>
            <div className="row" style={{ marginBottom: 14, gap: 12 }}>
              <div style={{ width: 40, height: 40, border: "1px solid var(--border)", borderRadius: "var(--radius-md)", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="plug" size={16} className={t.connected ? "gold" : "dim"} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{t.name}</div>
                <div className="row" style={{ gap: 6, marginTop: 2 }}>
                  <span className="t-mono" style={{ fontSize: 10 }}>{t.cat}</span>
                  <span className="jp dim" style={{ fontSize: 10 }}>{t.jp}</span>
                </div>
              </div>
              <div className={"switch " + (t.connected ? "on" : "")} style={{ transform: "scale(0.85)" }} />
            </div>
            <div className="row" style={{ gap: 4, flexWrap: "wrap" }}>
              {t.ops.map((o) => <span key={o} className="label" style={{ fontSize: 10, height: 20 }}>{o}</span>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
