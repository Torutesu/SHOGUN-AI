import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/tauri";

type Step = 1 | 2 | 3 | 4 | 5;

export function Onboarding() {
  const [step, setStep] = useState<Step>(1);
  const navigate = useNavigate();

  const next = () => setStep((s) => Math.min(s + 1, 5) as Step);
  const prev = () => setStep((s) => Math.max(s - 1, 1) as Step);

  return (
    <div className="min-h-screen bg-shogun-navy flex items-center justify-center p-8">
      <div className="w-full max-w-lg">
        {step === 1 && <WelcomeStep onNext={next} />}
        {step === 2 && <ApiKeyStep onNext={next} onBack={prev} />}
        {step === 3 && <FirstMemoryStep onNext={next} onBack={prev} />}
        {step === 4 && <SearchDemoStep onNext={next} onBack={prev} />}
        {step === 5 && <CompleteStep onFinish={() => navigate("/")} />}

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mt-8">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`w-2 h-2 rounded-full transition-colors ${
                s <= step ? "bg-shogun-red" : "bg-white/20"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center space-y-8 animate-fadeIn">
      <div className="text-6xl">&#x1F3EF;</div>
      <h1 className="text-4xl font-bold text-shogun-red">SHOGUN</h1>
      <p className="text-xl text-shogun-muted">
        Your AI remembers everything
      </p>
      <p className="text-shogun-muted">
        あなたのAIが、すべてを覚える
      </p>
      <button onClick={onNext} className="btn-primary text-lg px-8 py-4">
        はじめる / Get Started
      </button>
      <div className="flex items-center justify-center gap-2 text-xs text-shogun-muted">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        全データはあなたのマシンに保存されます
      </div>
    </div>
  );
}

function ApiKeyStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [openaiKey, setOpenaiKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [showAnthropic, setShowAnthropic] = useState(false);
  const [skip, setSkip] = useState(false);

  const handleNext = async () => {
    try {
      if (!skip && openaiKey) {
        const settings = await api.loadSettings();
        await api.saveSettings({
          ...settings,
          openai_api_key: openaiKey || null,
          anthropic_api_key: anthropicKey || null,
      });
      }
    } catch {
      // Continue even if save fails — keys can be set later in Settings
    }
    onNext();
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <button onClick={onBack} className="text-shogun-muted hover:text-white text-sm">
        ← Back
      </button>
      <h2 className="text-2xl font-bold">APIキーを設定 / Set Up API Keys</h2>

      <div className="card space-y-4">
        <label className="block">
          <span className="text-sm text-shogun-muted">OpenAI API Key（ベクトル検索用）</span>
          <input
            type="password"
            className="input-field mt-1"
            placeholder="sk-..."
            value={openaiKey}
            onChange={(e) => { setOpenaiKey(e.target.value); setSkip(false); }}
          />
        </label>
        <a
          href="https://platform.openai.com/api-keys"
          target="_blank"
          rel="noreferrer"
          className="text-xs text-shogun-red hover:underline"
        >
          OpenAI でAPIキーを取得 →
        </a>
      </div>

      {!showAnthropic ? (
        <button
          onClick={() => setShowAnthropic(true)}
          className="text-sm text-shogun-muted hover:text-white"
        >
          ▼ Anthropic APIキーも追加（オプション）
        </button>
      ) : (
        <div className="card space-y-4">
          <label className="block">
            <span className="text-sm text-shogun-muted">Anthropic API Key（オプション）</span>
            <input
              type="password"
              className="input-field mt-1"
              placeholder="sk-ant-..."
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
            />
          </label>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-shogun-muted cursor-pointer">
        <input
          type="checkbox"
          checked={skip}
          onChange={(e) => setSkip(e.target.checked)}
          className="rounded"
        />
        スキップ（キーワード検索のみで開始）
      </label>

      <div className="flex items-center gap-2 text-xs text-shogun-muted">
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        キーはローカルにのみ保存され、SHOGUNサーバーには送信されません
      </div>

      <button onClick={handleNext} className="btn-primary w-full">
        次へ / Next →
      </button>
    </div>
  );
}

function FirstMemoryStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);

  const slug = name
    ? `people/${name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}`
    : "people/...";

  const handleCreate = async () => {
    if (!name) return;
    setCreating(true);
    try {
      await api.putPage({
        slug: slug,
        title: name,
        page_type: "person",
        compiled_truth: description || `${name}`,
        tags: [],
      });
      setCreated(true);
    } catch {
      // Continue anyway
      setCreated(true);
    }
    setCreating(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <button onClick={onBack} className="text-shogun-muted hover:text-white text-sm">
        ← Back
      </button>
      <h2 className="text-2xl font-bold">最初のメモリを作ろう / Create Your First Memory</h2>

      <div className="space-y-4">
        <label className="block">
          <span className="text-sm text-shogun-muted">あなたの名前 / Your Name</span>
          <input
            className="input-field mt-1"
            placeholder="Toru Yamamoto"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <label className="block">
          <span className="text-sm text-shogun-muted">何をしている？ / What do you do?</span>
          <textarea
            className="input-field mt-1 h-24 resize-none"
            placeholder="SHOGUNを開発中。AIメモリの未来を作っています。"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
      </div>

      {/* Preview */}
      <div className="card font-mono text-sm space-y-1">
        <p className="text-shogun-muted text-xs mb-2">Preview: {slug}</p>
        <p className="text-shogun-muted">---</p>
        <p>type: person</p>
        <p>title: {name || "..."}</p>
        <p className="text-shogun-muted">---</p>
        <p className="mt-2">{description || "..."}</p>
      </div>

      {created ? (
        <div className="text-center space-y-4">
          <div className="text-4xl">&#x2705;</div>
          <p className="text-shogun-red font-semibold">作成完了！ / Created!</p>
          <button onClick={onNext} className="btn-primary w-full">
            次へ / Next →
          </button>
        </div>
      ) : (
        <button
          onClick={handleCreate}
          disabled={!name || creating}
          className="btn-primary w-full disabled:opacity-50"
        >
          {creating ? "作成中..." : "作成する / Create Page →"}
        </button>
      )}
    </div>
  );
}

function SearchDemoStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ slug: string; title: string; score: number }[]>([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query) return;
    try {
      const res = await api.searchMemory(query, 5);
      setResults(res.map((r) => ({ slug: r.slug, title: r.title, score: r.score })));
    } catch {
      setResults([]);
    }
    setSearched(true);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <button onClick={onBack} className="text-shogun-muted hover:text-white text-sm">
        ← Back
      </button>
      <h2 className="text-2xl font-bold">検索してみよう / Try a Search</h2>

      <div className="flex gap-2">
        <input
          className="input-field"
          placeholder="検索ワードを入力..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <button onClick={handleSearch} className="btn-primary shrink-0">
          検索
        </button>
      </div>

      {searched && (
        <div className="space-y-2">
          {results.length > 0 ? (
            results.map((r) => (
              <div key={r.slug} className="card flex items-center justify-between">
                <div>
                  <p className="font-semibold">{r.title}</p>
                  <p className="text-xs text-shogun-muted">{r.slug}</p>
                </div>
                <span className="text-xs text-shogun-red">
                  {(r.score * 100).toFixed(0)}%
                </span>
              </div>
            ))
          ) : (
            <p className="text-shogun-muted text-center py-4">
              No results — this is expected if running outside Tauri.
            </p>
          )}
        </div>
      )}

      <div className="text-center">
        <p className="text-shogun-muted text-sm mb-4">
          AIがあなたの情報を記憶し、いつでも検索できます
        </p>
        <button onClick={onNext} className="btn-primary w-full">
          次へ / Next →
        </button>
      </div>
    </div>
  );
}

