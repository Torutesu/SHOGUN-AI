import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/tauri";

/**
 * Spotlight-style global search overlay.
 * Triggered by Cmd+K (Mac) or Ctrl+K (Windows/Linux).
 *
 * Features:
 * - Incremental search with debounce
 * - Keyboard navigation (Arrow Up/Down, Enter, Escape)
 * - Type badges and score display
 * - Recent searches
 */
export function SpotlightSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [selected, setSelected] = useState(0);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Global keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setResults([]);
      setSelected(0);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.searchMemory(query, 8);
        setResults(res.map((r) => ({
          slug: r.slug,
          title: r.title,
          type: r.page_type,
          score: r.score,
          snippet: r.snippet,
        })));
      } catch {
        setResults([]);
      }
      setSearching(false);
      setSelected(0);
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter" && results[selected]) {
      e.preventDefault();
      navigate(`/page/${encodeURIComponent(results[selected].slug)}`);
      setOpen(false);
    }
  }, [results, selected, navigate]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Search"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Search panel */}
      <div
        className="relative w-full max-w-2xl bg-shogun-navy-light border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center px-5 border-b border-white/10">
          <svg className="w-5 h-5 text-shogun-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            className="flex-1 bg-transparent px-4 py-4 text-lg text-shogun-text placeholder-shogun-muted focus:outline-none"
            placeholder="Search memory... (Cmd+K)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Search query"
          />
          {searching && (
            <div className="w-4 h-4 border-2 border-shogun-red border-t-transparent rounded-full animate-spin" />
          )}
          <kbd className="hidden sm:inline text-xs text-shogun-muted bg-white/5 px-2 py-1 rounded ml-2">ESC</kbd>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <ul className="max-h-96 overflow-y-auto py-2" role="listbox">
            {results.map((r, i) => (
              <li
                key={r.slug}
                role="option"
                aria-selected={i === selected}
                className={`flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors ${
                  i === selected ? "bg-white/10" : "hover:bg-white/5"
                }`}
                onClick={() => {
                  navigate(`/page/${encodeURIComponent(r.slug)}`);
                  setOpen(false);
                }}
                onMouseEnter={() => setSelected(i)}
              >
                <span className="text-lg shrink-0">{typeIcon[r.type] ?? "\u{1F4C4}"}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{r.title}</p>
                  <p className="text-xs text-shogun-muted truncate">{r.snippet}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${typeColor[r.type] ?? ""}`}>
                    {r.type}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Empty state */}
        {query.length >= 2 && !searching && results.length === 0 && (
          <div className="px-5 py-8 text-center text-shogun-muted text-sm">
            結果なし / No results for "{query}"
          </div>
        )}

        {/* Footer hints */}
        <div className="flex items-center gap-4 px-5 py-2 border-t border-white/10 text-[11px] text-shogun-muted">
          <span><kbd className="bg-white/5 px-1 rounded">↑↓</kbd> 移動</span>
          <span><kbd className="bg-white/5 px-1 rounded">Enter</kbd> 開く</span>
          <span><kbd className="bg-white/5 px-1 rounded">Esc</kbd> 閉じる</span>
        </div>
      </div>
    </div>
  );
}

interface SearchResultItem {
  slug: string;
  title: string;
  type: string;
  score: number;
  snippet: string;
}

const typeIcon: Record<string, string> = {
  person: "\u{1F464}",
  company: "\u{1F3E2}",
  session: "\u{1F4C5}",
  concept: "\u{1F4A1}",
};

const typeColor: Record<string, string> = {
  person: "bg-blue-500/20 text-blue-400",
  company: "bg-purple-500/20 text-purple-400",
  session: "bg-green-500/20 text-green-400",
  concept: "bg-yellow-500/20 text-yellow-400",
};
