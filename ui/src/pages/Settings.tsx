import { useEffect, useState } from "react";
import { api, type AppSettings } from "../lib/tauri";
import { useLang, t } from "../lib/i18n";

export function Settings() {
  const [s, setS] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-5 h-5 border-2 border-gold border-t-transparent rounded-full animate-spin" /></div>;
  const lang = useLang();

  if (!s) return <div className="p-6 text-status-error text-sm">{error ?? "Failed to load"}</div>;

  return (
    <div className="p-6 max-w-[560px] mx-auto space-y-5 animate-in">
      <h1 className="text-md font-semibold">{t("settings.title", lang)}</h1>

      {error && <div className="bg-status-error/10 border border-status-error/20 rounded-md px-3 py-2 text-xs text-status-error">{error}</div>}

      <Section title="API Keys">
        <Field label="OpenAI" type="password" placeholder="sk-..." value={s.openai_api_key ?? ""} onChange={(v) => u({ openai_api_key: v || null })} />
        <Field label="Anthropic" type="password" placeholder="sk-ant-..." value={s.anthropic_api_key ?? ""} onChange={(v) => u({ anthropic_api_key: v || null })} />
      </Section>

      <Section title="Embedding">
        <label className="block">
          <span className="text-xs text-text-secondary">Tier</span>
          <select className="input mt-1" value={s.embedding_tier} onChange={(e) => u({ embedding_tier: e.target.value })}>
            <option value="fast">Fast (256 dims)</option>
            <option value="balanced">Balanced (1536 dims)</option>
            <option value="full">Full (3072 dims)</option>
          </select>
        </label>
      </Section>

      <Section title="Storage & Security">
        <Field label="Data Directory" value={s.data_dir} onChange={(v) => u({ data_dir: v })} />
        <Toggle label="Encryption" sub="AES-256-GCM · Requires restart" checked={s.encryption_enabled} onChange={(v) => u({ encryption_enabled: v })} />
      </Section>

      <Section title="Capture">
        <Toggle label="Dream Cycle" sub="Auto-run at 00:00 JST" checked={s.dream_cycle_enabled} onChange={(v) => u({ dream_cycle_enabled: v })} />
      </Section>

      <Section title="Language">
        <select className="input" value={s.language} onChange={(e) => u({ language: e.target.value })}>
          <option value="ja">日本語</option>
          <option value="en">English</option>
        </select>
      </Section>

      <button onClick={save} disabled={saving} className="btn-gold w-full">
        {saved ? t("settings.saved", lang) : saving ? t("settings.saving", lang) : t("settings.save", lang)}
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card space-y-3">
      <div className="text-[10px] text-text-disabled uppercase tracking-widest">{title}</div>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, type, placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-xs text-text-secondary">{label}</span>
      <input className="input mt-1" type={type ?? "text"} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Toggle({ label, sub, checked, onChange }: { label: string; sub?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div className={`w-8 h-[18px] rounded-full relative transition-colors ${checked ? "bg-gold" : "bg-border"}`} onClick={() => onChange(!checked)}>
        <div className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white transition-transform ${checked ? "translate-x-[16px]" : "translate-x-[2px]"}`} />
      </div>
      <div>
        <div className="text-sm font-medium">{label}</div>
        {sub && <div className="text-[11px] text-text-disabled">{sub}</div>}
      </div>
    </label>
  );
}
