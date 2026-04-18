import { useState } from "react";
import { api } from "../lib/tauri";
import { Icon } from "./Icon";
import { useLang } from "../lib/i18n";

const DURATIONS = [
  { key: "5min", ms: 5 * 60_000, ja: "5分", en: "5 min" },
  { key: "15min", ms: 15 * 60_000, ja: "15分", en: "15 min" },
  { key: "30min", ms: 30 * 60_000, ja: "30分", en: "30 min" },
  { key: "1h", ms: 60 * 60_000, ja: "1時間", en: "1 hour" },
  { key: "restart", ms: -1, ja: "再起動まで", en: "Until restart" },
];

export function PrivateMode({ isActive, onToggle }: { isActive: boolean; onToggle: (active: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const [pausedUntil, setPausedUntil] = useState<string | null>(null);
  const lang = useLang();

  const pause = async (duration: typeof DURATIONS[0]) => {
    try {
      await api.pauseCapture();
      onToggle(false);
      setOpen(false);

      if (duration.ms > 0) {
        const until = new Date(Date.now() + duration.ms);
        setPausedUntil(until.toLocaleTimeString());
        setTimeout(async () => {
          try {
            await api.resumeCapture();
            onToggle(true);
            setPausedUntil(null);
          } catch { /* ignore */ }
        }, duration.ms);
      } else {
        setPausedUntil(lang === "ja" ? "再起動まで" : "Until restart");
      }
    } catch { /* ignore */ }
  };

  const resume = async () => {
    try {
      await api.resumeCapture();
      onToggle(true);
      setPausedUntil(null);
    } catch { /* ignore */ }
  };

  if (!isActive && pausedUntil) {
    return (
      <div style={{ position: "relative" }}>
        <button
          onClick={resume}
          className="capturing-pill"
          style={{
            border: "1px solid color-mix(in srgb, var(--warning) 50%, transparent)",
            color: "var(--warning)",
            cursor: "pointer",
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--warning)" }} />
          {lang === "ja" ? "一時停止" : "PAUSED"} · {pausedUntil}
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => (isActive ? setOpen(!open) : resume())}
        className="capturing-pill"
        style={{ cursor: "pointer" }}
      >
        {isActive ? (
          <>
            <span className="pulse" />
            {lang === "ja" ? "キャプチャ中" : "CAPTURING"}
          </>
        ) : (
          <>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--text-dim)" }} />
            {lang === "ja" ? "停止中" : "STOPPED"}
          </>
        )}
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 10 }}
          />
          <div
            className="card"
            style={{
              position: "absolute",
              bottom: "calc(100% + 6px)",
              right: 0,
              padding: 6,
              minWidth: 180,
              zIndex: 20,
              boxShadow: "var(--shadow-md)",
            }}
          >
            <div className="t-mono" style={{ fontSize: 9, padding: "6px 10px" }}>
              <Icon name="pause" size={9} /> {lang === "ja" ? "一時停止" : "PAUSE CAPTURE"}
            </div>
            {DURATIONS.map((d) => (
              <button
                key={d.key}
                onClick={() => pause(d)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 10px",
                  fontSize: 12,
                  color: "var(--text-mute)",
                  borderRadius: "var(--radius-sm)",
                  transition: "all var(--dur-fast)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--surface-2)";
                  e.currentTarget.style.color = "var(--text)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-mute)";
                }}
              >
                {lang === "ja" ? d.ja : d.en}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
