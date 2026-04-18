import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, type PageData } from "../lib/tauri";
import { Icon } from "../components/Icon";
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
      .then((p) => {
        if (p) {
          setPage(p);
          setTitle(p.title);
          setTruth(p.compiled_truth);
          setType(p.page_type);
          setTags(p.tags.join(", "));
        }
        setLoading(false);
      })
      .catch((e) => { setError(String(e)); setLoading(false); });
  }, [slug]);

  const save = async () => {
    if (!slug || !title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const decoded = decodeURIComponent(slug);
      await api.putPage({
        slug: decoded,
        title,
        page_type: type,
        compiled_truth: truth,
        tags: tags.split(",").map((x) => x.trim()).filter(Boolean),
      });
      navigate(`/page/${encodeURIComponent(decoded)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 20, height: 20, border: "2px solid var(--gold)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="content-inner" style={{ maxWidth: 680, margin: "0 auto", padding: "48px 40px", textAlign: "center" }}>
        <div style={{ color: "var(--danger)", marginBottom: 16 }}>{error ?? t("page.notfound", lang)}</div>
        <button onClick={() => navigate(-1)} className="btn btn-sm btn-secondary">{t("page.back", lang)}</button>
      </div>
    );
  }

  return (
    <div className="content-inner" style={{ maxWidth: 720, margin: "0 auto", padding: "32px 40px 64px" }}>
      <div className="row" style={{ marginBottom: 20 }}>
        <button
          onClick={() => navigate(-1)}
          className="btn btn-sm btn-ghost"
          style={{ padding: 0, height: "auto", gap: 6 }}
        >
          <Icon name="arrowLeft" size={12} /> {t("page.back", lang)}
        </button>
        <span className="spacer" />
        <span className="t-mono">{t("page.editing", lang).toUpperCase()}</span>
      </div>

      <div className="page-head">
        <div>
          <div className="t-mono" style={{ marginBottom: 6 }}>EDIT · 編集</div>
          <h1 style={{ margin: 0 }}>{title || page.title}</h1>
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: 20, borderColor: "var(--danger)", color: "var(--danger)", padding: 12, fontSize: 13 }}>
          {error}
        </div>
      )}

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 20 }}>
        <label style={{ display: "block" }}>
          <div className="t-mono" style={{ fontSize: 10, marginBottom: 6 }}>{t("page.title", lang).toUpperCase()}</div>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label style={{ display: "block" }}>
          <div className="t-mono" style={{ fontSize: 10, marginBottom: 6 }}>{t("page.type", lang).toUpperCase()}</div>
          <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="person">Person · 人</option>
            <option value="company">Company · 会社</option>
            <option value="session">Session · 会</option>
            <option value="concept">Concept · 概念</option>
          </select>
        </label>
        <label style={{ display: "block" }}>
          <div className="t-mono" style={{ fontSize: 10, marginBottom: 6 }}>{t("page.truth", lang).toUpperCase()}</div>
          <textarea
            className="input"
            style={{ height: 220, padding: 12, resize: "vertical", fontFamily: "var(--font-mono)", fontSize: 12, lineHeight: 1.6 }}
            value={truth}
            onChange={(e) => setTruth(e.target.value)}
          />
        </label>
        <label style={{ display: "block" }}>
          <div className="t-mono" style={{ fontSize: 10, marginBottom: 6 }}>{t("page.tags", lang).toUpperCase()}</div>
          <input className="input" placeholder="founder, tokyo" value={tags} onChange={(e) => setTags(e.target.value)} />
        </label>
      </div>

      {page.timeline && (
        <div style={{ marginBottom: 20 }}>
          <div className="t-mono" style={{ marginBottom: 10 }}>{t("page.timeline", lang)} · READ ONLY</div>
          <div className="card" style={{ padding: 16, background: "var(--surface-2)" }}>
            <pre style={{ margin: 0, fontSize: 11, color: "var(--text-mute)", fontFamily: "var(--font-mono)", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
              {page.timeline}
            </pre>
          </div>
        </div>
      )}

      <div className="row" style={{ gap: 8 }}>
        <button
          onClick={save}
          disabled={saving || !title.trim()}
          className="btn btn-primary"
          style={{ flex: 1 }}
        >
          {saving ? t("page.saving", lang) : t("page.save", lang)}
        </button>
        <button onClick={() => navigate(-1)} className="btn btn-secondary">
          {t("page.cancel", lang)}
        </button>
      </div>
    </div>
  );
}
