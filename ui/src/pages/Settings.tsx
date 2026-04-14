import { useEffect, useState } from "react";
import { api, type AppSettings } from "../lib/tauri";
import { useLang, t } from "../lib/i18n";

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

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-5 h-5 border-2 border-gold border-t-transparent rounded-full animate-spin" /></div>;
  if (!s) return <div className="p-6 text-status-error text-sm">{error ?? "Failed"}</div>;

  return (
    <div className="p-6 max-w-[560px] mx-auto space-y-5 animate-in">
      <h1 className="text-md font-semibold">{t("settings.title", lang)}</h1>
      {error && <div className="bg-status-error/10 border border-status-error/20 rounded-md px-3 py-2 text-xs text-status-error animate-down">{error}</div>}

      <Sec title={t("settings.apikeys", lang)}>
        <Field label="OpenAI" type="password" placeholder="sk-..." value={s.openai_api_key ?? ""} onChange={(v) => u({ openai_api_key: v || null })} />
        <Field label="Anthropic" type="password" placeholder="sk-ant-..." value={s.anthropic_api_key ?? ""} onChange={(v) => u({ anthropic_api_key: v || null })} />
      </Sec>

      <Sec title={t("settings.embedding", lang)}>
        <label className="block">
          <span className="text-xs text-text-secondary">{t("settings.tier", lang)}</span>
          <select className="input mt-1" value={s.embedding_tier} onChange={(e) => u({ embedding_tier: e.target.value })}>
            <option value="fast">{t("settings.tier.fast", lang)}</option>
            <option value="balanced">{t("settings.tier.balanced", lang)}</option>
            <option value="full">{t("settings.tier.full", lang)}</option>
          </select>
        </label>
      </Sec>

      <Sec title={t("settings.storage", lang)}>
        <Field label={t("settings.datadir", lang)} value={s.data_dir} onChange={(v) => u({ data_dir: v })} />
        <Toggle label={t("settings.encryption", lang)} sub={t("settings.encryption.sub", lang)} checked={s.encryption_enabled} onChange={(v) => u({ encryption_enabled: v })} />
      </Sec>

      <Sec title={t("settings.capture", lang)}>
        <Toggle label={t("settings.dreamcycle", lang)} sub={t("settings.dreamcycle.sub", lang)} checked={s.dream_cycle_enabled} onChange={(v) => u({ dream_cycle_enabled: v })} />
      </Sec>

      <Sec title={t("settings.language", lang)}>
        <select className="input" value={s.language} onChange={(e) => u({ language: e.target.value })}>
          <option value="ja">日本語</option>
          <option value="en">English</option>
        </select>
      </Sec>

      <button onClick={save} disabled={saving} className="btn-gold w-full">
        {saved ? t("settings.saved", lang) : saving ? t("settings.saving", lang) : t("settings.save", lang)}
      </button>
    </div>
  );
}

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="card space-y-3"><div className="section-label">{title}</div>{children}</div>;
}

function Field({ label, value, onChange, type, placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return <label className="block"><span className="text-xs text-text-secondary">{label}</span><input className="input mt-1" type={type ?? "text"} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} /></label>;
}

function Toggle({ label, sub, checked, onChange }: { label: string; sub?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" className="flex items-center gap-3 w-full text-left" onClick={() => onChange(!checked)}>
      <div className={`w-8 h-[18px] rounded-full relative transition-colors shrink-0 ${checked ? "bg-gold" : "bg-border"}`}>
        <div className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white transition-transform ${checked ? "translate-x-[16px]" : "translate-x-[2px]"}`} />
      </div>
      <div>
        <div className="text-sm font-medium">{label}</div>
        {sub && <div className="text-[11px] text-text-disabled">{sub}</div>}
      </div>
    </button>
  );
}
