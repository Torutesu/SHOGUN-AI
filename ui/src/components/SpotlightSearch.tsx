import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/tauri";
import { Icon } from "./Icon";
import { useLang, t } from "../lib/i18n";

interface Result {
  slug: string;
  title: string;
  type: string;
  score: number;
  snippet: string;
}

const TYPE_ICON: Record<string, string> = {
  person: "agents",
  company: "work",
  session: "calendar",
  concept: "note",
};

export function SpotlightSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [sel, setSel] = useState(0);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const lang = useLang();

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setResults([]);
      setSel(0);
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim() || query.length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.searchMemory(query, 8);
        setResults(res.map((r) => ({
          slug: r.slug, title: r.title, type: r.page_type, score: r.score, snippet: r.snippet,
        })));
      } catch { setResults([]); }
      setSearching(false);
      setSel(0);
    }, 150);
    return () => clearTimeout(timer);
  }, [query]);

  const onKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((s) => Math.min(s + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter" && results[sel]) {
      navigate(`/page/${encodeURIComponent(results[sel].slug)}`);
      onClose();
    } else if (e.key === "Escape") {
      onClose();
    }
  }, [results, sel, navigate, onClose]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        paddingTop: "18vh",
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div style={{
        position: "absolute", inset: 0,
        background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)",
      }} />

      <div
        className="card"
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 600,
          padding: 0,
          boxShadow: "var(--shadow-lg)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="row" style={{
          padding: "0 16px", height: 56,
          borderBottom: "1px solid var(--border)", gap: 12,
        }}>
          <Icon name="search" size={16} className="dim" />
          <input
            ref={inputRef}
            className="input"
            style={{ flex: 1, border: 0, background: "transparent", padding: 0, height: "auto", fontSize: 15 }}
            placeholder={t("spotlight.placeholder", lang)}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKey}
          />
          {searching && (
            <div style={{
              width: 14, height: 14,
              border: "2px solid var(--gold)", borderTopColor: "transparent",
              borderRadius: "50%", animation: "spin 1s linear infinite",
            }} />
          )}
          <span className="label" style={{ fontSize: 10, height: 20 }}>ESC</span>
        </div>

        {query.length === 0 && (
          <div style={{ padding: "28px 16px", textAlign: "center", fontSize: 12, color: "var(--text-dim)" }}>
            {lang === "ja" ? "キーワードまたは自然言語で検索" : "Search by keyword or natural language"}
          </div>
        )}

        {results.length > 0 && (
          <ul
            role="listbox"
            style={{
              margin: 0, padding: "6px 0", listStyle: "none",
              maxHeight: 380, overflowY: "auto",
            }}
          >
            {results.map((r, i) => (
              <li
                key={r.slug}
                role="option"
                aria-selected={i === sel}
                onClick={() => { navigate(`/page/${encodeURIComponent(r.slug)}`); onClose(); }}
                onMouseEnter={() => setSel(i)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 16px", cursor: "pointer",
                  background: i === sel ? "var(--surface-2)" : "transparent",
                  borderLeft: i === sel ? "2px solid var(--gold)" : "2px solid transparent",
                  transition: "background var(--dur-fast)",
                }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: "var(--radius-sm)",
                  background: "var(--surface-2)",
                  border: `1px solid ${i === sel ? "var(--gold-dim)" : "var(--border)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <Icon name={TYPE_ICON[r.type] ?? "file"} size={14} className={i === sel ? "gold" : "dim"} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {r.title}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>
                    {r.snippet}
                  </div>
                </div>
                <span className="label label-gold" style={{ fontSize: 10, height: 20 }}>{r.type}</span>
              </li>
            ))}
          </ul>
        )}

        {query.length >= 2 && !searching && results.length === 0 && (
          <div style={{ padding: "32px 16px", textAlign: "center", fontSize: 12, color: "var(--text-dim)" }}>
            {t("spotlight.noresults", lang)}
          </div>
        )}

        <div className="row" style={{
          gap: 16, padding: "10px 16px",
          borderTop: "1px solid var(--border)",
          fontSize: 10, color: "var(--text-dim)",
          fontFamily: "var(--font-mono)",
        }}>
          <span className="row" style={{ gap: 4 }}>
            <span className="label" style={{ fontSize: 9, height: 16, padding: "0 4px" }}>↑↓</span>
            navigate
          </span>
          <span className="row" style={{ gap: 4 }}>
            <span className="label" style={{ fontSize: 9, height: 16, padding: "0 4px" }}>↵</span>
            open
          </span>
          <span className="row" style={{ gap: 4 }}>
            <span className="label" style={{ fontSize: 9, height: 16, padding: "0 4px" }}>esc</span>
            close
          </span>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