function CompleteStep({ onFinish }: { onFinish: () => void }) {
  const handleFinish = async () => {
    try {
      const settings = await api.loadSettings();
      await api.saveSettings({ ...settings, onboarding_completed: true });
    } catch {
      // Continue anyway
    }
    onFinish();
  };

  return (
    <div className="text-center space-y-8 animate-fadeIn">
      <div className="text-6xl">&#x1F389;</div>
      <h2 className="text-3xl font-bold">セットアップ完了！</h2>
      <p className="text-shogun-muted">Setup Complete!</p>

      <div className="card text-left space-y-3">
        <h3 className="font-semibold text-shogun-red">Your Brain</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <span className="text-shogun-muted">Search:</span>
          <span className="text-green-400">Ready</span>
          <span className="text-shogun-muted">Dream Cycle:</span>
          <span className="text-yellow-400">Not configured</span>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm text-shogun-muted">次のステップ / Next Steps:</p>
        <div className="space-y-2 text-left">
          <button
            onClick={handleFinish}
            className="card-interactive flex items-center gap-3 w-full text-left"
          >
            <span>&#x1F9E0;</span>
            <div>
              <p className="font-medium">メモリに聞く / Ask Memory</p>
              <p className="text-xs text-shogun-muted">AIとチャットしてメモリを活用</p>
            </div>
          </button>
          <button
            onClick={handleFinish}
            className="card-interactive flex items-center gap-3 w-full text-left"
          >
            <span>&#x1F319;</span>
            <div>
              <p className="font-medium">Dream Cycleを設定</p>
              <p className="text-xs text-shogun-muted">Configure Dream Cycle</p>
            </div>
          </button>
        </div>
      </div>

      <button onClick={handleFinish} className="btn-primary w-full text-lg py-4">
        SHOGUNを使い始める →
      </button>
    </div>
  );
}
