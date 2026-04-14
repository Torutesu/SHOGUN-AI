import { useState, useRef, useEffect } from "react";
import { api } from "../lib/tauri";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  citations?: { slug: string; title: string; snippet: string }[];
  timestamp: Date;
}

export function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const response = await api.chat(text);
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: typeof response === "string" ? response : (response as any)?.content ?? "No response",
        citations: (response as any)?.citations,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "Sorry, I couldn't process that request. Check your LLM API key in Settings.",
        timestamp: new Date(),
      }]);
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <h1 className="text-2xl font-bold">Ask Your Memory</h1>
        <p className="text-sm text-shogun-muted mt-1">
          メモリに聞く — AIが記憶を検索して回答します
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && (
          <div className="text-center py-20 space-y-4">
            <div className="text-5xl">&#x1F9E0;</div>
            <h2 className="text-xl font-semibold text-shogun-muted">
              何でも聞いてください
            </h2>
            <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
              {[
                "今週誰と話した？",
                "先月のプロジェクト進捗は？",
                "Toruさんについて教えて",
                "最近の会議で決まったことは？",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => { setInput(q); }}
                  className="text-sm px-3 py-2 rounded-lg bg-white/5 text-shogun-muted hover:bg-white/10 hover:text-white transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-shogun-red text-white"
                  : "bg-shogun-navy-light border border-white/10"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>

              {/* Citations */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/10 space-y-1">
                  <p className="text-xs text-shogun-muted font-semibold">Sources:</p>
                  {msg.citations.map((c, j) => (
                    <a
                      key={j}
                      href={`/page/${encodeURIComponent(c.slug)}`}
                      className="block text-xs text-shogun-red hover:underline"
                    >
                      {c.title} — {c.snippet.slice(0, 80)}...
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-shogun-navy-light border border-white/10 rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-shogun-muted rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-shogun-muted rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-shogun-muted rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/10">
        <div className="flex gap-3 max-w-3xl mx-auto">
          <input
            className="input-field flex-1"
            placeholder="メモリに質問... / Ask your memory..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            autoFocus
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="btn-primary px-6 disabled:opacity-50"
          >
            送信
          </button>
        </div>
      </div>
    </div>
  );
}
