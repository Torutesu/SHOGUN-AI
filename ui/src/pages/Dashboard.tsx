import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type BrainStats } from "../lib/tauri";
import { Icon } from "../components/Icon";
import { useLang } from "../lib/i18n";

export function Dashboard() {
  const [stats, setStats] = useState<BrainStats | null>(null);
  const [briefing, setBriefing] = useState<string | null>(null);
  const [loadingBriefing, setLoadingBriefing] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();
  const lang = useLang();

  useEffect(() => {
    api.getBrainStats().then(setStats).catch(() => {});
    api.generateBriefing("morning")
      .then((res) => {
        const b = res as { briefing?: string; content?: string; morning?: string };
        setBriefing(b.briefing ?? b.content ?? b.morning ?? null);
      })
      .catch(() => setBriefing(null))
      .finally(() => setLoadingBriefing(false));
  }, []);

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "long" }).toUpperCase() + " · " + now.toTimeString().slice(0, 5);
  const hour = now.getHours();
  const greeting = lang === "ja"
    ? (hour < 12 ? "おはようございます" : hour < 18 ? "こんにちは" : "こんばんは")
    : (hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");

  return (
    <div className="content-inner" style={{ maxWidth: 880, margin: "0 auto", padding: "80px 40px 64px" }}>
      <div style={{ marginBottom: 48 }}>
        <div className="t-mono" style={{ marginBottom: 12 }}>{dateStr}</div>
        <h1 style={{ fontSize: 40, fontWeight: 600, letterSpacing: "-0.02em", margin: "0 0 10px" }}>
          {greeting}.
        </h1>
        <div style={{ color: "var(--text-mute)", fontSize: 16 }}>
          {stats?.total_timeline_entries ?? 0} {lang === "ja" ? "件のメモリがキャプチャ済み" : "memories captured"}.
        </div>
      </div>

      {!dismissed && (
        <div className="card" style={{ padding: 40, borderColor: "var(--border-hi)", marginBottom: 20 }}>
          <div className="t-mono gold" style={{ marginBottom: 18 }}>◆ {lang === "ja" ? "今日のまとめ" : "YOUR DAY · SYNTHESIZED"}</div>
          {loadingBriefing ? (
            <div className="row" style={{ gap: 8, color: "var(--text-mute)", fontSize: 14 }}>
              <div style={{ width: 14, height: 14, border: "2px solid var(--gold)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
              {lang === "ja" ? "ブリーフィングを生成中..." : "Generating briefing..."}
            </div>
          ) : briefing ? (
            <div style={{ fontSize: 18, fontWeight: 400, lineHeight: 1.55, marginBottom: 28, color: "var(--text)" }}>
              {briefing}
            </div>
          ) : (
            <div style={{ fontSize: 16, lineHeight: 1.5, marginBottom: 28, color: "var(--text-mute)" }}>
              {lang === "ja"
                ? "メモリに十分なデータがまだありません。キャプチャや手動入力でデータを追加してください。"
                : "Not enough memory data yet. Add data through capture or manual input."}
            </div>
          )}
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <button className="btn btn-sm btn-secondary" onClick={() => navigate("/chat")}>
              {lang === "ja" ? "チャットで深掘り" : "Discuss in Chat"} <Icon name="arrowRight" size={14} />
            </button>
            <button className="btn btn-sm btn-secondary" onClick={() => navigate("/search")}>
              {lang === "ja" ? "検索する" : "Search memory"} <Icon name="search" size={14} />
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => setDismissed(true)}>
              {lang === "ja" ? "閉じる" : "Dismiss"}
            </button>
          </div>
        </div>
      )}

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
          <span>{lang === "ja" ? "メモリに質問またはコマンドを実行..." : "Ask your memory or run a command…"}</span>
          <span className="spacer" />
          <span className="t-mono" style={{ fontSize: 11, border: "1px solid var(--border)", padding: "2px 8px", borderRadius: 4 }}>⌘K</span>
        </div>
      </div>

      {/* Quick stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 32 }}>
        {[
          { label: lang === "ja" ? "ページ" : "PAGES",  value: stats?.total_pages ?? 0, icon: "file", route: "/search" },
          { label: lang === "ja" ? "チャンク" : "CHUNKS", value: stats?.total_chunks ?? 0, icon: "grid", route: "/search" },
          { label: lang === "ja" ? "リンク" : "LINKS",   value: stats?.total_links ?? 0, icon: "link", route: "/search" },
          { label: lang === "ja" ? "イベント" : "EVENTS", value: stats?.total_timeline_entries ?? 0, icon: "clock", route: "/timeline" },
        ].map((s) => (
          <div
            key={s.label}
            className="card card-interactive"
            style={{ padding: 20 }}
            onClick={() => navigate(s.route)}
          >
            <div className="row" style={{ gap: 8, marginBottom: 8 }}>
              <Icon name={s.icon} size={14} className="dim" />
              <span className="t-mono" style={{ fontSize: 10 }}>{s.label}</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 600 }}>{s.value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
