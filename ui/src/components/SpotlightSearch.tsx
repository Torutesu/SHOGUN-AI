import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/tauri";
import { useLang, t } from "../lib/i18n";

interface Result { slug: string; title: string; type: string; score: number; snippet: string; }

export function SpotlightSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [sel, setSel] = useState(0);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const lang = useLang();

  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 50); setQuery(""); setResults([]); setSel(0); }
  }, [open]);

  useEffect(() => {
    if (!query.trim() || query.length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try { const res = await api.searchMemory(query, 8); setResults(res.map((r) => ({ slug: r.slug, title: r.title, type: r.page_type, score: r.score, snippet: r.snippet }))); }
      catch { setResults([]); }
      setSearching(false); setSel(0);
    }, 150);
    return () => clearTimeout(timer);
  }, [query]);

  const onKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
    else if (e.key === "Enter" && results[sel]) { navigate(`/page/${encodeURIComponent(results[sel].slug)}`); onClose(); }
    else if (e.key === "Escape") { onClose(); }
  }, [results, sel, navigate, onClose]);

  if (!open) return null;

  const icon: Record<string, string> = { person: "👤", company: "🏢", session: "📅", concept: "💡" };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]" onClick={onClose} role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in" />
      <div className="relative w-full max-w-lg bg-surface border border-border rounded-lg shadow-lg overflow-hidden animate-down" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center px-4 border-b border-border">
          <svg className="w-4 h-4 text-text-disabled shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input ref={inputRef} className="flex-1 bg-transparent px-3 py-3 text-sm text-text-primary placeholder-text-disabled focus:outline-none"
            placeholder={t("spotlight.placeholder", lang)} value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={onKey} />
          {searching && <div className="w-3.5 h-3.5 border-2 border-gold border-t-transparent rounded-full animate-spin" />}
          <kbd className="text-[10px] text-text-disabled bg-surface-alt px-1.5 py-0.5 rounded ml-2">ESC</kbd>
        </div>

        {/* Empty hint */}
        {query.length === 0 && (
          <div className="px-4 py-5 text-center text-xs text-text-disabled">
            {lang === "ja" ? "キーワードまたは自然言語で検索" : "Search by keyword or natural language"}
          </div>
        )}

        {results.length > 0 && (
          <ul className="max-h-80 overflow-y-auto py-1" role="listbox">
            {results.map((r, i) => (
              <li key={r.slug} role="option" aria-selected={i === sel}
                className={`flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors ${i === sel ? "bg-surface-alt" : "hover:bg-surface-alt/50"}`}
                onClick={() => { navigate(`/page/${encodeURIComponent(r.slug)}`); onClose(); }}
                onMouseEnter={() => setSel(i)}>
                <span className="text-sm">{icon[r.type] ?? "📄"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{r.title}</p>
                  <p className="text-[11px] text-text-disabled truncate">{r.snippet}</p>
                </div>
                <span className="badge badge-gold text-[10px]">{r.type}</span>
              </li>
            ))}
          </ul>
        )}

        {query.length >= 2 && !searching && results.length === 0 && (
          <div className="px-4 py-6 text-center text-xs text-text-disabled">{t("spotlight.noresults", lang)}</div>
        )}

        <div className="flex items-center gap-4 px-4 py-1.5 border-t border-border text-[10px] text-text-disabled">
          <span><kbd className="bg-surface-alt px-1 rounded">↑↓</kbd> navigate</span>
          <span><kbd className="bg-surface-alt px-1 rounded">↵</kbd> open</span>
          <span><kbd className="bg-surface-alt px-1 rounded">esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
