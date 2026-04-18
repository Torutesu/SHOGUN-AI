import { Icon } from "../components/Icon";
import { useLang } from "../lib/i18n";

export function Capture() {
  const lang = useLang();
  const liveLog = [
    ["14:32:08", "chrome", "url: notion.so/100x-user-framework"],
    ["14:31:54", "claude", "msg_in · 142 tokens"],
    ["14:31:41", "claude", "msg_out · 518 tokens"],
    ["14:30:22", "slack", "dm from Matt · 3 lines"],
    ["14:28:10", "vscode", "file: shogun/app.tsx · 42 edits"],
    ["14:25:00", "chrome", "url: revenuecat.com/pricing"],
    ["14:22:17", "claude", "new conversation: rev-cat pricing"],
    ["14:18:00", "terminal", "cmd: git commit -m \"ia v2\""],
  ];
  const apps = [
    ["Claude", 542, 94],
    ["Chrome", 318, 72],
    ["Slack", 142, 68],
    ["VSCode", 98, 40],
    ["Gmail", 76, 52],
  ];
  const perms = [
    ["Accessibility", "Granted", true],
    ["Calendar", "Granted", true],
    ["Contacts", "Not granted", false],
    ["Screen recording", "Not requested", false],
  ];

  return (
    <div className="content-inner">
      <div className="page-head">
        <div>
          <div className="t-mono" style={{ marginBottom: 8 }}>INGEST LAYER</div>
          <h1>Capture <span className="jp">捕捉</span></h1>
          <div className="sub">{lang === "ja" ? "macOS Accessibility APIでパッシブ読み取り。スクリーンショットなし。ローカルのみ。" : "SHOGUN reads your day passively via macOS Accessibility. Never screenshots. Never OCR. Local only."}</div>
        </div>
        <div className="row">
          <span className="label label-success"><span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success)", marginRight: 6, boxShadow: "0 0 0 3px rgba(107,158,120,0.2)" }} />CAPTURING</span>
          <button className="btn btn-secondary"><Icon name="pause" size={14} />Pause</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20, marginBottom: 32 }}>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Live capture</div>
            <span className="label label-gold" style={{ marginLeft: 10 }}>TAIL -F</span>
            <span className="spacer" />
            <span className="t-mono" style={{ fontSize: 10 }}>24 EVENTS / MIN</span>
          </div>
          <div style={{ padding: "4px 0", fontFamily: "var(--font-mono)", fontSize: 12, maxHeight: 280, overflowY: "auto" }}>
            {liveLog.map((l, i) => (
              <div key={i} className="row" style={{ padding: "6px 20px", gap: 14, borderBottom: "1px dashed var(--border)" }}>
                <span style={{ color: "var(--text-dim)" }}>{l[0]}</span>
                <span className="gold" style={{ minWidth: 70 }}>{l[1]}</span>
                <span style={{ color: "var(--text-mute)" }}>{l[2]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="stack-4">
          <div className="card" style={{ padding: 20 }}>
            <div className="t-mono" style={{ marginBottom: 12 }}>TODAY · CAPTURED</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div><div style={{ fontSize: 32, fontWeight: 600 }}>1,248</div><div style={{ fontSize: 11, color: "var(--text-dim)" }}>events</div></div>
              <div><div style={{ fontSize: 32, fontWeight: 600 }}>23</div><div style={{ fontSize: 11, color: "var(--text-dim)" }}>memories</div></div>
            </div>
            <div style={{ height: 1, background: "var(--border)", margin: "16px 0" }} />
            <div style={{ fontSize: 12, color: "var(--text-mute)", lineHeight: 1.6 }}>
              Captured via Accessibility API · <span className="gold">0 screenshots taken</span> · <span className="gold">0 OCR runs</span>
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div className="t-mono" style={{ marginBottom: 12 }}>APP COVERAGE</div>
            {apps.map(([n, c, w], i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div className="row" style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: 12 }}>{n as string}</span>
                  <span className="spacer" />
                  <span className="t-mono" style={{ fontSize: 10 }}>{c as number}</span>
                </div>
                <div style={{ height: 3, background: "var(--surface-2)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: w + "%", background: "var(--gold)" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 20, background: "var(--surface-2)", borderColor: "var(--border-hi)" }}>
        <div className="row" style={{ marginBottom: 12 }}>
          <Icon name="shield" size={16} className="gold" />
          <div style={{ fontSize: 14, fontWeight: 500 }}>{lang === "ja" ? "SHOGUNが見れるもの" : "What SHOGUN can see"}</div>
          <span className="spacer" />
          <button className="btn btn-sm btn-ghost">Manage permissions <Icon name="arrowUpRight" size={12} /></button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {perms.map(([n, s, on], i) => (
            <div key={i} style={{ padding: 12, border: "1px solid var(--border)", borderRadius: "var(--radius-md)", background: "var(--bg)" }}>
              <div className="row" style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 12 }}>{n as string}</span>
                <span className="spacer" />
                <div className={"switch " + (on ? "on" : "")} style={{ transform: "scale(0.8)", transformOrigin: "right" }} />
              </div>
              <div className="t-mono" style={{ fontSize: 9, color: on ? "var(--success)" : "var(--text-dim)" }}>{(s as string).toUpperCase()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
