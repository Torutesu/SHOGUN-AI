import { useState, useEffect } from "react";
import { Icon, Kamon } from "./Icon";
import { useLang } from "../lib/i18n";

const SETTINGS_NAV = [
  { id: "general", label: "General", jp: "一般", icon: "settings" },
  { id: "system", label: "System", jp: "系統", icon: "terminal" },
  { id: "appearance", label: "Appearance", jp: "外観", icon: "eye" },
  { id: "privacy", label: "Privacy Controls", jp: "守秘", icon: "shield" },
  { id: "data", label: "Data Controls", jp: "資料", icon: "memory" },
  { id: "hummingbird", label: "Hummingbird", jp: "鳥", icon: "zap" },
  { id: "meetings", label: "Meetings", jp: "会議", icon: "calendar" },
  { id: "chat", label: "Chat", jp: "対話", icon: "chat" },
  { id: "integrations", label: "Integrations", jp: "連携", icon: "plug" },
  { id: "shortcuts", label: "Keyboard Shortcuts", jp: "捷径", icon: "keyboard" },
  { id: "subscription", label: "Subscription", jp: "契約", icon: "gift" },
  { id: "team", label: "Team", jp: "組", icon: "users" },
  { id: "support", label: "Support", jp: "支援", icon: "info" },
];

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return <div onClick={onClick} className={"s-toggle" + (on ? " on" : "")}><div className="s-toggle-knob" /></div>;
}

function Row({ title, desc, children, last }: { title: React.ReactNode; desc?: string; children?: React.ReactNode; last?: boolean }) {
  return (
    <div className={"s-row" + (last ? " last" : "")}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="s-row-title">{title}</div>
        {desc && <div className="s-row-desc">{desc}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Pane({ title, jp, children, subtitle }: { title: string; jp: string; children: React.ReactNode; subtitle?: React.ReactNode }) {
  return (
    <div className="s-pane">
      <div className="s-pane-head">
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 500, letterSpacing: "-0.01em" }}>
          {title}
          <span className="jp" style={{ fontSize: 14, marginLeft: 10, color: "var(--text-dim)", fontWeight: 300 }}>{jp}</span>
        </h2>
        {subtitle && <div className="s-pane-sub">{subtitle}</div>}
      </div>
      <div className="s-pane-body">{children}</div>
    </div>
  );
}

function PaneGeneral() {
  const [name, setName] = useState("Toru Tano");
  return (
    <Pane title="General" jp="一般">
      <div style={{ marginBottom: 18 }}>
        <div className="s-field-label">What should SHOGUN call you?</div>
        <input className="s-input" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="s-meta">
        <div style={{ fontSize: 13, color: "var(--text)" }}>SHOGUN v0.4.1 <span className="label label-gold" style={{ marginLeft: 6 }}>Stable</span></div>
        <div className="s-field-hint" style={{ marginTop: 4 }}>You are on the latest version · Channel: Stable</div>
        <div className="s-field-hint">Runtime: local · Node 22</div>
      </div>
      <button className="btn btn-secondary" style={{ marginTop: 20 }}><Icon name="logout" size={12} />Sign Out</button>
    </Pane>
  );
}

function PaneSystem() {
  const [startup, setStartup] = useState(true);
  const [notif, setNotif] = useState(true);
  const [sound, setSound] = useState(false);
  return (
    <Pane title="System" jp="系統">
      <div className="s-card">
        <Row title="Launch SHOGUN on startup" desc="Automatically start when you log in"><Toggle on={startup} onClick={() => setStartup(!startup)} /></Row>
        <Row title="Notifications" desc="Show SHOGUN notifications"><Toggle on={notif} onClick={() => setNotif(!notif)} /></Row>
        <Row title="Notification Sound" desc="Play a sound for notifications"><Toggle on={sound} onClick={() => setSound(!sound)} /></Row>
        <Row title="Time Format" desc="How times are displayed"><select className="s-select"><option>24-hour</option><option>12-hour</option></select></Row>
        <Row title="Show App In" desc="Control visibility when closed" last><select className="s-select"><option>Dock and Menu Bar</option><option>Menu Bar only</option></select></Row>
      </div>
    </Pane>
  );
}

function PaneAppearance() {
  const [mode, setMode] = useState("dark");
  const [wide, setWide] = useState(false);
  return (
    <Pane title="Appearance" jp="外観">
      <div className="s-field-label" style={{ marginBottom: 10 }}>Color Mode</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 24 }}>
        {(["light", "dark", "auto"] as const).map((k) => (
          <div key={k} onClick={() => setMode(k)} className={"s-color-card " + (mode === k ? "active" : "")}>
            <div className="s-color-preview" data-mode={k}>
              <div className="s-color-bar"><span /><span /><span /></div>
              <div className="s-color-title">What&apos;s on your mind?</div>
              <div className="s-color-input" />
            </div>
            <div style={{ marginTop: 8, fontSize: 12, textAlign: "center", color: mode === k ? "var(--gold)" : "var(--text-mute)" }}>
              {k === "light" ? "Light" : k === "dark" ? "Dark" : "Match System"}
            </div>
          </div>
        ))}
      </div>
      <div className="s-card">
        <Row title="Extra Wide Chat" desc="Make the chat extra wide"><Toggle on={wide} onClick={() => setWide(!wide)} /></Row>
        <Row title="Font Size" desc="Adjust text size" last><select className="s-select"><option>Normal</option><option>Compact</option><option>Comfortable</option></select></Row>
      </div>
    </Pane>
  );
}

