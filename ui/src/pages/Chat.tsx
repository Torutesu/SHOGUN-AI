import { useState, useRef, useEffect } from "react";
import { api } from "../lib/tauri";
import { Icon, Kamon } from "../components/Icon";
import { useLang } from "../lib/i18n";

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
  const lang = useLang();

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setMsgs((p) => [...p, { role: "user", content: msg }]);
    setInput("");
    setLoading(true);
    try {
      const res = await api.chat(msg);
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

  const suggestions = lang === "ja"
    ? ["今週誰と話した？", "先月の進捗は？", "最近の決定事項は？", "未完了タスクは？"]
    : ["Who did I meet this week?", "Last month's progress?", "Recent decisions?", "Open tasks?"];

  return (
    <div className="content-inner wide" style={{ padding: 0, height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "24px 40px 20px", borderBottom: "1px solid var(--border)" }}>
        <div className="t-mono" style={{ marginBottom: 6 }}>CHAT · 対話</div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 500 }}>
          Ask your memory <span className="jp muted" style={{ fontSize: 14, fontWeight: 300, marginLeft: 8 }}>記憶に問う</span>
        </h1>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 40px" }}>
        {msgs.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 28, textAlign: "center" }}>
            <Kamon size={48} color="var(--gold)" />
            <div>
              <div style={{ fontSize: 22, fontWeight: 500, marginBottom: 6 }}>Your memory, on demand.</div>
              <div style={{ color: "var(--text-mute)", fontSize: 14 }}>
                SHOGUN remembers everything you do. Ask anything.
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10, maxWidth: 520 }}>
              {suggestions.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="btn btn-sm btn-secondary"
                  style={{ fontSize: 13 }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "85%",
                  borderRadius: 12,
                  padding: "12px 16px",
                  fontSize: 14,
                  lineHeight: 1.65,
                  background: m.role === "user" ? "var(--surface-2)" : "var(--surface)",
                  border: m.role === "user" ? "1px solid var(--border)" : "1px solid var(--border)",
                }}>
                  {m.role === "assistant" && (
                    <div className="row" style={{ gap: 6, marginBottom: 8 }}>
                      <Kamon size={14} color="var(--gold)" />
                      <span className="t-mono" style={{ fontSize: 10, color: "var(--gold)" }}>SHOGUN</span>
                    </div>
                  )}
                  <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
                  {m.citations && m.citations.length > 0 && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                      <div className="t-mono" style={{ fontSize: 9, marginBottom: 6 }}>SOURCES · 出典</div>
                      {m.citations.map((c, j) => (
                        <a
                          key={j}
                          href={`/page/${encodeURIComponent(c.slug)}`}
                          style={{ display: "block", fontSize: 12, color: "var(--gold)", textDecoration: "none", marginBottom: 2 }}
                        >
                          → {c.title}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex" }}>
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 16px" }}>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[0, 150, 300].map((d) => (
                      <span key={d} style={{
                        width: 6, height: 6, borderRadius: "50%",
                        background: "var(--gold)",
                        animation: "chatPulse 1.2s infinite",
                        animationDelay: `${d}ms`,
                      }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ padding: "16px 40px 24px", borderTop: "1px solid var(--border)" }}>
        <div className="row" style={{ gap: 10, maxWidth: 760, margin: "0 auto" }}>
          <div className="row" style={{ flex: 1, height: 48, padding: "0 16px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", gap: 10 }}>
            <Icon name="paperclip" size={15} className="dim" />
            <input
              className="input"
              style={{ border: 0, background: "transparent", padding: 0, height: "auto", flex: 1 }}
              placeholder={lang === "ja" ? "メモリに質問..." : "Ask your memory..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              autoFocus
            />
            <Icon name="mic" size={15} className="dim" />
          </div>
          <button onClick={() => send()} disabled={!input.trim() || loading} className="btn btn-primary">
            <Icon name="arrowRight" size={14} /> Send
          </button>
        </div>
      </div>

      <style>{`
        @keyframes chatPulse {
          0%, 60%, 100% { opacity: 0.3; }
          30% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
