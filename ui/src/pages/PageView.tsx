import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, type PageData } from "../lib/tauri";

export function PageView() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api.getPage(decodeURIComponent(slug)).then((p) => {
      setPage(p);
      setLoading(false);
    });
  }, [slug]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <p className="text-shogun-muted">Loading...</p>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="p-8 text-center space-y-4">
        <div className="text-5xl">&#x1F4AD;</div>
        <h2 className="text-xl font-semibold">Page not found</h2>
        <p className="text-shogun-muted">{slug}</p>
        <button onClick={() => navigate(-1)} className="btn-secondary">
          ← 戻る / Go Back
        </button>
      </div>
    );
  }

  const typeIcon: Record<string, string> = {
    person: "\u{1F464}",
    company: "\u{1F3E2}",
    session: "\u{1F4C5}",
    concept: "\u{1F4A1}",
  };

  return (
    <div className="p-8 max-w-3xl space-y-6">
      {/* Breadcrumb */}
      <button onClick={() => navigate(-1)} className="text-shogun-muted hover:text-white text-sm">
        ← 戻る / Back
      </button>

      {/* Header */}
      <div className="flex items-start gap-4">
        <span className="text-4xl">{typeIcon[page.page_type] ?? "\u{1F4C4}"}</span>
        <div>
          <h1 className="text-3xl font-bold">{page.title}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs px-2 py-1 rounded bg-white/10 text-shogun-muted">
              {page.page_type}
            </span>
            <span className="text-xs text-shogun-muted">{page.slug}</span>
          </div>
        </div>
      </div>

      {/* Tags */}
      {page.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {page.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-3 py-1 rounded-full bg-shogun-red/20 text-shogun-red"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Compiled Truth */}
      <div className="card space-y-3">
        <h2 className="text-sm font-semibold text-shogun-muted uppercase tracking-wider">
          Compiled Truth
        </h2>
        <div className="prose prose-invert max-w-none whitespace-pre-wrap">
          {page.compiled_truth}
        </div>
      </div>

      {/* Timeline */}
      {page.timeline && (
        <div className="card space-y-3">
          <h2 className="text-sm font-semibold text-shogun-muted uppercase tracking-wider">
            Timeline
          </h2>
          <div className="space-y-2 text-sm">
            {page.timeline.split("\n").filter(Boolean).map((line, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-shogun-red mt-0.5">&#x2022;</span>
                <span>{line.replace(/^- /, "")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={async () => {
            if (confirm("このページを削除しますか？/ Delete this page?")) {
              await api.deletePage(page.slug);
              navigate("/");
            }
          }}
          className="btn-secondary text-red-400 hover:text-red-300"
        >
          削除 / Delete
        </button>
      </div>
    </div>
  );
}
