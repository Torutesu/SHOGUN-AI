import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type SearchResult } from "../lib/tauri";

export function Search() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await api.searchMemory(query, 20);
      setResults(res);
    } catch {
      setResults([]);
    }
    setSearching(false);
    setHasSearched(true);
  };

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

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold">Search Memory</h1>

      {/* Search bar */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-shogun-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            className="input-field pl-12 text-lg"
            placeholder="何でも検索... / Search anything..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            autoFocus
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={searching}
          className="btn-primary px-8"
        >
          {searching ? "..." : "検索"}
        </button>
      </div>

      {/* Results */}
      {hasSearched && (
        <div className="space-y-3">
          <p className="text-sm text-shogun-muted">
            {results.length} 件の結果 / {results.length} results
          </p>

          {results.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-shogun-muted">結果が見つかりませんでした</p>
              <p className="text-sm text-shogun-muted mt-1">No results found</p>
            </div>
          ) : (
            results.map((r) => (
              <div
                key={r.slug}
                className="card cursor-pointer hover:border-shogun-red/30 transition-colors"
                onClick={() => navigate(`/page/${encodeURIComponent(r.slug)}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <span className="text-xl mt-0.5">{typeIcon[r.page_type] ?? "\u{1F4C4}"}</span>
                    <div>
                      <h3 className="font-semibold">{r.title}</h3>
                      <p className="text-sm text-shogun-muted mt-1">{r.snippet}</p>
                      <p className="text-xs text-shogun-muted mt-2">{r.slug}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-2 py-1 rounded ${typeColor[r.page_type] ?? ""}`}>
                      {r.page_type}
                    </span>
                    <span className="text-xs text-shogun-red font-mono">
                      {r.score.toFixed(3)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {!hasSearched && (
        <div className="text-center py-16 space-y-4">
          <div className="text-5xl">&#x1F50D;</div>
          <p className="text-shogun-muted">
            キーワードまたは自然言語で検索してください
          </p>
          <p className="text-sm text-shogun-muted">
            Search by keyword or natural language query
          </p>
        </div>
      )}
    </div>
  );
}
