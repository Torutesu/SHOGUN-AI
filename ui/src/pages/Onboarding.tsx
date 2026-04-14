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
    <div className="min-h-screen bg-base flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        {step === 1 && <Welcome onNext={next} />}
        {step === 2 && <ApiKeys onNext={next} onBack={prev} />}
        {step === 3 && <FirstMemory onNext={next} onBack={prev} />}
        {step === 4 && <SearchDemo onNext={next} onBack={prev} />}
        {step === 5 && <Complete onFinish={() => navigate("/")} />}
        <div className="flex justify-center gap-1.5 mt-6">
          {[1,2,3,4,5].map((s) => (
            <div key={s} className={`w-1.5 h-1.5 rounded-full transition-colors ${s <= step ? "bg-gold" : "bg-border"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Welcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center space-y-6 animate-in">
      <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center mx-auto">
        <span className="text-gold text-2xl font-semibold">将</span>
      </div>
      <div>
        <h1 className="text-xl font-semibold">SHOGUN</h1>
        <p className="text-sm text-text-secondary mt-1">The AI that remembers everything you do</p>
      </div>
      <button onClick={onNext} className="btn-gold w-full">Get Started</button>
      <div className="flex items-center justify-center gap-1.5 text-[11px] text-text-disabled">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        All data stays on your device
      </div>
    </div>
  );
}

function ApiKeys({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [openai, setOpenai] = useState("");
  const [skip, setSkip] = useState(false);

  const handleNext = async () => {
    try {
      if (!skip && openai) {
        const s = await api.loadSettings();
        await api.saveSettings({ ...s, openai_api_key: openai || null });
      }
    } catch {}
    onNext();
  };

  return (
    <div className="space-y-5 animate-in">
      <button onClick={onBack} className="text-xs text-text-disabled hover:text-text-secondary">← Back</button>
      <h2 className="text-md font-semibold">API Keys</h2>
      <div className="card space-y-3">
        <label className="block">
          <span className="text-xs text-text-secondary">OpenAI API Key</span>
          <input className="input mt-1" type="password" placeholder="sk-..." value={openai} onChange={(e) => { setOpenai(e.target.value); setSkip(false); }} />
        </label>
        <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-[11px] text-gold hover:text-gold-light">Get an API key →</a>
      </div>
      <label className="flex items-center gap-2 text-xs text-text-disabled cursor-pointer">
        <input type="checkbox" checked={skip} onChange={(e) => setSkip(e.target.checked)} className="rounded" />
        Skip — keyword search only
      </label>
      <p className="text-[11px] text-text-disabled">Keys are stored locally, never sent to SHOGUN servers.</p>
      <button onClick={handleNext} className="btn-gold w-full">Next</button>
    </div>
  );
}

function FirstMemory({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [done, setDone] = useState(false);

  const slug = name ? `people/${name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}` : "people/...";

  const create = async () => {
    if (!name) return;
    setCreating(true);
    try { await api.putPage({ slug, title: name, page_type: "person", compiled_truth: desc || name, tags: [] }); setDone(true); } catch { setDone(true); }
    setCreating(false);
  };

  return (
    <div className="space-y-5 animate-in">
      <button onClick={onBack} className="text-xs text-text-disabled hover:text-text-secondary">← Back</button>
      <h2 className="text-md font-semibold">Create your first memory</h2>
      <div className="space-y-3">
        <label className="block">
          <span className="text-xs text-text-secondary">Your name</span>
          <input className="input mt-1" placeholder="Toru Yamamoto" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-xs text-text-secondary">What do you do?</span>
          <textarea className="input mt-1 h-20 resize-none" placeholder="Building SHOGUN..." value={desc} onChange={(e) => setDesc(e.target.value)} />
        </label>
      </div>
      <div className="card font-mono text-[11px] text-text-secondary">
        <span className="text-text-disabled">{slug}</span>
      </div>
      {done ? (
        <div className="text-center space-y-3">
          <div className="text-status-active text-sm font-medium">✓ Created</div>
          <button onClick={onNext} className="btn-gold w-full">Next</button>
        </div>
      ) : (
        <button onClick={create} disabled={!name || creating} className="btn-gold w-full">
          {creating ? "Creating..." : "Create Page"}
        </button>
      )}
    </div>
  );
}

function SearchDemo({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ slug: string; title: string }[]>([]);
  const [searched, setSearched] = useState(false);

  const search = async () => {
    if (!query) return;
    try { const r = await api.searchMemory(query, 5); setResults(r.map((x) => ({ slug: x.slug, title: x.title }))); } catch { setResults([]); }
    setSearched(true);
  };

  return (
    <div className="space-y-5 animate-in">
      <button onClick={onBack} className="text-xs text-text-disabled hover:text-text-secondary">← Back</button>
      <h2 className="text-md font-semibold">Try a search</h2>
      <div className="flex gap-2">
        <input className="input flex-1" placeholder="Search..." value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} />
        <button onClick={search} className="btn-gold">Search</button>
      </div>
      {searched && (
        <div className="space-y-1.5">
          {results.length > 0 ? results.map((r) => (
            <div key={r.slug} className="card text-sm">{r.title}</div>
          )) : <p className="text-xs text-text-disabled text-center py-3">No results yet</p>}
        </div>
      )}
      <button onClick={onNext} className="btn-gold w-full">Next</button>
    </div>
  );
}

function Complete({ onFinish }: { onFinish: () => void }) {
  const finish = async () => {
    try { const s = await api.loadSettings(); await api.saveSettings({ ...s, onboarding_completed: true }); } catch {}
    onFinish();
  };

  return (
    <div className="text-center space-y-6 animate-in">
      <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center mx-auto">
        <span className="text-gold text-2xl">✓</span>
      </div>
      <div>
        <h2 className="text-xl font-semibold">Ready</h2>
        <p className="text-sm text-text-secondary mt-1">SHOGUN is set up and running</p>
      </div>
      <button onClick={finish} className="btn-gold w-full">Start using SHOGUN</button>
    </div>
  );
}
