/* global Icon, Kamon, React */

function runRuntimeActionM(key, payload, options) {
  if (!window.SHOGUN_RUNTIME || !window.SHOGUN_RUNTIME.executeAction) return Promise.resolve({ ok:false });
  return window.SHOGUN_RUNTIME.executeAction(key, payload || {}, options || {});
}

// ═══════════════════════════════════════════════════════════════════════════
// MEETINGS — synthesis layer for calendar events + conversations
// ═══════════════════════════════════════════════════════════════════════════
function ScreenMeetings() {
  const recipes = [
    {label:'Write weekly recap', jp:'週報'},
    {label:'Coach me: Matt 1:1',  jp:'対話'},
    {label:'List open decisions', jp:'決定'},
    {label:'Draft follow-ups',    jp:'追跡'},
  ];

  const yesterday = [
    {t:'Revenue-cat · CTO sync', a:'with Matt, Sara', time:'15:18', tag:'DECISION', att:3, locked:true},
    {t:'Speak AI · 100 users interview synthesis', a:'Toru team', time:'14:00', tag:'RESEARCH', att:1},
    {t:'JungleX board prep', a:'Matt, Hiro', time:'11:37', tag:'REVIEW', att:5, locked:true},
    {t:'Pronunciation angles — open loops', a:'solo', time:'10:49', tag:'THINKING'},
    {t:'ElevenLabs · contract review', a:'Legal team', time:'10:21', tag:'REVIEW', locked:true},
    {t:'Revenue-cat · CTO intro', a:'with Jacob', time:'09:58', tag:'NETWORK'},
  ];

  const older = [
    {day:'Apr 16', jp:'木', items:[
      {t:'AI Engine dev · Revenue management strategy for Work-ai', a:'Eng team', time:'13:58', tag:'PLAN', att:4},
    ]},
    {day:'Apr 15', jp:'水', items:[
      {t:'AI tools & future of work — exploration (agent-driven productivity)', a:'solo · voice memo', time:'09:18', tag:'THINKING', duration:'22min'},
    ]},
    {day:'Apr 14', jp:'火', items:[
      {t:'Group memo · SHOGUN direction', a:'Toru, Matt, Sara', time:'17:00', tag:'DECISION', att:3, locked:true},
    ]},
  ];

  const tagColor = (tag) => ({
    DECISION: 'var(--gold)',
    RESEARCH: 'var(--text)',
    REVIEW:   'var(--text-mute)',
    THINKING: 'var(--text-dim)',
    NETWORK:  'var(--text-mute)',
    PLAN:     'var(--text)',
  }[tag] || 'var(--text-dim)');

  return (
    <div style={{maxWidth:880, margin:'0 auto', padding:'48px 40px 80px'}}>

      {/* Header */}
      <div style={{textAlign:'center', marginBottom:40}}>
        <div style={{display:'inline-flex', alignItems:'center', justifyContent:'center', width:52, height:52, borderRadius:'50%', background:'var(--surface)', border:'1px solid var(--border)', marginBottom:18, position:'relative'}}>
          <Icon name="calendar" size={20} className="gold"/>
          <span style={{position:'absolute', bottom:-2, right:-2, width:16, height:16, borderRadius:'50%', background:'var(--bg)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center'}}>
            <Icon name="shield" size={9}/>
          </span>
        </div>
        <h1 style={{margin:0, fontSize:34, fontWeight:600, letterSpacing:'-0.02em', fontFamily:'var(--font-serif, var(--font-en))'}}>
          Meetings <span className="jp" style={{fontSize:22, fontWeight:300, marginLeft:10, color:'var(--text-mute)'}}>会議</span>
        </h1>
        <div style={{marginTop:8, color:'var(--text-mute)', fontSize:13, display:'inline-flex', alignItems:'center', gap:6}}>
          <Icon name="shield" size={11}/>
          <span>Your private meeting notes and recordings</span>
          <span className="jp dim" style={{fontSize:11, marginLeft:4}}>個人</span>
        </div>
      </div>

      {/* Prompt area */}
      <div style={{background:'var(--surface)', border:'1px solid var(--border-hi)', borderRadius:'var(--radius-lg)', padding:'14px 18px', marginBottom:18}}>
        <div className="row" style={{marginBottom:10}}>
          <button className="btn btn-sm btn-ghost" style={{padding:'0 8px', height:26, fontSize:11, background:'var(--surface-2)'}} onClick={()=>runRuntimeActionM('memory.search', { query:'meetings', kinds:['audio'], limit:30 }, { successMessage:'Meeting filter updated' })}>
            <Icon name="shield" size={11}/>All meetings <Icon name="chevronDown" size={10}/>
          </button>
          <span className="spacer"/>
        </div>
        <div className="row" style={{gap:10}}>
          <div style={{flex:1, fontSize:14, color:'var(--text-dim)', padding:'6px 0'}}>Ask anything across 142 meetings…</div>
          <span className="t-mono" style={{fontSize:10, color:'var(--text-mute)'}}>AUTO</span>
          <button className="btn btn-sm btn-ghost" style={{padding:'0 6px'}} onClick={()=>runRuntimeActionM('draft.create', { source:'meetings_prompt', action:'attach' }, { successMessage:'Attachment flow opened' })}><Icon name="paperclip" size={13}/></button>
          <button className="btn btn-sm" style={{padding:'0 10px', background:'var(--gold)', color:'#151212', borderColor:'var(--gold)'}} onClick={()=>runRuntimeActionM('schedule.create', { source:'meetings_prompt', action:'record_voice_query' }, { successMessage:'Voice query started' })}>
            <Icon name="mic" size={13}/>
          </button>
        </div>
      </div>

      {/* Quick recipes */}
      <div className="row" style={{gap:8, marginBottom:40, flexWrap:'wrap'}}>
        {recipes.map((r,i) => (
          <button key={i} className="btn btn-sm btn-ghost" style={{fontSize:11, height:26, padding:'0 10px', borderRadius:999, border:'1px dashed var(--border)', color:'var(--text-mute)'}} onClick={()=>runRuntimeActionM('brief.get', { span:'today', recipe:r.label }, { successMessage:'Meeting recipe applied' })}>
            <Icon name="check" size={10}/>
            <span className="en-only">{r.label}</span>
            <span className="jp" style={{fontSize:10, marginLeft:4}}>{r.jp}</span>
          </button>
        ))}
        <span className="spacer"/>
        <button className="btn btn-sm btn-ghost" style={{fontSize:11, height:26, padding:'0 10px', color:'var(--text-mute)'}} onClick={()=>runRuntimeActionM('brief.get', { span:'week', source:'meetings_recipes' }, { successMessage:'Recipe library opened' })}>
          <Icon name="grid" size={11}/>All recipes
        </button>
      </div>

      {/* Divider */}
      <div style={{height:1, background:'var(--border)', marginBottom:28, position:'relative'}}>
        <span style={{position:'absolute', left:'50%', top:-7, transform:'translateX(-50%)', padding:'0 10px', background:'var(--bg)', fontFamily:'var(--font-jp)', fontSize:11, color:'var(--text-dim)'}} className="jp">記録</span>
      </div>

      {/* Yesterday group */}
      <div style={{marginBottom:36}}>
        <div className="row" style={{marginBottom:16, gap:14}}>
          <span className="t-mono" style={{color:'var(--text-mute)'}}>YESTERDAY</span>
          <span className="jp dim" style={{fontSize:11}}>昨日</span>
          <span style={{height:1, flex:1, background:'var(--border)'}}/>
          <span className="t-mono" style={{fontSize:10, color:'var(--text-dim)'}}>6 ITEMS · 2H 14M</span>
        </div>
        <div style={{display:'flex', flexDirection:'column', gap:2}}>
          {yesterday.map((n,i) => (
            <div key={i} className="mtg-row">
              <div className="mtg-icon">
                <Icon name="note" size={14}/>
              </div>
              <div className="mtg-body">
                <div className="row" style={{gap:8}}>
                  <span className="mtg-title">{n.t}</span>
                  <span className="mtg-tag" style={{color: tagColor(n.tag), borderColor: 'color-mix(in srgb, '+tagColor(n.tag)+' 30%, var(--border))'}}>
                    {n.tag}
                  </span>
                </div>
                <div className="row" style={{gap:10, marginTop:3}}>
                  <span className="mtg-meta">{n.a}</span>
                  {n.att && <span className="mtg-meta"><Icon name="users" size={10}/>{n.att}</span>}
                  {n.duration && <span className="mtg-meta"><Icon name="clock" size={10}/>{n.duration}</span>}
                </div>
              </div>
              <div className="mtg-right">
                {n.locked && <Icon name="shield" size={11} className="dim"/>}
                <span className="t-mono mtg-time">{n.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Older groups */}
      {older.map((g,gi) => (
        <div key={gi} style={{marginBottom:28}}>
          <div className="row" style={{marginBottom:14, gap:14}}>
            <span className="t-mono" style={{color:'var(--text-mute)'}}>{g.day.toUpperCase()}</span>
            <span className="jp dim" style={{fontSize:11}}>{g.jp}</span>
            <span style={{height:1, flex:1, background:'var(--border)'}}/>
          </div>
          <div style={{display:'flex', flexDirection:'column', gap:2}}>
            {g.items.map((n,i) => (
              <div key={i} className="mtg-row">
                <div className="mtg-icon">
                  <Icon name="note" size={14}/>
                </div>
                <div className="mtg-body">
                  <div className="row" style={{gap:8}}>
                    <span className="mtg-title">{n.t}</span>
                    <span className="mtg-tag" style={{color: tagColor(n.tag), borderColor: 'color-mix(in srgb, '+tagColor(n.tag)+' 30%, var(--border))'}}>
                      {n.tag}
                    </span>
                  </div>
                  <div className="row" style={{gap:10, marginTop:3}}>
                    <span className="mtg-meta">{n.a}</span>
                    {n.att && <span className="mtg-meta"><Icon name="users" size={10}/>{n.att}</span>}
                    {n.duration && <span className="mtg-meta"><Icon name="clock" size={10}/>{n.duration}</span>}
                  </div>
                </div>
                <div className="mtg-right">
                  {n.locked && <Icon name="shield" size={11} className="dim"/>}
                  <span className="t-mono mtg-time">{n.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Footer */}
      <div style={{marginTop:48, padding:'18px 0', borderTop:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12, color:'var(--text-dim)'}}>
        <Kamon size={14} color="var(--gold)"/>
        <span className="t-mono" style={{fontSize:10}}>142 MEETINGS IN MEMORY · LOCAL</span>
        <span className="spacer"/>
        <span className="jp" style={{fontSize:11}}>一期一会</span>
        <span style={{fontSize:11, fontStyle:'italic'}}>One meeting, one encounter</span>
      </div>

      {/* Scoped styles */}
      <style>{`
        .mtg-row {
          display:flex; align-items:center; gap:14px;
          padding:14px 14px; border-radius:var(--radius-md);
          cursor:pointer; transition:background var(--dur-base) var(--ease-out);
          border:1px solid transparent;
        }
        .mtg-row:hover {
          background:var(--surface);
          border-color:var(--border);
        }
        .mtg-icon {
          width:32px; height:32px; flex-shrink:0;
          display:flex; align-items:center; justify-content:center;
          background:var(--surface-2); border:1px solid var(--border);
          border-radius:var(--radius-sm);
          color:var(--text-mute);
        }
        .mtg-row:hover .mtg-icon { color:var(--gold); border-color:var(--gold-dim); }
        .mtg-body { flex:1; min-width:0; }
        .mtg-title {
          font-size:14px; color:var(--text); font-weight:500;
          overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
        }
        .mtg-tag {
          font-family:var(--font-mono); font-size:9px; letter-spacing:0.1em;
          padding:2px 6px; border:1px solid var(--border); border-radius:3px;
          flex-shrink:0;
        }
        .mtg-meta {
          font-size:11px; color:var(--text-dim);
          display:inline-flex; align-items:center; gap:4px;
        }
        .mtg-right {
          display:flex; align-items:center; gap:10px;
          flex-shrink:0;
        }
        .mtg-time {
          font-size:11px; color:var(--text-mute);
          min-width:40px; text-align:right;
        }
      `}</style>
    </div>
  );
}

window.ScreenMeetings = ScreenMeetings;
