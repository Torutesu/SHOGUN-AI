import { useState, useRef, useEffect } from "react";
import { api } from "../lib/tauri";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  citations?: { slug: string; title: string; snippet: string }[];
}

export function Chat() {
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setMsgs((p) => [...p, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    try {
      const res = await api.chat(text);
      const r = res as { content?: string; citations?: { slug: string; title: string; snippet: string }[] };
      setMsgs((p) => [...p, {
        role: "assistant",
        content: r?.content ?? String(res ?? "No response"),
        citations: r?.citations,
      }]);
    } catch {
      setMsgs((p) => [...p, { role: "assistant", content: "Failed — check API keys in Settings." }]);
    }
    setLoading(false);
  };

  const suggestions = ["今週誰と話した？", "先月の進捗は？", "最近の決定事項は？", "未完了タスクは？"];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <h1 className="text-md font-semibold">Ask Memory</h1>
        <p className="text-xs text-text-disabled mt-0.5">Your memory, searchable by conversation</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {msgs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full space-y-6 text-center">
            <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center">
              <span className="text-gold text-xl">将</span>
            </div>
            <div>
              <p className="text-sm text-text-secondary">Ask anything about your memory</p>
              <p className="text-xs text-text-disabled mt-1">メモリに何でも聞いてください</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 max-w-md">
              {suggestions.map((q) => (
                <button key={q} onClick={() => setInput(q)}
                  className="text-xs px-3 py-1.5 rounded-md bg-surface border border-border-subtle text-text-secondary hover:border-border hover:text-text-primary transition-all">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[75%] rounded-lg px-3.5 py-2.5 text-sm ${
              m.role === "user"
                ? "bg-gold/15 text-text-primary border border-gold-dim"
                : "bg-surface border border-border"
            }`}>
              <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
              {m.citations && m.citations.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border space-y-1">
                  <div className="text-[10px] text-text-disabled uppercase tracking-widest">Sources</div>
                  {m.citations.map((c, j) => (
                    <a key={j} href={`/page/${encodeURIComponent(c.slug)}`}
                      className="block text-xs text-gold hover:text-gold-light transition-colors">
                      {c.title}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-surface border border-border rounded-lg px-4 py-3">
              <div className="flex gap-1.5">
                <span className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-3 border-t border-border">
        <div className="flex gap-2 max-w-2xl mx-auto">
          <input
            className="input flex-1"
            placeholder="Ask your memory..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            autoFocus
          />
          <button onClick={send} disabled={!input.trim() || loading} className="btn-gold">
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