function PanePrivacy() {
  return (
    <Pane title="Privacy Controls" jp="守秘" subtitle="Control what SHOGUN can see. Excluded content won't appear in your context.">
      <div className="s-card">
        {[{ name: "Finder", icon: "📁" }, { name: "1Password", icon: "🔐" }, { name: "Banking", icon: "🏦" }].map((a, i, arr) => (
          <div key={i} className={"s-row" + (i === arr.length - 1 ? " last" : "")}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: "var(--surface-2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, marginRight: 12 }}>{a.icon}</div>
            <div style={{ flex: 1, fontSize: 13 }}>{a.name}</div>
            <Toggle on={true} onClick={() => {}} />
          </div>
        ))}
      </div>
    </Pane>
  );
}

function PaneData() {
  return (
    <Pane title="Data Controls" jp="資料">
      <div className="s-field-label">Manage Context Collected</div>
      <div className="s-card">
        <Row title="Delete Last Hour" desc="Remove all context from the last hour"><button className="btn btn-sm btn-secondary">Delete</button></Row>
        <Row title="Delete Last Day" desc="Remove all context from 24 hours"><button className="btn btn-sm btn-secondary">Delete</button></Row>
        <Row title="Delete All Context" desc="Permanently remove all context. Cannot be undone." last>
          <button className="btn btn-sm" style={{ background: "transparent", border: "1px solid #8a4a4a", color: "#d9857a" }}>Delete</button>
        </Row>
      </div>
    </Pane>
  );
}

