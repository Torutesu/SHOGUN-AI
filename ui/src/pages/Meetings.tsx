import { Icon, Kamon } from "../components/Icon";
import { useLang } from "../lib/i18n";

const tagColor = (tag: string) => ({ DECISION: "var(--gold)", RESEARCH: "var(--text)", REVIEW: "var(--text-mute)", THINKING: "var(--text-dim)", NETWORK: "var(--text-mute)", PLAN: "var(--text)" }[tag] || "var(--text-dim)");

export function Meetings() {
  const lang = useLang();
  const recipes = [
    { label: "Write weekly recap", jp: "週報" },
    { label: "Coach me: Matt 1:1", jp: "対話" },
    { label: "List open decisions", jp: "決定" },
    { label: "Draft follow-ups", jp: "追跡" },
  ];
  const yesterday = [
    { t: "Revenue-cat · CTO sync", a: "with Matt, Sara", time: "15:18", tag: "DECISION", att: 3 },
    { t: "Speak AI · 100 users interview synthesis", a: "Toru team", time: "14:00", tag: "RESEARCH", att: 1 },
    { t: "JungleX board prep", a: "Matt, Hiro", time: "11:37", tag: "REVIEW", att: 5 },
    { t: "Pronunciation angles — open loops", a: "solo", time: "10:49", tag: "THINKING" },
    { t: "ElevenLabs · contract review", a: "Legal team", time: "10:21", tag: "REVIEW" },
    { t: "Revenue-cat · CTO intro", a: "with Jacob", time: "09:58", tag: "NETWORK" },
  ];
  const older: { day: string; jp: string; items: { t: string; a: string; time: string; tag: string; att?: number; duration?: string }[] }[] = [
    { day: "Apr 16", jp: "木", items: [{ t: "AI Engine dev · Revenue management", a: "Eng team", time: "13:58", tag: "PLAN", att: 4 }] },
    { day: "Apr 15", jp: "水", items: [{ t: "AI tools & future of work — exploration", a: "solo · voice memo", time: "09:18", tag: "THINKING", duration: "22min" }] },
    { day: "Apr 14", jp: "火", items: [{ t: "Group memo · SHOGUN direction", a: "Toru, Matt, Sara", time: "17:00", tag: "DECISION", att: 3 }] },
  ];

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "48px 40px 80px" }}>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 52, height: 52, borderRadius: "50%", background: "var(--surface)", border: "1px solid var(--border)", marginBottom: 18, position: "relative" }}>
          <Icon name="calendar" size={20} className="gold" />
          <span style={{ position: "absolute", bottom: -2, right: -2, width: 16, height: 16, borderRadius: "50%", background: "var(--bg)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="shield" size={9} />
          </span>
        </div>
        <h1 style={{ margin: 0, fontSize: 34, fontWeight: 600, letterSpacing: "-0.02em" }}>
          Meetings <span className="jp" style={{ fontSize: 22, fontWeight: 300, marginLeft: 10, color: "var(--text-mute)" }}>会議</span>
        </h1>
        <div style={{ marginTop: 8, color: "var(--text-mute)", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Icon name="shield" size={11} />
          <span>{lang === "ja" ? "プライベートな会議メモと録音" : "Your private meeting notes and recordings"}</span>
        </div>
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border-hi)", borderRadius: "var(--radius-lg)", padding: "14px 18px", marginBottom: 18 }}>
        <div className="row" style={{ marginBottom: 10 }}>
          <button className="btn btn-sm btn-ghost" style={{ padding: "0 8px", height: 26, fontSize: 11, background: "var(--surface-2)" }}>
            <Icon name="shield" size={11} />All meetings <Icon name="chevronDown" size={10} />
          </button>
          <span className="spacer" />
          <span className="label label-gold">
            <span style={{ display: "inline-flex", marginRight: 4 }}><Kamon size={9} color="var(--gold)" /></span>
            SHOGUN LISTENING
          </span>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <div style={{ flex: 1, fontSize: 14, color: "var(--text-dim)", padding: "6px 0" }}>{lang === "ja" ? "142件の会議から質問..." : "Ask anything across 142 meetings…"}</div>
          <span className="t-mono" style={{ fontSize: 10, color: "var(--text-mute)" }}>AUTO</span>
          <button className="btn btn-sm btn-ghost" style={{ padding: "0 6px" }}><Icon name="paperclip" size={13} /></button>
          <button className="btn btn-sm" style={{ padding: "0 10px", background: "var(--gold)", color: "#151212", borderColor: "var(--gold)" }}><Icon name="mic" size={13} /></button>
        </div>
      </div>

      <div className="row" style={{ gap: 8, marginBottom: 40, flexWrap: "wrap" }}>
        {recipes.map((r, i) => (
          <button key={i} className="btn btn-sm btn-ghost" style={{ fontSize: 11, height: 26, padding: "0 10px", borderRadius: 999, border: "1px dashed var(--border)", color: "var(--text-mute)" }}>
            <Icon name="check" size={10} />
            <span className="en-only">{r.label}</span>
            <span className="jp" style={{ fontSize: 10, marginLeft: 4 }}>{r.jp}</span>
          </button>
        ))}
      </div>

      <div style={{ height: 1, background: "var(--border)", marginBottom: 28, position: "relative" }}>
        <span className="jp" style={{ position: "absolute", left: "50%", top: -7, transform: "translateX(-50%)", padding: "0 10px", background: "var(--bg)", fontSize: 11, color: "var(--text-dim)" }}>記録</span>
      </div>

      <div style={{ marginBottom: 36 }}>
        <div className="row" style={{ marginBottom: 16, gap: 14 }}>
          <span className="t-mono" style={{ color: "var(--text-mute)" }}>YESTERDAY</span>
          <span className="jp dim" style={{ fontSize: 11 }}>昨日</span>
          <span style={{ height: 1, flex: 1, background: "var(--border)" }} />
          <span className="t-mono" style={{ fontSize: 10, color: "var(--text-dim)" }}>6 ITEMS · 2H 14M</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {yesterday.map((n, i) => (
            <div key={i} className="mtg-row">
              <div className="mtg-icon"><Icon name="note" size={14} /></div>
              <div className="mtg-body">
                <div className="row" style={{ gap: 8 }}>
                  <span className="mtg-title">{n.t}</span>
                  <span className="mtg-tag" style={{ color: tagColor(n.tag), borderColor: `color-mix(in srgb, ${tagColor(n.tag)} 30%, var(--border))` }}>{n.tag}</span>
                </div>
                <div className="row" style={{ gap: 10, marginTop: 3 }}>
                  <span className="mtg-meta">{n.a}</span>
                  {n.att && <span className="mtg-meta"><Icon name="users" size={10} />{n.att}</span>}
                </div>
              </div>
              <div className="mtg-right"><span className="t-mono mtg-time">{n.time}</span></div>
            </div>
          ))}
        </div>
      </div>

      {older.map((g, gi) => (
        <div key={gi} style={{ marginBottom: 28 }}>
          <div className="row" style={{ marginBottom: 14, gap: 14 }}>
            <span className="t-mono" style={{ color: "var(--text-mute)" }}>{g.day.toUpperCase()}</span>
            <span className="jp dim" style={{ fontSize: 11 }}>{g.jp}</span>
            <span style={{ height: 1, flex: 1, background: "var(--border)" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {g.items.map((n, i) => (
              <div key={i} className="mtg-row">
                <div className="mtg-icon"><Icon name="note" size={14} /></div>
                <div className="mtg-body">
                  <div className="row" style={{ gap: 8 }}>
                    <span className="mtg-title">{n.t}</span>
                    <span className="mtg-tag" style={{ color: tagColor(n.tag), borderColor: `color-mix(in srgb, ${tagColor(n.tag)} 30%, var(--border))` }}>{n.tag}</span>
                  </div>
                  <div className="row" style={{ gap: 10, marginTop: 3 }}>
                    <span className="mtg-meta">{n.a}</span>
                    {n.att && <span className="mtg-meta"><Icon name="users" size={10} />{n.att}</span>}
                    {n.duration && <span className="mtg-meta"><Icon name="clock" size={10} />{n.duration}</span>}
                  </div>
                </div>
                <div className="mtg-right"><span className="t-mono mtg-time">{n.time}</span></div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div style={{ marginTop: 48, padding: "18px 0", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12, color: "var(--text-dim)" }}>
        <Kamon size={14} color="var(--gold)" />
        <span className="t-mono" style={{ fontSize: 10 }}>142 MEETINGS IN MEMORY · LOCAL</span>
        <span className="spacer" />
        <span className="jp" style={{ fontSize: 11 }}>一期一会</span>
      </div>
    </div>
  );
}
