import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, type PageData } from "../lib/tauri";

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

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api.getPage(decodeURIComponent(slug))
      .then((p) => { if (p) { setPage(p); setTitle(p.title); setTruth(p.compiled_truth); setType(p.page_type); setTags(p.tags.join(", ")); } setLoading(false); })
      .catch(() => setLoading(false));
  }, [slug]);

  const save = async () => {
    if (!slug || !title.trim()) return;
    setSaving(true); setError(null);
    try {
      await api.putPage({ slug: decodeURIComponent(slug), title, page_type: type, compiled_truth: truth, tags: tags.split(",").map((t) => t.trim()).filter(Boolean) });
      navigate(`/page/${slug}`);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-5 h-5 border-2 border-gold border-t-transparent rounded-full animate-spin" /></div>;
  if (!page) return <div className="p-6 text-center text-sm text-text-disabled">Not found<br /><button onClick={() => navigate(-1)} className="btn-surface mt-3">← Back</button></div>;

  return (
    <div className="p-6 max-w-[600px] mx-auto space-y-4 animate-in">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-xs text-text-disabled hover:text-text-secondary">← Back</button>
        <span className="text-xs text-text-disabled">Editing</span>
      </div>

      {error && <div className="bg-status-error/10 border border-status-error/20 rounded-md px-3 py-2 text-xs text-status-error">{error}</div>}

      <div className="space-y-3">
        <label className="block">
          <span className="text-xs text-text-secondary">Title</span>
          <input className="input mt-1" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-xs text-text-secondary">Type</span>
          <select className="input mt-1" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="person">Person</option><option value="company">Company</option>
            <option value="session">Session</option><option value="concept">Concept</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-text-secondary">Compiled Truth</span>
          <textarea className="input mt-1 h-48 resize-y font-mono text-xs leading-relaxed" value={truth} onChange={(e) => setTruth(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-xs text-text-secondary">Tags (comma-separated)</span>
          <input className="input mt-1" placeholder="founder, tokyo" value={tags} onChange={(e) => setTags(e.target.value)} />
        </label>
      </div>

      {page.timeline && (
        <div className="card">
          <div className="text-[10px] text-text-disabled uppercase tracking-widest mb-1">Timeline (read-only)</div>
          <pre className="text-[11px] text-text-disabled whitespace-pre-wrap">{page.timeline}</pre>
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={save} disabled={saving || !title.trim()} className="btn-gold flex-1">{saving ? "Saving..." : "Save"}</button>
        <button onClick={() => navigate(-1)} className="btn-surface">Cancel</button>
      </div>
    </div>
  );
}
