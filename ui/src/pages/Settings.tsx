import { useEffect, useState } from "react";
import { api, type AppSettings } from "../lib/tauri";

export function Settings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.loadSettings().then(setSettings);
  }, []);

  const update = (patch: Partial<AppSettings>) => {
    if (!settings) return;
    setSettings({ ...settings, ...patch });
    setSaved(false);
  };

  const handleSave = async () => {
    if (!settings) return;
    await api.saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!settings) {
    return <div className="p-8"><p className="text-shogun-muted">Loading...</p></div>;
  }

  return (
    <div className="p-8 max-w-2xl space-y-8">
      <h1 className="text-3xl font-bold">Settings / 設定</h1>

      {/* API Keys */}
      <section className="card space-y-4">
        <h2 className="text-lg font-semibold">API Keys</h2>

        <label className="block">
          <span className="text-sm text-shogun-muted">OpenAI API Key</span>
          <input
            type="password"
            className="input-field mt-1"
            placeholder="sk-..."
            value={settings.openai_api_key ?? ""}
            onChange={(e) => update({ openai_api_key: e.target.value || null })}
          />
        </label>

        <label className="block">
          <span className="text-sm text-shogun-muted">Anthropic API Key</span>
          <input
            type="password"
            className="input-field mt-1"
            placeholder="sk-ant-..."
            value={settings.anthropic_api_key ?? ""}
            onChange={(e) => update({ anthropic_api_key: e.target.value || null })}
          />
        </label>
      </section>

      {/* Embedding */}
      <section className="card space-y-4">
        <h2 className="text-lg font-semibold">Embedding</h2>

        <label className="block">
          <span className="text-sm text-shogun-muted">Embedding Tier / 埋め込み次元</span>
          <select
            className="input-field mt-1"
            value={settings.embedding_tier}
            onChange={(e) => update({ embedding_tier: e.target.value })}
          >
            <option value="fast">Fast (256 dims) — 最速・最安</option>
            <option value="balanced">Balanced (1536 dims) — バランス</option>
            <option value="full">Full (3072 dims) — 最高精度</option>
          </select>
        </label>
      </section>

      {/* Storage & Security */}
      <section className="card space-y-4">
        <h2 className="text-lg font-semibold">Storage & Security</h2>

        <label className="block">
          <span className="text-sm text-shogun-muted">Data Directory / データディレクトリ</span>
          <input
            className="input-field mt-1"
            value={settings.data_dir}
            onChange={(e) => update({ data_dir: e.target.value })}
          />
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.encryption_enabled}
            onChange={(e) => update({ encryption_enabled: e.target.checked })}
            className="w-4 h-4 rounded"
          />
          <div>
            <p className="font-medium">Encryption / 暗号化</p>
            <p className="text-xs text-shogun-muted">AES-256-GCM でフィールドを暗号化</p>
          </div>
        </label>
      </section>

      {/* Dream Cycle */}
      <section className="card space-y-4">
        <h2 className="text-lg font-semibold">Dream Cycle</h2>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.dream_cycle_enabled}
            onChange={(e) => update({ dream_cycle_enabled: e.target.checked })}
            className="w-4 h-4 rounded"
          />
          <div>
            <p className="font-medium">自動実行 / Auto-run</p>
            <p className="text-xs text-shogun-muted">毎日 00:00 JST に Dream Cycle を実行</p>
          </div>
        </label>
      </section>

      {/* Language */}
      <section className="card space-y-4">
        <h2 className="text-lg font-semibold">Language / 言語</h2>
        <select
          className="input-field"
          value={settings.language}
          onChange={(e) => update({ language: e.target.value })}
        >
          <option value="ja">日本語</option>
          <option value="en">English</option>
        </select>
      </section>

      {/* Save */}
      <button onClick={handleSave} className="btn-primary w-full">
        {saved ? "保存しました！ / Saved!" : "保存 / Save Settings"}
      </button>
    </div>
  );
}
