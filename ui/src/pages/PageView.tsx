import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, type PageData } from "../lib/tauri";
import { Icon } from "../components/Icon";
import { useLang, t } from "../lib/i18n";

const TYPE_ICON: Record<string, string> = {
  person: "agents",
  company: "work",
  session: "calendar",
  concept: "note",
};

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
    setLoading(true);
    setError(null);
    api.getPage(decodeURIComponent(slug))
      .then((p) => { setPage(p); setLoading(false); })
      .catch((e) => { setError(String(e)); setLoading(false); });
  }, [slug]);

  const handleDelete = async () => {
    if (!confirm(t("page.delete.confirm", lang))) return;
    setDeleting(true);
    try {
      await api.deletePage(page!.slug);
      navigate("/");
    } catch (e) {
      setError(String(e));
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 20, height: 20, border: "2px solid var(--gold)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-inner" style={{ maxWidth: 680, margin: "0 auto", padding: "48px 40px" }}>
        <div className="card" style={{ borderColor: "var(--danger)", color: "var(--danger)", marginBottom: 16 }}>{error}</div>
        <button onClick={() => navigate(-1)} className="btn btn-sm btn-secondary">{t("page.back", lang)}</button>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="content-inner" style={{ maxWidth: 680, margin: "0 auto", padding: "48px 40px", textAlign: "center" }}>
        <div style={{ color: "var(--text-dim)", marginBottom: 16 }}>{t("page.notfound", lang)}</div>
        <button onClick={() => navigate(-1)} className="btn btn-sm btn-secondary">{t("page.back", lang)}</button>
      </div>
    );
  }

  return (
    <div className="content-inner" style={{ maxWidth: 820, margin: "0 auto", padding: "32px 40px 64px" }}>
      <button
        onClick={() => navigate(-1)}
        className="btn btn-sm btn-ghost"
        style={{ marginBottom: 20, padding: 0, height: "auto", gap: 6 }}
      >
        <Icon name="arrowLeft" size={12} /> {t("page.back", lang)}
      </button>

      <div className="page-head" style={{ marginBottom: 24 }}>
        <div className="row" style={{ alignItems: "flex-start", gap: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: "var(--radius-md)",
            background: "var(--surface-2)", border: "1px solid var(--gold-dim)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Icon name={TYPE_ICON[page.page_type] ?? "file"} size={22} className="gold" />
          </div>
          <div>
            <div className="t-mono" style={{ marginBottom: 6 }}>{page.page_type.toUpperCase()} · {page.slug}</div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, letterSpacing: "-0.01em" }}>{page.title}</h1>
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button
            onClick={() => navigate(`/page/${encodeURIComponent(page.slug)}/edit`)}
            className="btn btn-sm btn-secondary"
          >
            <Icon name="edit" size={13} /> {t("page.edit", lang)}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="btn btn-sm btn-secondary"
            style={{ color: "var(--danger)", borderColor: "color-mix(in srgb, var(--danger) 50%, transparent)" }}
          >
            {deleting ? "..." : t("page.delete", lang)}
          </button>
        </div>
      </div>

      {page.tags.length > 0 && (
        <div className="row" style={{ flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
          {page.tags.map((tag) => (
            <span key={tag} className="label label-gold">
              <Icon name="tag" size={10} />
              <span style={{ marginLeft: 4 }}>{tag}</span>
            </span>
          ))}
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <div className="t-mono" style={{ marginBottom: 12 }}>{t("page.truth", lang)} · 真</div>
        <div className="card" style={{ padding: 24 }}>
          <div style={{ fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap", color: "var(--text)" }}>
            {page.compiled_truth}
          </div>
        </div>
      </div>

      {page.timeline && (
        <div>
          <div className="t-mono" style={{ marginBottom: 12 }}>{t("page.timeline", lang)} · 時</div>
          <div className="card" style={{ padding: 20 }}>
            <div className="col" style={{ gap: 10 }}>
              {page.timeline.split("\n").filter(Boolean).map((line, i) => (
                <div key={i} className="row" style={{ gap: 10, alignItems: "flex-start" }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: "var(--gold)", marginTop: 7, flexShrink: 0,
                  }} />
                  <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text-mute)" }}>
                    {line.replace(/^- /, "")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
