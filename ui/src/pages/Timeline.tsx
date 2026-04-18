import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/tauri";
import { Icon } from "../components/Icon";

interface TimelineDay {
  date: string;
  entries: { content: string; source: string | null; created_at: string }[];
  pageSlug: string;
  totalEntries: number;
  appBreakdown: Record<string, number>;
  sources: Record<string, number>;
}

const SRC_ICON: Record<string, string> = {
  clipboard: "file", window_capture: "eye", accessibility_capture: "eye",
  ocr_capture: "eye", slack: "chat", github: "terminal", calendar: "calendar",
  gmail: "mail", notion: "note", linear: "zap", meeting: "users",
};

export function Timeline() {
  const [days, setDays] = useState<TimelineDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"river" | "stack" | "heatmap">("river");
  const [scrubIdx, setScrubIdx] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const end = new Date().toISOString().slice(0, 10);
    const start = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    api.getTimelineRange(start, end)
      .then((d) => setDays(d as TimelineDay[]))
      .catch(() => setDays([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 20, height: 20, border: "2px solid var(--gold)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  const today = days[0];
  const allEntries = days.flatMap((d) => d.entries);
  const scrubbed = allEntries[scrubIdx] ?? allEntries[0];

  return (
    <div className="content-inner wide" style={{ padding: 0, height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "24px 40px 0", display: "flex", alignItems: "flex-end", gap: 20 }}>
        <div>
          <div className="t-mono" style={{ marginBottom: 6 }}>MEMORY / TIMELINE</div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600 }}>
            {today?.date ?? "No activity"}
            <span className="jp muted" style={{ fontSize: 16, fontWeight: 300, marginLeft: 8 }}>時間軸</span>
          </h1>
        </div>
        <span className="spacer" />
        <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
          {[["river", "River"], ["stack", "Kakejiku"], ["heatmap", "Heatmap"]].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setView(k as typeof view)}
              className="btn btn-sm"
              style={{
                borderRadius: 0, border: 0,
                background: view === k ? "var(--surface-2)" : "transparent",
                color: view === k ? "var(--gold)" : "var(--text-mute)",
              }}
            >
              {l}
            </button>
          ))}
        </div>
        <button className="btn btn-sm btn-secondary"><Icon name="filter" size={14} /> Filters</button>
      </div>

      {/* Day cards */}
      <div style={{ padding: "20px 40px", display: "flex", alignItems: "center", gap: 8, overflowX: "auto" }}>
        {days.slice(0, 7).map((d, i) => (
          <div
            key={d.date}
            className="card card-interactive"
            onClick={() => navigate(`/page/${encodeURIComponent(d.pageSlug)}`)}
            style={{
              padding: "10px 14px", minWidth: 100, flexShrink: 0,
              borderColor: i === 0 ? "var(--gold)" : "var(--border)",
              background: i === 0 ? "var(--surface-2)" : "var(--surface)",
            }}
          >
            <div className="t-mono" style={{ fontSize: 10, marginBottom: 6 }}>{d.date}</div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{d.totalEntries}</div>
            <div style={{ fontSize: 10, color: "var(--text-dim)" }}>entries</div>
          </div>
        ))}
        <span className="spacer" />
        <span className="t-mono">{allEntries.length} EVENTS</span>
      </div>

      {/* River / Stack / Heatmap */}
      {view === "river" && today && (
        <div style={{ flex: 1, padding: "0 40px 32px", minHeight: 0, display: "flex", flexDirection: "column", gap: 14, overflow: "hidden" }}>
          <div className="card" style={{ flex: 1, padding: 0, minHeight: 0, display: "flex", overflow: "hidden" }}>
            {/* Left: entry detail */}
            <div style={{ flex: "0 0 42%", padding: "24px 28px", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 12, overflow: "auto" }}>
              {scrubbed ? (
                <>
                  <div className="row" style={{ gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "var(--radius-md)", background: "var(--surface-2)", border: "1px solid var(--gold-dim)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon name={SRC_ICON[scrubbed.source ?? ""] ?? "file"} size={14} className="gold" />
                    </div>
                    <div>
                      <div className="t-mono" style={{ fontSize: 10 }}>{(scrubbed.source ?? "event").toUpperCase()}</div>
                      <div style={{ fontSize: 16, fontWeight: 500, marginTop: 2, letterSpacing: "-0.01em" }}>
                        {scrubbed.content.slice(0, 80)}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.65, color: "var(--text-mute)", marginTop: 4 }}>
                    {scrubbed.content}
                  </div>
                </>
              ) : (
                <div style={{ color: "var(--text-dim)", fontSize: 13 }}>No activity captured yet.</div>
              )}
            </div>

            {/* Right: app breakdown */}
            <div style={{ flex: 1, background: "var(--surface-2)", padding: "24px 28px", overflow: "auto" }}>
              <div className="t-mono" style={{ marginBottom: 16 }}>APP BREAKDOWN · 区分</div>
              {today.appBreakdown && Object.keys(today.appBreakdown).length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {Object.entries(today.appBreakdown).sort((a, b) => b[1] - a[1]).map(([app, count]) => {
                    const max = Math.max(...Object.values(today.appBreakdown));
                    const pct = (count / max) * 100;
                    return (
                      <div key={app} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 12, width: 100, color: "var(--text-mute)" }}>{app}</span>
                        <div style={{ flex: 1, height: 6, background: "var(--bg)", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: "var(--gold)", opacity: 0.7 }} />
                        </div>
                        <span className="t-mono" style={{ fontSize: 10 }}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ color: "var(--text-dim)", fontSize: 13 }}>No apps tracked.</div>
              )}
            </div>
          </div>

          {/* Scrubber */}
          <div className="card" style={{ padding: "10px 14px" }}>
            <div className="row" style={{ gap: 10 }}>
              <span className="t-mono gold">TIMELINE · さかのぼる</span>
              <span className="spacer" />
              <button className="btn btn-sm btn-ghost" onClick={() => setScrubIdx(Math.max(0, scrubIdx - 1))}>
                <Icon name="arrowLeft" size={12} />
              </button>
              <button className="btn btn-sm btn-ghost" onClick={() => setScrubIdx(Math.min(allEntries.length - 1, scrubIdx + 1))}>
                <Icon name="arrowRight" size={12} />
              </button>
              <span className="t-mono" style={{ fontSize: 10 }}>{scrubIdx + 1} / {allEntries.length}</span>
            </div>
          </div>
        </div>
      )}

      {view === "stack" && (
        <div style={{ flex: 1, padding: "0 40px 40px", minHeight: 0, overflow: "auto" }}>
          <div style={{ maxWidth: 820, margin: "0 auto" }}>
            {days.map((day) => (
              <div key={day.date}>
                <div className="t-mono" style={{ margin: "24px 0 12px" }}>{day.date} · {day.totalEntries} entries</div>
                {day.entries.map((e, i) => (
                  <div key={i} className="row" style={{ gap: 18, padding: "14px 0", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ width: 60, textAlign: "right" }}>
                      <div className="t-mono" style={{ fontSize: 11 }}>{new Date(e.created_at).toTimeString().slice(0, 5)}</div>
                    </div>
                    <div style={{ width: 1, background: "var(--border)", alignSelf: "stretch", position: "relative" }}>
                      <div style={{ position: "absolute", left: -4, top: 4, width: 9, height: 9, borderRadius: "50%", background: "var(--gold)" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="row" style={{ gap: 8, marginBottom: 4 }}>
                        <Icon name={SRC_ICON[e.source ?? ""] ?? "file"} size={14} className="dim" />
                        <span className="t-mono" style={{ fontSize: 10 }}>{e.source}</span>
                      </div>
                      <div style={{ fontSize: 14 }}>{e.content.slice(0, 180)}{e.content.length > 180 ? "…" : ""}</div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {view === "heatmap" && (
        <div style={{ flex: 1, padding: "0 40px 40px", overflowY: "auto" }}>
          <div className="card" style={{ padding: 24 }}>
            <div className="t-mono" style={{ marginBottom: 16 }}>ACTIVITY HEATMAP · LAST 28 DAYS</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(28, 1fr)", gap: 3 }}>
              {Array.from({ length: 7 * 28 }).map((_, i) => {
                const v = Math.floor(Math.random() * 5);
                return (
                  <div key={i} style={{
                    aspectRatio: 1,
                    background: v === 0 ? "var(--surface-2)" : `color-mix(in srgb, var(--gold) ${v * 20}%, var(--surface))`,
                    borderRadius: 2,
                  }} />
                );
              })}
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
