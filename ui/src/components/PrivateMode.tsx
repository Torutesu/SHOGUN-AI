import { useState } from "react";
import { api } from "../lib/tauri";
import { useLang } from "../lib/i18n";

/**
 * Private Mode — pause capture for a selected duration.
 * Options: 5min, 15min, 30min, 1h, until restart
 */

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

        // Auto-resume after duration
        setTimeout(async () => {
          try {
            await api.resumeCapture();
            onToggle(true);
            setPausedUntil(null);
          } catch {}
        }, duration.ms);
      } else {
        setPausedUntil(lang === "ja" ? "再起動まで" : "Until restart");
      }
    } catch {}
  };

  const resume = async () => {
    try {
      await api.resumeCapture();
      onToggle(true);
      setPausedUntil(null);
    } catch {}
  };

  if (!isActive && pausedUntil) {
    return (
      <div className="px-4 py-3 border-t border-border">
        <button onClick={resume} className="flex items-center gap-2 text-xs w-full">
          <span className="w-2 h-2 rounded-full bg-status-warn" />
          <div className="text-left">
            <span className="text-status-warn">{lang === "ja" ? "一時停止中" : "Paused"}</span>
            <span className="text-text-disabled ml-1.5">→ {pausedUntil}</span>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 border-t border-border relative">
      <button onClick={() => isActive ? setOpen(!open) : resume()} className="flex items-center gap-2 text-xs w-full">
        {isActive
          ? <><span className="dot-pulse" /><span className="text-text-secondary">{lang === "ja" ? "キャプチャ中" : "Capturing"}</span></>
          : <><span className="w-2 h-2 rounded-full bg-text-disabled" /><span className="text-text-disabled">{lang === "ja" ? "停止中" : "Stopped"}</span></>
        }
      </button>

      {/* Duration selector dropdown */}
      {open && (
        <div className="absolute bottom-full left-3 mb-1 bg-surface border border-border rounded-md shadow-lg py-1 min-w-[160px] animate-down z-30">
          <div className="px-3 py-1.5 text-[10px] text-text-disabled uppercase tracking-widest">
            {lang === "ja" ? "一時停止" : "Pause capture"}
          </div>
          {DURATIONS.map((d) => (
            <button
              key={d.key}
              onClick={() => pause(d)}
              className="w-full text-left px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-alt transition-colors"
            >
              {lang === "ja" ? d.ja : d.en}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
