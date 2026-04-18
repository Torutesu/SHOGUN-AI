import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/tauri";
import { Icon, Kamon } from "../components/Icon";
import { useLang } from "../lib/i18n";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  citations?: { slug: string; title: string; snippet: string }[];
  created_at?: string;
}

export function Chat() {
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [thinkTime, setThinkTime] = useState<number | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [topics, setTopics] = useState<string[]>([]);
  const [mode, setMode] = useState<"empty" | "active">("empty");
  const endRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const lang = useLang();

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setMode("active");
    setMsgs((p) => [...p, { role: "user", content: msg, created_at: new Date().toISOString() }]);
    setInput("");
    setLoading(true);
    const t0 = Date.now();
    try {
      const res = await api.chat(msg, conversationId ?? undefined);
      setThinkTime(Math.round((Date.now() - t0) / 100) / 10);
      if (res.conversation_id) setConversationId(res.conversation_id);
      if (res.topics) setTopics(res.topics);
      setMsgs((p) => [...p, {
        role: "assistant",
        content: res.content ?? String(res ?? "No response"),
        citations: res.citations,
        created_at: new Date().toISOString(),
      }]);
    } catch {
      setMsgs((p) => [...p, { role: "assistant", content: lang === "ja" ? "エラー — Settings で API キーを確認してください" : "Failed — check API keys in Settings." }]);
    }
    setLoading(false);
  };

  const newConversation = () => {
    setMsgs([]);
    setConversationId(null);
    setTopics([]);
    setThinkTime(null);
    setMode("empty");
  };

  const prompts = lang === "ja"
    ? [
        { t: "今日のフォローアップを作成", jp: "追跡" },
        { t: "Mattは価格について何と言った？", jp: "価格" },
        { t: "1on1の前にコーチして", jp: "助言" },
        { t: "今週を5つにまとめて", jp: "要約" },
      ]
    : [
        { t: "Draft follow-ups from today", jp: "追跡" },
        { t: "What did Matt say about pricing?", jp: "価格" },
        { t: "Coach me before the 1:1", jp: "助言" },
        { t: "Summarize week in 5 bullets", jp: "要約" },
      ];

  // entities from citations
  const entities = msgs.flatMap((m) => m.citations ?? []).reduce((acc, c) => {
    if (!acc.find((e) => e.slug === c.slug)) acc.push(c);
    return acc;
  }, [] as { slug: string; title: string; snippet: string }[]);

  // ─── Empty state ──────────────────────────────────
  if (mode === "empty") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: "40px 32px 80px", overflowY: "auto" }}>
        <div style={{ maxWidth: 680, width: "100%", textAlign: "center" }}>
          <div style={{ width: 64, height: 64, margin: "0 auto 20px", borderRadius: "50%", background: "var(--surface)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Kamon size={28} color="var(--gold)" />
          </div>
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em" }}>
            {lang === "ja" ? "何でも聞いてください" : "What's on your mind?"}
            <span className="jp" style={{ fontSize: 20, marginLeft: 12, color: "var(--text-mute)", fontWeight: 300 }}>対話</span>
          </h1>
          <div style={{ marginTop: 10, color: "var(--text-mute)", fontSize: 14 }}>
            {lang === "ja" ? "SHOGUNがメモリを使って回答します" : "SHOGUN reads from your memories to answer you. Ask anything."}
          </div>

          {/* Hero composer */}
          <div className="chat-hero-composer" style={{ marginTop: 36 }}>
            <input
              className="input"
              style={{ border: 0, background: "transparent", padding: "16px 18px", height: "auto", fontSize: 15 }}
              placeholder={lang === "ja" ? "何でも聞いてください · @でメモリ参照" : "Ask anything · reference memory with @"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              autoFocus
            />
            <div className="row" style={{ padding: "6px 14px 14px", gap: 8 }}>
              <button className="btn btn-sm btn-ghost" style={{ padding: "0 8px" }}><Icon name="memory" size={13} />Memory</button>
              <button className="btn btn-sm btn-ghost" style={{ padding: "0 8px" }}><Icon name="agents" size={13} />Agent</button>
              <button className="btn btn-sm btn-ghost" style={{ padding: "0 8px" }}><Icon name="plug" size={13} />Tool</button>
              <button className="btn btn-sm btn-ghost" style={{ padding: "0 6px" }}><Icon name="paperclip" size={13} /></button>
              <span className="spacer" />
              <span className="t-mono" style={{ fontSize: 10, color: "var(--text-mute)" }}>SONNET 4</span>
              <button className="btn btn-sm" style={{ padding: "0 10px", background: "var(--surface-2)", color: "var(--text)" }}><Icon name="mic" size={13} /></button>
              <button onClick={() => send()} disabled={!input.trim()} className="btn btn-sm btn-primary"><Icon name="arrowRight" size={13} /></button>
            </div>
          </div>

          {/* Starters */}
          <div className="row" style={{ gap: 8, marginTop: 18, flexWrap: "wrap", justifyContent: "center" }}>
            {prompts.map((p, i) => (
              <button key={i} onClick={() => send(p.t)} className="btn btn-sm btn-ghost" style={{ fontSize: 12, height: 28, padding: "0 12px", borderRadius: 999, border: "1px dashed var(--border)", color: "var(--text-mute)" }}>
                {p.t}
              </button>
            ))}
          </div>

          {/* Feature cards */}
          <div style={{ marginTop: 48, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, textAlign: "left" }}>
            {[
              { icon: "memory", k: lang === "ja" ? "記憶に基づく回答" : "Grounded in memory", jp: "記憶", d: lang === "ja" ? "回答は常に記憶を引用します" : "Every answer cites the moments it came from." },
              { icon: "shield", k: lang === "ja" ? "ローカルファースト" : "Local first", jp: "守秘", d: lang === "ja" ? "会話はあなたのマシンに保存されます" : "Conversations stay on your machine. Always." },
              { icon: "agents", k: lang === "ja" ? "行動するAI" : "Act, don't just answer", jp: "家臣", d: lang === "ja" ? "会話中にエージェントを起動できます" : "Spawn agents mid-conversation to do the work." },
            ].map((f, i) => (
              <div key={i} className="card" style={{ padding: 14 }}>
                <div className="row" style={{ gap: 8, marginBottom: 6 }}>
                  <Icon name={f.icon} size={13} className="gold" />
                  <span style={{ fontSize: 12, fontWeight: 500 }}>{f.k}</span>
                  <span className="jp dim" style={{ fontSize: 10 }}>{f.jp}</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-mute)", lineHeight: 1.5 }}>{f.d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── Active conversation ──────────────────────────
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", height: "100%" }}>
      {/* Main chat */}
      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Chat header */}
        <div style={{ padding: "14px 32px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn btn-sm btn-ghost" onClick={newConversation} style={{ padding: "0 8px" }}><Icon name="plus" size={13} />New</button>
          <div style={{ width: 1, height: 20, background: "var(--border)" }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>
              {conversationId ? msgs[0]?.content.slice(0, 50) : (lang === "ja" ? "新しい会話" : "New conversation")}
            </div>
            <div className="t-mono" style={{ fontSize: 9, marginTop: 2 }}>SONNET 4 · {msgs.length} MESSAGES</div>
          </div>
          <span className="spacer" />
          {entities.length > 0 && (
            <span className="label label-gold"><span style={{ display: "inline-flex", marginRight: 4 }}><Icon name="memory" size={10} /></span>{entities.length} memories referenced</span>
          )}
          <button className="btn btn-sm btn-ghost"><Icon name="more" size={14} /></button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "32px 32px" }}>
          <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 28 }}>
            {msgs.map((m, i) => (
              <div key={i}>
                {m.role === "user" ? (
                  /* User bubble */
                  <div style={{ alignSelf: "flex-end", maxWidth: "80%", marginLeft: "auto" }}>
                    <div style={{ background: "var(--surface-2)", padding: "14px 18px", borderRadius: "var(--radius-lg) var(--radius-lg) 2px var(--radius-lg)", fontSize: 14, lineHeight: 1.6 }}>
                      {m.content}
                    </div>
                    <div className="t-mono" style={{ fontSize: 10, marginTop: 6, textAlign: "right", color: "var(--text-dim)" }}>
                      {m.created_at ? new Date(m.created_at).toTimeString().slice(0, 5) : ""} · YOU
                    </div>
                  </div>
                ) : (
                  /* Assistant */
                  <div style={{ maxWidth: "90%" }}>
                    {/* Thinking trace */}
                    <div className="row" style={{ marginBottom: 8, gap: 8 }}>
                      <Kamon size={18} color="var(--gold)" />
                      <span style={{ fontSize: 11, color: "var(--gold)", fontWeight: 500, letterSpacing: "0.1em" }}>SHOGUN</span>
                      <span className="jp dim" style={{ fontSize: 11 }}>将</span>
                      {thinkTime && <span className="t-mono" style={{ fontSize: 9, color: "var(--text-dim)" }}>THOUGHT FOR {thinkTime}s</span>}
                    </div>
                    {m.citations && m.citations.length > 0 && (
                      <div className="thinking-trace">
                        <div className="trace-step">
                          <Icon name="memory" size={11} className="gold" />
                          <span>{lang === "ja" ? "メモリを検索" : "Searched memory"}</span>
                          <span className="t-mono dim" style={{ fontSize: 9, marginLeft: "auto" }}>{m.citations.length} HITS</span>
                        </div>
                        <div className="trace-step">
                          <Icon name="filter" size={11} className="gold" />
                          <span>{lang === "ja" ? "直近14日間でフィルタ" : "Filtered to relevant context"}</span>
                        </div>
                      </div>
                    )}

                    {/* Response text */}
                    <div style={{ fontSize: 14.5, lineHeight: 1.75, color: "var(--text)", marginTop: m.citations?.length ? 12 : 0 }}>
                      {m.content}
                    </div>

                    {/* Memory cite chips */}
                    {m.citations && m.citations.length > 0 && (
                      <div className="row" style={{ gap: 6, marginTop: 14, flexWrap: "wrap" }}>
                        {m.citations.map((c, j) => (
                          <div
                            key={j}
                            className="memory-chip"
                            onClick={() => navigate(`/page/${encodeURIComponent(c.slug)}`)}
                          >
                            <Icon name="memory" size={11} className="gold" />
                            <span>{c.title}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Message actions */}
                    <div className="row" style={{ gap: 4, marginTop: 12, color: "var(--text-dim)" }}>
                      <button className="msg-action"><Icon name="check" size={12} /></button>
                      <button className="msg-action"><Icon name="file" size={12} />Copy</button>
                      <button className="msg-action"><Icon name="memory" size={12} />Save</button>
                      <span className="spacer" />
                      <span className="t-mono" style={{ fontSize: 9 }}>
                        {m.created_at ? new Date(m.created_at).toTimeString().slice(0, 5) : ""}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div style={{ maxWidth: "90%" }}>
                <div className="row" style={{ marginBottom: 8, gap: 8 }}>
                  <Kamon size={18} color="var(--gold)" />
                  <span style={{ fontSize: 11, color: "var(--gold)", fontWeight: 500, letterSpacing: "0.1em" }}>SHOGUN</span>
                  <span className="t-mono" style={{ fontSize: 9, color: "var(--text-dim)" }}>WRITING…</span>
                  <span className="streaming-dots"><span /><span /><span /></span>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        </div>

        {/* Composer */}
        <div className="composer-wrap">
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <div className="composer">
              <input
                className="input"
                style={{ border: 0, background: "transparent", padding: "4px 0 12px", height: "auto", fontSize: 14 }}
                placeholder={lang === "ja" ? "返信 · @でメモリ参照" : "Reply · reference memory with @"}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                autoFocus
              />
              <div className="row" style={{ gap: 8 }}>
                <button className="btn btn-sm btn-ghost" style={{ padding: "0 8px" }}><Icon name="memory" size={13} />Memory</button>
                <button className="btn btn-sm btn-ghost" style={{ padding: "0 8px" }}><Icon name="agents" size={13} />Agent</button>
                <button className="btn btn-sm btn-ghost" style={{ padding: "0 8px" }}><Icon name="plug" size={13} />Tool</button>
                <button className="btn btn-sm btn-ghost" style={{ padding: "0 6px" }}><Icon name="paperclip" size={13} /></button>
                <span className="spacer" />
                <span className="t-mono" style={{ fontSize: 10, color: "var(--text-mute)" }}>SONNET 4</span>
                <button className="btn btn-sm" style={{ padding: "0 10px", background: "var(--surface-2)", color: "var(--text)" }}><Icon name="mic" size={13} /></button>
                <button onClick={() => send()} disabled={!input.trim() || loading} className="btn btn-sm btn-primary"><Icon name="arrowRight" size={13} /></button>
              </div>
            </div>
            <div className="t-mono" style={{ fontSize: 9, marginTop: 8, textAlign: "center", color: "var(--text-dim)" }}>
              SHOGUN READS FROM YOUR MEMORIES · LOCAL
              <span className="jp" style={{ marginLeft: 10 }}>記憶より</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right rail — CONTEXT */}
      <div style={{ borderLeft: "1px solid var(--border)", overflowY: "auto", padding: "20px 20px", background: "var(--surface)" }}>
        <div className="row" style={{ marginBottom: 14 }}>
          <span className="t-mono">CONTEXT</span>
          <span className="jp dim" style={{ fontSize: 10, marginLeft: 6 }}>文脈</span>
          <span className="spacer" />
          <button className="btn btn-sm btn-ghost" style={{ padding: "0 4px" }}><Icon name="more" size={12} /></button>
        </div>

        {/* Topics */}
        <div className="ctx-block">
          <div className="ctx-head">TOPICS</div>
          <div className="row" style={{ flexWrap: "wrap", gap: 4 }}>
            {(topics.length > 0 ? topics : ["memory", "shogun"]).map((t) => (
              <span key={t} className="ctx-chip">#{t}</span>
            ))}
          </div>
        </div>

        {/* Entities */}
        <div className="ctx-block">
          <div className="ctx-head">ENTITIES</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {entities.length > 0 ? entities.slice(0, 6).map((e, i) => (
              <div
                key={i}
                className="ctx-entity"
                onClick={() => navigate(`/page/${encodeURIComponent(e.slug)}`)}
              >
                <div className="ctx-entity-avatar">
                  <Icon name={e.slug.startsWith("people/") ? "users" : e.slug.startsWith("concepts/") ? "tag" : "file"} size={10} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{e.title}</div>
                  <div style={{ fontSize: 10, color: "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.snippet.slice(0, 40)}</div>
                </div>
                <Icon name="arrowUpRight" size={10} className="dim" />
              </div>
            )) : (
              <div style={{ fontSize: 11, color: "var(--text-dim)" }}>{lang === "ja" ? "会話するとエンティティが表示されます" : "Entities appear as you chat"}</div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="ctx-block">
          <div className="ctx-head">ACTIONS</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <button className="btn btn-sm btn-secondary" style={{ justifyContent: "flex-start", fontSize: 12 }} onClick={() => navigate("/search")}><Icon name="file" size={12} />Save to Work</button>
            <button className="btn btn-sm btn-secondary" style={{ justifyContent: "flex-start", fontSize: 12 }}><Icon name="calendar" size={12} />Schedule follow-up</button>
            <button className="btn btn-sm btn-secondary" style={{ justifyContent: "flex-start", fontSize: 12 }} onClick={() => navigate("/pipes")}><Icon name="agents" size={12} />Spawn agent</button>
            <button className="btn btn-sm btn-secondary" style={{ justifyContent: "flex-start", fontSize: 12 }}><Icon name="upload" size={12} />Share</button>
          </div>
        </div>

        {/* Token usage */}
        <div className="ctx-block" style={{ marginBottom: 0 }}>
          <div className="ctx-head">TOKEN USAGE</div>
          <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", background: "var(--bg)", border: "1px solid var(--border)" }}>
            <div style={{ width: `${Math.min(100, msgs.length * 8)}%`, background: "var(--gold)" }} />
          </div>
          <div className="row" style={{ marginTop: 6, fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
            <span>{msgs.length * 2100} / 200K</span>
            <span className="spacer" />
            <span>{Math.min(100, msgs.length * 8)}% USED</span>
          </div>
        </div>
      </div>
    </div>
  );
}
