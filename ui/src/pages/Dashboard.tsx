import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type BrainStats } from "../lib/tauri";
import { Icon } from "../components/Icon";

export function Dashboard() {
  const [stats, setStats] = useState<BrainStats | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.getBrainStats().then(setStats).catch(() => {});
  }, []);

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "long" }).toUpperCase() + " · " + now.toTimeString().slice(0, 5);
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="content-inner" style={{ maxWidth: 880, margin: "0 auto", padding: "80px 40px 64px" }}>
      <div style={{ marginBottom: 48 }}>
        <div className="t-mono" style={{ marginBottom: 12 }}>{dateStr}</div>
        <h1 style={{ fontSize: 40, fontWeight: 600, letterSpacing: "-0.02em", margin: "0 0 10px" }}>
          {greeting}, Kenshin.
        </h1>
        <div style={{ color: "var(--text-mute)", fontSize: 16 }}>
          {stats?.total_timeline_entries ?? 0} memories captured today.
        </div>
      </div>

      {/* Synthesized day — single focal card */}
      <div className="card" style={{ padding: 40, borderColor: "var(--border-hi)", marginBottom: 20 }}>
        <div className="t-mono gold" style={{ marginBottom: 18 }}>◆ YOUR DAY · SYNTHESIZED</div>
        <div style={{ fontSize: 22, fontWeight: 500, lineHeight: 1.45, marginBottom: 28 }}>
          You spent <span className="gold">2h 14m</span> in product calls with <span className="gold">Matt</span> and the <span className="gold">Toru team</span>, mostly on pricing. The Revenue-cat chat from 14:02 proposed a three-tier model you haven't written down yet.
        </div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-sm btn-secondary" onClick={() => navigate("/chat")}>
            Draft the pricing doc <Icon name="arrowRight" size={14} />
          </button>
          <button className="btn btn-sm btn-secondary">Schedule Matt follow-up</button>
          <button className="btn btn-sm btn-ghost">Dismiss</button>
        </div>
      </div>

      {/* Ask SHOGUN input */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "4px 0" }}>
        <div
          className="row"
          onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
          style={{
            flex: 1, height: 56, padding: "0 20px",
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)", color: "var(--text-dim)",
            fontSize: 15, cursor: "pointer",
          }}
        >
          <Icon name="search" size={16} />
          <span>Ask your memory or run a command…</span>
          <span className="spacer" />
          <span className="t-mono" style={{ fontSize: 11, border: "1px solid var(--border)", padding: "2px 8px", borderRadius: 4 }}>⌘K</span>
        </div>
      </div>

      {/* Quick stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 32 }}>
        {[
          { label: "PAGES",    value: stats?.total_pages ?? 0, icon: "file" },
          { label: "CHUNKS",   value: stats?.total_chunks ?? 0, icon: "grid" },
          { label: "LINKS",    value: stats?.total_links ?? 0, icon: "link" },
          { label: "EVENTS",   value: stats?.total_timeline_entries ?? 0, icon: "clock" },
        ].map((s) => (
          <div key={s.label} className="card" style={{ padding: 20 }}>
            <div className="row" style={{ gap: 8, marginBottom: 8 }}>
              <Icon name={s.icon} size={14} className="dim" />
              <span className="t-mono" style={{ fontSize: 10 }}>{s.label}</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 600 }}>{s.value.toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
