import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type SearchResult } from "../lib/tauri";

export function Search() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const navigate = useNavigate();

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try { setResults(await api.searchMemory(query, 20)); } catch { setResults([]); }
    setSearching(false);
    setSearched(true);
  };

  const icon: Record<string, string> = { person: "👤", company: "🏢", session: "📅", concept: "💡" };

  return (
    <div className="p-6 max-w-[720px] mx-auto space-y-4 animate-in">
      <h1 className="text-md font-semibold">Search</h1>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-disabled" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input className="input pl-9" placeholder="Search anything..." value={query}
            onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} autoFocus />
        </div>
        <button onClick={search} disabled={searching} className="btn-gold">{searching ? "..." : "Search"}</button>
      </div>

      {searched && (
        <div className="space-y-2">
          <div className="text-xs text-text-disabled">{results.length} results</div>
          {results.length === 0 ? (
            <div className="card text-center py-8 text-sm text-text-disabled">No results found</div>
          ) : results.map((r) => (
            <div key={r.slug} className="card-interactive flex items-center gap-3"
              onClick={() => navigate(`/page/${encodeURIComponent(r.slug)}`)}>
              <span className="text-base">{icon[r.page_type] ?? "📄"}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{r.title}</div>
                <div className="text-[11px] text-text-disabled truncate">{r.snippet}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="badge badge-gold text-[10px]">{r.page_type}</span>
                <span className="text-[10px] text-text-disabled font-mono">{r.score.toFixed(3)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {!searched && (
        <div className="text-center py-16 space-y-3">
          <div className="w-12 h-12 rounded-full bg-surface-alt flex items-center justify-center mx-auto">
            <svg className="w-5 h-5 text-text-disabled" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="text-sm text-text-secondary">Keyword or natural language query</p>
        </div>
      )}
    </div>
  );
}
