import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, type PageData } from "../lib/tauri";
import { useLang, t } from "../lib/i18n";

export function PageEdit() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [truth, setTruth] = useState("");
  const [type, setType] = useState("concept");
  const [tags, setTags] = useState("");
  const navigate = useNavigate();
  const lang = useLang();

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    const decoded = decodeURIComponent(slug);
    api.getPage(decoded)
      .then((p) => { if (p) { setPage(p); setTitle(p.title); setTruth(p.compiled_truth); setType(p.page_type); setTags(p.tags.join(", ")); } setLoading(false); })
      .catch((e) => { setError(String(e)); setLoading(false); });
  }, [slug]);

  const save = async () => {
    if (!slug || !title.trim()) return;
    setSaving(true); setError(null);
    try {
      const decoded = decodeURIComponent(slug);
      await api.putPage({ slug: decoded, title, page_type: type, compiled_truth: truth, tags: tags.split(",").map((x) => x.trim()).filter(Boolean) });
      navigate(`/page/${encodeURIComponent(decoded)}`);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-5 h-5 border-2 border-gold border-t-transparent rounded-full animate-spin" /></div>;
  if (error && !page) return <div className="p-6 text-center text-sm text-status-error">{error}<br /><button onClick={() => navigate(-1)} className="btn-surface mt-3">{t("page.back", lang)}</button></div>;
  if (!page) return <div className="p-6 text-center text-sm text-text-disabled">{t("page.notfound", lang)}<br /><button onClick={() => navigate(-1)} className="btn-surface mt-3">{t("page.back", lang)}</button></div>;

  return (
    <div className="p-6 max-w-[600px] mx-auto space-y-4 animate-in">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-xs text-text-disabled hover:text-text-secondary">{t("page.back", lang)}</button>
        <span className="text-xs text-text-disabled">{t("page.editing", lang)}</span>
      </div>

      {error && <div className="bg-status-error/10 border border-status-error/20 rounded-md px-3 py-2 text-xs text-status-error">{error}</div>}

      <div className="space-y-3">
        <label className="block"><span className="text-xs text-text-secondary">{t("page.title", lang)}</span><input className="input mt-1" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <label className="block"><span className="text-xs text-text-secondary">{t("page.type", lang)}</span>
          <select className="input mt-1" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="person">Person</option><option value="company">Company</option><option value="session">Session</option><option value="concept">Concept</option>
          </select>
        </label>
        <label className="block"><span className="text-xs text-text-secondary">{t("page.truth", lang)}</span><textarea className="input mt-1 h-48 resize-y font-mono text-xs leading-relaxed" value={truth} onChange={(e) => setTruth(e.target.value)} /></label>
        <label className="block"><span className="text-xs text-text-secondary">{t("page.tags", lang)}</span><input className="input mt-1" placeholder="founder, tokyo" value={tags} onChange={(e) => setTags(e.target.value)} /></label>
      </div>

      {page.timeline && (
        <div className="card"><div className="section-label mb-1">{t("page.timeline", lang)} (read-only)</div><pre className="text-[11px] text-text-disabled whitespace-pre-wrap">{page.timeline}</pre></div>
      )}

      <div className="flex gap-2">
        <button onClick={save} disabled={saving || !title.trim()} className="btn-gold flex-1">{saving ? t("page.saving", lang) : t("page.save", lang)}</button>
        <button onClick={() => navigate(-1)} className="btn-surface">{t("page.cancel", lang)}</button>
      </div>
    </div>
  );
}
