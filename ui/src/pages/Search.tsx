import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type SearchResult } from "../lib/tauri";
import { Icon } from "../components/Icon";
import { useLang } from "../lib/i18n";

export function Search() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const navigate = useNavigate();
  const lang = useLang();

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try { setResults(await api.searchMemory(query, 20)); } catch { setResults([]); }
    setSearching(false);
    setSearched(true);
  };

  const typeIcon: Record<string, string> = { person: "agents", company: "work", session: "calendar", concept: "note" };

  return (
    <div className="content-inner" style={{ maxWidth: 820, margin: "0 auto", padding: "32px 40px 64px" }}>
      <div className="page-head">
        <div>
          <div className="t-mono" style={{ marginBottom: 6 }}>SEARCH · 検索</div>
          <h1><span className="en-only">Search</span><span className="jp">検索</span></h1>
        </div>
      </div>

      <div className="row" style={{ gap: 8, marginBottom: 24 }}>
        <div className="row" style={{ flex: 1, height: 48, padding: "0 16px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", gap: 10 }}>
          <Icon name="search" size={16} className="dim" />
          <input
            className="input"
            style={{ border: 0, background: "transparent", padding: 0, height: "auto", flex: 1 }}
            placeholder={lang === "ja" ? "何でも検索..." : "Search anything..."}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            autoFocus
          />
        </div>
        <button onClick={search} disabled={searching} className="btn btn-primary">
          {searching ? "..." : "Search"}
        </button>
      </div>

      {searched && (
        <div className="col" style={{ gap: 8 }}>
          <div className="t-mono" style={{ marginBottom: 4 }}>
            {results.length} {lang === "ja" ? "件の結果" : "results"}
          </div>
          {results.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: 40, color: "var(--text-dim)", fontSize: 13 }}>
              {lang === "ja" ? "結果なし" : "No results found"}
            </div>
          ) : (
            results.map((r) => (
              <div
                key={r.slug}
                className="card card-interactive row"
                onClick={() => navigate(`/page/${encodeURIComponent(r.slug)}`)}
                style={{ gap: 14, padding: 16 }}
              >
                <div style={{ width: 36, height: 36, borderRadius: "var(--radius-md)", background: "var(--surface-2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name={typeIcon[r.page_type] ?? "file"} size={15} className="gold" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{r.title}</div>
                  <div style={{ fontSize: 12, color: "var(--text-mute)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.snippet}
                  </div>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <span className="label label-gold">{r.page_type}</span>
                  <span className="t-mono" style={{ fontSize: 10 }}>{r.score.toFixed(3)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {!searched && (
        <div style={{ textAlign: "center", padding: "64px 20px" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--surface-2)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
            <Icon name="search" size={20} className="dim" />
          </div>
          <div style={{ fontSize: 14, color: "var(--text-mute)" }}>
            {lang === "ja" ? "キーワードまたは自然言語で検索" : "Keyword or natural language query"}
          </div>
        </div>
      )}
    </div>
  );
}
