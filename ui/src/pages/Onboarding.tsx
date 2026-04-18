import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/tauri";
import { Icon, Kamon } from "../components/Icon";
import { useLang, t } from "../lib/i18n";

type Step = 1 | 2 | 3 | 4 | 5;

export function Onboarding() {
  const [step, setStep] = useState<Step>(1);
  const navigate = useNavigate();
  const lang = useLang();
  const next = () => setStep((s) => Math.min(s + 1, 5) as Step);
  const prev = () => setStep((s) => Math.max(s - 1, 1) as Step);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        <div className="card" style={{ padding: 40 }}>
          {step === 1 && <Welcome onNext={next} lang={lang} />}
          {step === 2 && <ApiKeys onNext={next} onBack={prev} lang={lang} />}
          {step === 3 && <FirstMemory onNext={next} onBack={prev} lang={lang} />}
          {step === 4 && <SearchDemo onNext={next} onBack={prev} lang={lang} />}
          {step === 5 && <Complete onFinish={() => navigate("/")} lang={lang} />}
        </div>

        <div className="row" style={{ justifyContent: "center", gap: 6, marginTop: 20 }}>
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              style={{
                width: s === step ? 20 : 6,
                height: 6,
                borderRadius: 3,
                background: s <= step ? "var(--gold)" : "var(--border)",
                transition: "all var(--dur-base) var(--ease-out)",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

type P = { lang: "ja" | "en" };

function Welcome({ onNext, lang }: { onNext: () => void } & P) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
        <Kamon size={56} color="var(--gold)" />
      </div>
      <div className="t-mono" style={{ marginBottom: 8 }}>SHOGUN · 将軍</div>
      <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, letterSpacing: "-0.01em" }}>
        {lang === "ja" ? "すべてを覚えるAI" : "The AI that remembers"}
      </h1>
      <p style={{ color: "var(--text-mute)", fontSize: 14, marginTop: 10, lineHeight: 1.6 }}>
        {lang === "ja"
          ? "あなたの文脈を記憶し、行動するAI OS"
          : "A personal AI OS that carries your full context"}
      </p>

      <button onClick={onNext} className="btn btn-primary btn-lg" style={{ width: "100%", marginTop: 32 }}>
        {t("onboard.start", lang)}
        <Icon name="arrowRight" size={14} />
      </button>

      <div className="row" style={{ justifyContent: "center", gap: 6, marginTop: 20, fontSize: 11, color: "var(--text-dim)" }}>
        <Icon name="lock" size={11} />
        <span>{t("onboard.local", lang)}</span>
      </div>
    </div>
  );
}

function ApiKeys({ onNext, onBack, lang }: { onNext: () => void; onBack: () => void } & P) {
  const [openai, setOpenai] = useState("");
  const [skip, setSkip] = useState(false);

  const handleNext = async () => {
    try {
      if (!skip && openai) {
        const s = await api.loadSettings();
        await api.saveSettings({ ...s, openai_api_key: openai || null });
      }
    } catch { /* ignore */ }
    onNext();
  };

  return (
    <div>
      <button onClick={onBack} className="btn btn-sm btn-ghost" style={{ padding: 0, height: "auto", gap: 6, marginBottom: 20 }}>
        <Icon name="arrowLeft" size={12} /> {t("onboard.back", lang)}
      </button>

      <div className="t-mono" style={{ marginBottom: 8 }}>STEP 2 / 5 · APIキー</div>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>{t("onboard.apikeys", lang)}</h2>
      <p style={{ color: "var(--text-mute)", fontSize: 13, marginTop: 8, marginBottom: 20 }}>
        {t("onboard.apikeys.hint", lang)}
      </p>

      <label style={{ display: "block", marginBottom: 12 }}>
        <div className="t-mono" style={{ fontSize: 10, marginBottom: 6 }}>OPENAI API KEY</div>
        <input
          className="input"
          type="password"
          placeholder="sk-..."
          value={openai}
          onChange={(e) => { setOpenai(e.target.value); setSkip(false); }}
        />
        <a
          href="https://platform.openai.com/api-keys"
          target="_blank"
          rel="noreferrer"
          className="gold"
          style={{ fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4, marginTop: 8, textDecoration: "none" }}
        >
          Get an API key <Icon name="arrowUpRight" size={10} />
        </a>
      </label>

      <label className="row" style={{ gap: 8, cursor: "pointer", marginTop: 16, fontSize: 12, color: "var(--text-mute)" }}>
        <input type="checkbox" checked={skip} onChange={(e) => setSkip(e.target.checked)} />
        <span>{t("onboard.skip", lang)}</span>
      </label>

      <button onClick={handleNext} className="btn btn-primary" style={{ width: "100%", marginTop: 24 }}>
        {t("onboard.next", lang)}
        <Icon name="arrowRight" size={14} />
      </button>
    </div>
  );
}

