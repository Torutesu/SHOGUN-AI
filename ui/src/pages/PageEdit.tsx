import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, type PageData } from "../lib/tauri";

export function PageEdit() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [compiledTruth, setCompiledTruth] = useState("");
  const [pageType, setPageType] = useState("concept");
  const [tagsInput, setTagsInput] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api.getPage(decodeURIComponent(slug)).then((p) => {
      if (p) {
        setPage(p);
        setTitle(p.title);
        setCompiledTruth(p.compiled_truth);
        setPageType(p.page_type);
        setTagsInput(p.tags.join(", "));
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [slug]);

  const handleSave = async () => {
    if (!slug || !title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
      await api.putPage({
        slug: decodeURIComponent(slug),
        title,
        page_type: pageType,
        compiled_truth: compiledTruth,
        tags,
      });
      setSaved(true);
      setTimeout(() => navigate(`/page/${slug}`), 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-shogun-red border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-shogun-muted">Page not found</p>
        <button onClick={() => navigate(-1)} className="btn-secondary">← Back</button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-shogun-muted hover:text-white text-sm">
          ← 戻る / Back
        </button>
        <h1 className="text-xl font-bold">Edit Page</h1>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <label className="block">
          <span className="text-sm text-shogun-muted">Title / タイトル</span>
          <input
            className="input-field mt-1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>

        <label className="block">
          <span className="text-sm text-shogun-muted">Type / タイプ</span>
          <select
            className="input-field mt-1"
            value={pageType}
            onChange={(e) => setPageType(e.target.value)}
          >
            <option value="person">Person</option>
            <option value="company">Company</option>
            <option value="session">Session</option>
            <option value="concept">Concept</option>
          </select>
        </label>

        <label className="block">
          <span className="text-sm text-shogun-muted">Compiled Truth</span>
          <textarea
            className="input-field mt-1 h-64 resize-y font-mono text-sm"
            value={compiledTruth}
            onChange={(e) => setCompiledTruth(e.target.value)}
          />
        </label>

        <label className="block">
          <span className="text-sm text-shogun-muted">Tags (comma-separated)</span>
          <input
            className="input-field mt-1"
            placeholder="founder, tokyo, ai"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
          />
        </label>
      </div>

      {/* Timeline (read-only) */}
      {page.timeline && (
        <div className="card">
          <h3 className="text-sm font-semibold text-shogun-muted uppercase tracking-wider mb-2">
            Timeline (read-only / 追記のみ)
          </h3>
          <pre className="text-sm text-shogun-muted whitespace-pre-wrap">{page.timeline}</pre>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !title.trim()}
          className="btn-primary flex-1 disabled:opacity-50"
        >
          {saved ? "保存しました！ / Saved!" : saving ? "保存中..." : "保存 / Save"}
        </button>
        <button
          onClick={() => navigate(-1)}
          className="btn-secondary"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
