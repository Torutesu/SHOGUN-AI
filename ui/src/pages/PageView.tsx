import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, type PageData } from "../lib/tauri";
import { useLang, t } from "../lib/i18n";

export function PageView() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();
  const lang = useLang();

  useEffect(() => {
    if (!slug) return;
    setLoading(true); setError(null);
    api.getPage(decodeURIComponent(slug))
      .then((p) => { setPage(p); setLoading(false); })
      .catch((e) => { setError(String(e)); setLoading(false); });
  }, [slug]);

  const handleDelete = async () => {
    if (!confirm("Delete this page?")) return;
    setDeleting(true);
    try { await api.deletePage(page!.slug); navigate("/"); }
    catch (e) { setError(String(e)); setDeleting(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-5 h-5 border-2 border-gold border-t-transparent rounded-full animate-spin" /></div>;
  if (error) return <div className="p-6 text-center"><p className="text-sm text-status-error">{error}</p><button onClick={() => navigate(-1)} className="btn-surface mt-3">← Back</button></div>;
  if (!page) return <div className="p-6 text-center"><p className="text-sm text-text-disabled">{t("page.notfound", lang)}</p><button onClick={() => navigate(-1)} className="btn-surface mt-3">{t("page.back", lang)}</button></div>;

  const icon: Record<string, string> = { person: "👤", company: "🏢", session: "📅", concept: "💡" };

  return (
    <div className="p-6 max-w-[680px] mx-auto space-y-5 animate-in">
      <button onClick={() => navigate(-1)} className="text-xs text-text-disabled hover:text-text-secondary transition-colors">← Back</button>

      {/* Header */}
      <div className="flex items-start gap-3">
        <span className="text-2xl">{icon[page.page_type] ?? "📄"}</span>
        <div>
          <h1 className="text-lg font-semibold">{page.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="badge badge-gold text-[10px]">{page.page_type}</span>
            <span className="text-[11px] text-text-disabled font-mono">{page.slug}</span>
          </div>
        </div>
      </div>

      {/* Tags */}
      {page.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {page.tags.map((t) => <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-gold/10 text-gold">{t}</span>)}
        </div>
      )}

      {/* Truth */}
      <div className="card">
        <div className="text-[10px] text-text-disabled uppercase tracking-widest mb-2">Compiled Truth</div>
        <div className="text-sm leading-relaxed whitespace-pre-wrap">{page.compiled_truth}</div>
      </div>

      {/* Timeline */}
      {page.timeline && (
        <div className="card">
          <div className="text-[10px] text-text-disabled uppercase tracking-widest mb-2">Timeline</div>
          <div className="space-y-1.5">
            {page.timeline.split("\n").filter(Boolean).map((line, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className="text-gold mt-0.5">•</span>
                <span className="text-text-secondary">{line.replace(/^- /, "")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button onClick={() => navigate(`/page/${encodeURIComponent(page.slug)}/edit`)} className="btn-gold">{t("page.edit", lang)}</button>
        <button onClick={handleDelete} disabled={deleting} className="btn-surface text-status-error">
          {deleting ? "..." : t("page.delete", lang)}
        </button>
      </div>
    </div>
  );
}