function PaneShortcuts() {
  const groups = [
    { name: "General", items: [["New chat", ["⌘", "N"]], ["Search", ["⌘", "K"]], ["Open settings", ["⌘", ","]], ["Toggle sidebar", ["⌘", "S"]]] },
    { name: "Chat", items: [["Send message", ["↵"]], ["New line", ["⇧", "↵"]], ["Start voice recording", ["⌥", "↵"]]] },
    { name: "Memory", items: [["Capture moment", ["⌘", "⇧", "C"]], ["Jump to timeline", ["⌘", "⇧", "T"]]] },
  ];
  return (
    <Pane title="Keyboard Shortcuts" jp="捷径">
      {groups.map((g) => (
        <div key={g.name} style={{ marginBottom: 18 }}>
          <div className="s-field-label" style={{ marginBottom: 8 }}>{g.name}</div>
          <div className="s-card">
            {g.items.map((it, i, arr) => (
              <div key={i} className={"s-row" + (i === arr.length - 1 ? " last" : "")}>
                <div style={{ flex: 1, fontSize: 13 }}>{it[0] as string}</div>
                <div className="row" style={{ gap: 4 }}>
                  {(it[1] as string[]).map((k, j) => <span key={j} className="s-kbd">{k}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </Pane>
  );
}

function PaneSubscription() {
  return (
    <Pane title="Subscription" jp="契約">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="s-card" style={{ padding: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 500 }}>Plus</div>
          <div style={{ fontSize: 36, fontWeight: 600, marginTop: 16, letterSpacing: "-0.02em" }}>
            $17<span style={{ fontSize: 14, color: "var(--text-dim)", fontWeight: 400 }}>/mo</span>
          </div>
          <ul style={{ margin: "16px 0 0", padding: 0, listStyle: "none", fontSize: 12, lineHeight: 1.9 }}>
            {["Advanced intelligence", "Enhanced memory", "Unlimited meeting notes", "Priority support"].map((f) => (
              <li key={f}><Icon name="check" size={11} className="gold" /> {f}</li>
            ))}
          </ul>
          <button className="btn btn-secondary" style={{ width: "100%", marginTop: 18 }}>Start 14-day trial</button>
        </div>
        <div className="s-card" style={{ padding: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 500 }}>Pro</div>
          <div style={{ fontSize: 36, fontWeight: 600, marginTop: 16, letterSpacing: "-0.02em" }}>
            $100<span style={{ fontSize: 14, color: "var(--text-dim)", fontWeight: 400 }}>/mo</span>
          </div>
          <ul style={{ margin: "16px 0 0", padding: 0, listStyle: "none", fontSize: 12, lineHeight: 1.9 }}>
            {["5x usage vs Plus", "Auto-detect meeting language", "Premium image generation", "Early access"].map((f) => (
              <li key={f}><Icon name="check" size={11} className="gold" /> {f}</li>
            ))}
          </ul>
          <button className="btn btn-secondary" style={{ width: "100%", marginTop: 18 }}>Choose Pro</button>
        </div>
      </div>
    </Pane>
  );
}

function PaneSupport() {
  return (
    <Pane title="Support" jp="支援">
      <div className="s-card">
        <Row title="Email Support" desc="Contact us at support@shogun.local"><button className="btn btn-sm btn-secondary">Email</button></Row>
        <Row title="Join Discord" desc="Join our Discord for real time support"><button className="btn btn-sm btn-secondary">Join</button></Row>
        <Row title="Report Issues" desc="Create a diagnostic snapshot" last><button className="btn btn-sm btn-secondary">Report</button></Row>
      </div>
    </Pane>
  );
}

function PanePlaceholder({ title, jp }: { title: string; jp: string }) {
  return <Pane title={title} jp={jp}><div style={{ color: "var(--text-dim)", fontSize: 13 }}>Coming soon.</div></Pane>;
}

const PANES: Record<string, React.FC> = {
  general: PaneGeneral, system: PaneSystem, appearance: PaneAppearance,
  privacy: PanePrivacy, data: PaneData,
  hummingbird: () => <PanePlaceholder title="Hummingbird" jp="鳥" />,
  meetings: () => <PanePlaceholder title="Meetings" jp="会議" />,
  chat: () => <PanePlaceholder title="Chat" jp="対話" />,
  integrations: () => <PanePlaceholder title="Integrations" jp="連携" />,
  shortcuts: PaneShortcuts, subscription: PaneSubscription,
  team: () => <PanePlaceholder title="Team" jp="組" />,
  support: PaneSupport,
};

export function SettingsModal({ pane, setPane, close }: { pane: string; setPane: (p: string) => void; close: () => void }) {
  const lang = useLang();
  const resolved = pane;
  const PaneComp = PANES[resolved] || PANES.general;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  return (
    <>
      <div className="s-backdrop" onClick={close} />
      <div className="s-modal">
        <div className="s-sidebar-modal">
          <div className="t-mono" style={{ padding: "18px 18px 20px", fontSize: 10, color: "var(--text-dim)", letterSpacing: "0.2em" }}>
            {lang === "ja" ? "設定" : "SETTINGS · 設定"}
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "0 8px" }}>
            {SETTINGS_NAV.map((n) => (
              <div key={n.id} className={"s-nav " + (resolved === n.id ? "active" : "")} onClick={() => setPane(n.id)}>
                <Icon name={n.icon} size={13} />
                <span className="en-only">{n.label}</span>
                <span className="jp">{n.jp}</span>
              </div>
            ))}
          </div>
          <div style={{ padding: "12px 18px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
            <Kamon size={11} color="var(--gold)" />
            <span className="t-mono" style={{ fontSize: 9, color: "var(--text-dim)" }}>SHOGUN v0.4.1</span>
          </div>
        </div>
        <div className="s-content">
          <button className="s-close" onClick={close}><Icon name="x" size={14} /></button>
          <PaneComp />
        </div>
      </div>
    </>
  );
}
