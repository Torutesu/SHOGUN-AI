import { Icon } from "../components/Icon";
import { useLang } from "../lib/i18n";

const agents = [
  { name: "Inbox triage", jp: "受信整理", desc: "Sorts Gmail by memory-derived priority. Drafts replies for you to approve.", status: "running", schedule: "every 2 hours", tools: ["mail", "memory"], runs: 142, icon: "mail" },
  { name: "Meeting notes", jp: "議事録", desc: "Captures calendar events, extracts decisions into memory, links to entities.", status: "idle", schedule: "trigger: cal event", tools: ["calendar", "memory"], runs: 87, icon: "calendar" },
  { name: "Daily digest", jp: "日報", desc: "Synthesizes the day at 21:00. Writes a morning brief for tomorrow at 07:00.", status: "scheduled", schedule: "21:00 daily", tools: ["memory", "note"], runs: 38, icon: "note" },
  { name: "Weekly review", jp: "週次", desc: "Sunday morning. What moved this week? What needs decisions. Drafts a retro.", status: "scheduled", schedule: "Sun 10:00", tools: ["memory", "note", "calendar"], runs: 5, icon: "clock" },
];

const activity = [
  ["14:31:08", "inbox-triage", "Read 3 emails · drafted 1 reply", "success"],
  ["14:18:42", "meeting-notes", "Processed \"All PJ\" meeting · 6 decisions extracted", "success"],
  ["14:02:15", "memory", "Indexed conversation · 42 messages · 3 entities linked", "info"],
  ["13:58:00", "meeting-notes", "Triggered by cal event: All PJ", "info"],
  ["13:22:44", "inbox-triage", "Skipped · no new emails since 11:00", "muted"],
];

export function Pipes() {
  const lang = useLang();
  return (
    <div className="content-inner">
      <div className="page-head">
        <div>
          <div className="t-mono" style={{ marginBottom: 8 }}>EXECUTION LAYER</div>
          <h1>Agents <span className="jp">家臣</span></h1>
          <div className="sub">{lang === "ja" ? "メモリを読み行動するエージェント。20のMCPツール利用可能。" : "Agents that read your memory and act. 20 MCP tools available."}</div>
        </div>
        <div className="row">
          <button className="btn btn-secondary"><Icon name="terminal" size={14} />MCP console</button>
          <button className="btn btn-primary"><Icon name="plus" size={14} />New agent</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
        {[
          ["Running", "4", "var(--success)"],
          ["Scheduled", "7", "var(--gold)"],
          ["Paused", "2", "var(--text-dim)"],
          ["Tools connected", "20", "var(--text)"],
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: 20 }}>
            <div className="t-mono" style={{ marginBottom: 10 }}>{s[0]}</div>
            <div style={{ fontSize: 36, fontWeight: 600, color: s[2], letterSpacing: "-0.02em" }}>{s[1]}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 14, color: "var(--text-mute)" }}>{lang === "ja" ? "エージェント一覧" : "Your agents"}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 32 }}>
        {agents.map((a, i) => (
          <div key={i} className="card card-hover" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, border: "1px solid var(--border)", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-2)" }}>
                <Icon name={a.icon} size={16} className="gold" />
              </div>
              <div style={{ flex: 1 }}>
                <div className="row" style={{ gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{a.name}</span>
                  <span className="jp muted" style={{ fontSize: 11 }}>{a.jp}</span>
                </div>
                <div className="row" style={{ gap: 6, marginTop: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: a.status === "running" ? "var(--success)" : a.status === "idle" ? "var(--text-dim)" : "var(--gold)" }} />
                  <span className="t-mono" style={{ fontSize: 10, textTransform: "none", letterSpacing: "0.05em", color: "var(--text-mute)" }}>{a.status} · {a.schedule}</span>
                </div>
              </div>
              <button className="btn btn-sm btn-ghost"><Icon name="more" size={14} /></button>
            </div>
            <div style={{ padding: "16px 20px", fontSize: 13, color: "var(--text-mute)", lineHeight: 1.5 }}>{a.desc}</div>
            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", background: "var(--surface-2)", display: "flex", alignItems: "center", gap: 8 }}>
              <span className="t-mono" style={{ fontSize: 10 }}>{a.runs} RUNS</span>
              <span className="spacer" />
              {a.tools.map((t) => <span key={t} className="label">{t}</span>)}
            </div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 14, color: "var(--text-mute)" }}>{lang === "ja" ? "ライブアクティビティ" : "Live activity"}</div>
      <div className="card" style={{ padding: 0, fontFamily: "var(--font-mono)", fontSize: 12, background: "var(--bg)" }}>
        {activity.map((r, i) => (
          <div key={i} className="row" style={{ padding: "10px 20px", borderBottom: i < activity.length - 1 ? "1px solid var(--border)" : "none", gap: 14 }}>
            <span style={{ color: "var(--text-dim)", fontSize: 11 }}>{r[0]}</span>
            <span className="gold" style={{ minWidth: 120 }}>{r[1]}</span>
            <span style={{ flex: 1, color: r[3] === "muted" ? "var(--text-dim)" : "var(--text)" }}>{r[2]}</span>
            <span className="label" style={{ background: "transparent", color: r[3] === "success" ? "var(--success)" : "var(--text-mute)", borderColor: r[3] === "success" ? "color-mix(in srgb, var(--success) 40%, transparent)" : "var(--border)" }}>{r[3].toUpperCase()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
