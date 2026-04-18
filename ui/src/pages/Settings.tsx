import { useEffect, useState } from "react";
import { api, type AppSettings } from "../lib/tauri";
import { Icon } from "../components/Icon";
import { useLang } from "../lib/i18n";

export function Settings() {
  const [s, setS] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lang = useLang();

  useEffect(() => {
    api.loadSettings().then(setS).catch((e) => setError(String(e))).finally(() => setLoading(false));
  }, []);

  const u = (patch: Partial<AppSettings>) => { if (s) { setS({ ...s, ...patch }); setSaved(false); } };

  const save = async () => {
    if (!s) return;
    setSaving(true); setError(null);
    try { await api.saveSettings(s); setSaved(true); setTimeout(() => setSaved(false), 3000); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
    setSaving(false);
  };

  if (loading) return <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ width: 20, height: 20, border: "2px solid var(--gold)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} /></div>;
  if (!s) return <div className="content-inner" style={{ padding: 40 }}><div style={{ color: "var(--danger)" }}>{error ?? "Failed to load"}</div></div>;

  return (
    <div className="content-inner" style={{ maxWidth: 720, margin: "0 auto", padding: "32px 40px 64px" }}>
      <div className="page-head">
        <div>
          <div className="t-mono" style={{ marginBottom: 6 }}>SETTINGS · 設定</div>
          <h1><span className="en-only">Settings</span><span className="jp">設定</span></h1>
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: 20, borderColor: "var(--danger)", color: "var(--danger)" }}>
          {error}
        </div>
      )}

      <Section title="API KEYS · 鍵">
        <Field label="OpenAI" type="password" placeholder="sk-..." value={s.openai_api_key ?? ""} onChange={(v) => u({ openai_api_key: v || null })} />
        <Field label="Anthropic" type="password" placeholder="sk-ant-..." value={s.anthropic_api_key ?? ""} onChange={(v) => u({ anthropic_api_key: v || null })} />
      </Section>

      <Section title="EMBEDDING · 埋込">
        <label style={{ display: "block" }}>
          <div className="t-mono" style={{ fontSize: 10, marginBottom: 6 }}>TIER</div>
          <select className="input" value={s.embedding_tier} onChange={(e) => u({ embedding_tier: e.target.value })}>
            <option value="fast">Fast · 256 dims</option>
            <option value="balanced">Balanced · 1536 dims</option>
            <option value="full">Full · 3072 dims</option>
          </select>
        </label>
      </Section>

      <Section title="STORAGE & SECURITY · 保管">
        <Field label="Data Directory" value={s.data_dir} onChange={(v) => u({ data_dir: v })} />
        <Toggle label="Encryption" sub="AES-256-GCM · Requires restart" checked={s.encryption_enabled} onChange={(v) => u({ encryption_enabled: v })} />
      </Section>

      <Section title="CAPTURE · 捕捉">
        <Toggle label="Auto-run Dream Cycle" sub="Daily at 00:00 JST" checked={s.dream_cycle_enabled} onChange={(v) => u({ dream_cycle_enabled: v })} />
      </Section>

      <Section title="DELETE DATA · 削除">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {[
            { key: "last_5min", en: "Last 5 min", ja: "直近5分" },
            { key: "last_15min", en: "Last 15 min", ja: "直近15分" },
            { key: "last_30min", en: "Last 30 min", ja: "直近30分" },
            { key: "last_1h", en: "Last 1 hour", ja: "直近1時間" },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={async () => {
                if (!confirm(lang === "ja" ? `${opt.ja}のデータを削除しますか？` : `Delete data from ${opt.en}?`)) return;
                try { await api.deleteTimelineRange(opt.key); } catch {}
              }}
              className="btn btn-sm btn-secondary"
              style={{ color: "var(--danger)", borderColor: "color-mix(in srgb, var(--danger) 50%, transparent)" }}
            >
              {lang === "ja" ? opt.ja : opt.en}
            </button>
          ))}
        </div>
      </Section>

      <Section title="LANGUAGE · 言語">
        <select className="input" value={s.language} onChange={(e) => u({ language: e.target.value })}>
          <option value="en">English</option>
          <option value="ja">日本語</option>
        </select>
      </Section>

      <button onClick={save} disabled={saving} className="btn btn-primary" style={{ width: "100%", marginTop: 12 }}>
        {saved ? "✓ Saved" : saving ? "Saving..." : lang === "ja" ? "保存" : "Save Settings"}
      </button>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div className="t-mono" style={{ marginBottom: 12 }}>{title}</div>
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type, placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <label style={{ display: "block" }}>
      <div className="t-mono" style={{ fontSize: 10, marginBottom: 6 }}>{label}</div>
      <input className="input" type={type ?? "text"} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Toggle({ label, sub, checked, onChange }: { label: string; sub?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="row" style={{ cursor: "pointer" }} onClick={() => onChange(!checked)}>
      <div className={"switch " + (checked ? "on" : "")} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}