function FirstMemory({ onNext, onBack, lang }: { onNext: () => void; onBack: () => void } & P) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [done, setDone] = useState(false);

  const slug = name
    ? `people/${name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}`
    : "people/...";

  const create = async () => {
    if (!name) return;
    setCreating(true);
    try {
      await api.putPage({ slug, title: name, page_type: "person", compiled_truth: desc || name, tags: [] });
      setDone(true);
    } catch { setDone(true); }
    setCreating(false);
  };

  return (
    <div>
      <button onClick={onBack} className="btn btn-sm btn-ghost" style={{ padding: 0, height: "auto", gap: 6, marginBottom: 20 }}>
        <Icon name="arrowLeft" size={12} /> {t("onboard.back", lang)}
      </button>

      <div className="t-mono" style={{ marginBottom: 8 }}>STEP 3 / 5 · 最初の記憶</div>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>{t("onboard.firstmemory", lang)}</h2>

      <div className="col" style={{ gap: 12, marginTop: 20 }}>
        <label style={{ display: "block" }}>
          <div className="t-mono" style={{ fontSize: 10, marginBottom: 6 }}>{t("onboard.name", lang).toUpperCase()}</div>
          <input className="input" placeholder="Toru Yamamoto" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label style={{ display: "block" }}>
          <div className="t-mono" style={{ fontSize: 10, marginBottom: 6 }}>{t("onboard.whatdo", lang).toUpperCase()}</div>
          <textarea
            className="input"
            style={{ height: 80, padding: 12, resize: "none" }}
            placeholder="Building SHOGUN..."
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
        </label>
      </div>

      <div style={{
        marginTop: 12, padding: "10px 12px", background: "var(--surface-2)",
        border: "1px solid var(--border)", borderRadius: "var(--radius-md)",
        fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-mute)",
      }}>
        {slug}
      </div>

      {done ? (
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <div className="row" style={{ justifyContent: "center", gap: 6, color: "var(--success)", fontSize: 14, fontWeight: 500 }}>
            <Icon name="check" size={14} /> {t("onboard.created", lang)}
          </div>
          <button onClick={onNext} className="btn btn-primary" style={{ width: "100%", marginTop: 16 }}>
            {t("onboard.next", lang)}
            <Icon name="arrowRight" size={14} />
          </button>
        </div>
      ) : (
        <button onClick={create} disabled={!name || creating} className="btn btn-primary" style={{ width: "100%", marginTop: 20 }}>
          {creating ? t("onboard.creating", lang) : t("onboard.createpage", lang)}
        </button>
      )}
    </div>
  );
}

function SearchDemo({ onNext, onBack, lang }: { onNext: () => void; onBack: () => void } & P) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ slug: string; title: string }[]>([]);
  const [searched, setSearched] = useState(false);

  const search = async () => {
    if (!query) return;
    try {
      const r = await api.searchMemory(query, 5);
      setResults(r.map((x) => ({ slug: x.slug, title: x.title })));
    } catch { setResults([]); }
    setSearched(true);
  };

  return (
    <div>
      <button onClick={onBack} className="btn btn-sm btn-ghost" style={{ padding: 0, height: "auto", gap: 6, marginBottom: 20 }}>
        <Icon name="arrowLeft" size={12} /> {t("onboard.back", lang)}
      </button>

      <div className="t-mono" style={{ marginBottom: 8 }}>STEP 4 / 5 · 検索</div>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>{t("onboard.trysearch", lang)}</h2>

      <div className="row" style={{ gap: 8, marginTop: 20 }}>
        <input
          className="input"
          style={{ flex: 1 }}
          placeholder={t("search.placeholder", lang)}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
        />
        <button onClick={search} className="btn btn-primary">
          <Icon name="search" size={14} />
        </button>
      </div>

      {searched && (
        <div className="col" style={{ gap: 6, marginTop: 16 }}>
          {results.length > 0 ? results.map((r) => (
            <div key={r.slug} className="card" style={{ padding: 12, fontSize: 13 }}>
              {r.title}
            </div>
          )) : (
            <p style={{ fontSize: 12, color: "var(--text-dim)", textAlign: "center", padding: 12 }}>
              {t("onboard.noresults", lang)}
            </p>
          )}
        </div>
      )}

      <button onClick={onNext} className="btn btn-primary" style={{ width: "100%", marginTop: 24 }}>
        {t("onboard.next", lang)}
        <Icon name="arrowRight" size={14} />
      </button>
    </div>
  );
}

function Complete({ onFinish, lang }: { onFinish: () => void } & P) {
  const finish = async () => {
    try {
      const s = await api.loadSettings();
      await api.saveSettings({ ...s, onboarding_completed: true });
    } catch { /* ignore */ }
    onFinish();
  };

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
        <div style={{
          width: 64, height: 64, borderRadius: "50%",
          background: "color-mix(in srgb, var(--gold) 15%, transparent)",
          border: "1px solid var(--gold-dim)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon name="check" size={28} className="gold" />
        </div>
      </div>

      <div className="t-mono" style={{ marginBottom: 8 }}>STEP 5 / 5 · 完了</div>
      <h2 style={{ margin: 0, fontSize: 26, fontWeight: 600 }}>{t("onboard.ready", lang)}</h2>
      <p style={{ color: "var(--text-mute)", fontSize: 14, marginTop: 10 }}>
        {t("onboard.ready.sub", lang)}
      </p>

      <button onClick={finish} className="btn btn-primary btn-lg" style={{ width: "100%", marginTop: 28 }}>
        {t("onboard.done", lang)}
        <Icon name="arrowRight" size={14} />
      </button>
    </div>
  );
}
