/* global Icon, Kamon, React */
const { useState, useEffect, useMemo } = React;

function runRuntimeActionA(key, payload, options) {
  if (!window.SHOGUN_RUNTIME || !window.SHOGUN_RUNTIME.executeAction) return Promise.resolve({ ok:false });
  return window.SHOGUN_RUNTIME.executeAction(key, payload || {}, options || {});
}

function requestWriteActionA(actionKey, payload, title, description) {
  if (!window.SHOGUN_RUNTIME || !window.SHOGUN_RUNTIME.requestWriteAction) return;
  window.SHOGUN_RUNTIME.requestWriteAction(actionKey, payload, title, description);
}

const MEMORY_DEMO_EVENTS = [
  {t:'07:12', h:7.2,  src:'agent', title:'Morning brief assembled', tag:'auto'},
  {t:'07:58', h:7.97, src:'mail',  title:'Inbox open · 24 unread'},
  {t:'08:41', h:8.68, src:'note',  title:'Journal entry · 220w'},
  {t:'09:04', h:9.07, src:'chat',  title:'Terminal session · rust refactor'},
  {t:'09:22', h:9.37, src:'code',  title:'Commit: refactor/auth-layer'},
  {t:'09:48', h:9.8,  src:'chat',  title:'SHOGUN · tool scoping'},
  {t:'10:05', h:10.08,src:'mail',  title:'Thread · compliance review'},
  {t:'10:30', h:10.5, src:'meet',  title:'Grop使 · product sync', dur:'25m'},
  {t:'11:02', h:11.03,src:'note',  title:'Whiteboard photo captured'},
  {t:'11:37', h:11.6, src:'note',  title:'Notion · 100x user framework'},
  {t:'12:10', h:12.17,src:'chat',  title:'Lunch log · voice memo'},
  {t:'12:44', h:12.73,src:'agent', title:'Afternoon brief', tag:'auto'},
  {t:'13:20', h:13.33,src:'meet',  title:'All PJ · Matt + Tano', dur:'42m', big:true},
  {t:'14:02', h:14.03,src:'chat',  title:'Revenue-cat · pricing tiers', big:true},
  {t:'14:28', h:14.47,src:'note',  title:'Decision: tier at $17/$62'},
  {t:'15:06', h:15.1, src:'code',  title:'PR opened · pricing/api'},
  {t:'15:48', h:15.8, src:'mail',  title:'Elevenlabs intro thread'},
  {t:'16:22', h:16.37,src:'chat',  title:'SHOGUN · memory schema'},
  {t:'17:00', h:17,   src:'agent', title:'Inbox triage · 12 emails', tag:'auto'},
  {t:'17:44', h:17.73,src:'meet',  title:'1:1 · Jacob', dur:'28m'},
  {t:'18:30', h:18.5, src:'note',  title:'Walking thoughts · voice'},
  {t:'19:42', h:19.7, src:'agent', title:'Evening digest ready', tag:'auto'},
  {t:'20:18', h:20.3, src:'chat',  title:'Reading session · annotated'},
];

function memoryHitToRiverEvent(hit) {
  const ts = hit.created_at != null ? Number(hit.created_at) : Date.now();
  const d = new Date(ts);
  const hRaw = d.getHours() + d.getMinutes() / 60;
  const h = Math.max(6, Math.min(22, hRaw));
  const t = d.toTimeString().slice(0, 5);
  const rawSrc = String(hit.source || '').toLowerCase();
  let src = 'note';
  if (rawSrc === 'meetings' || (Array.isArray(hit.kinds) && hit.kinds.indexOf('audio') >= 0)) src = 'meet';
  else if (rawSrc === 'chat') src = 'chat';
  else if (rawSrc === 'work') src = 'code';
  return {
    t,
    h,
    src,
    title: hit.title || 'Memory',
    snippet: hit.snippet || '',
    memoryId: hit.id,
    big: false,
  };
}

function mergeIndexHitsIntoRiver(res, setEvents, setScrubIdx) {
  if (!res || !res.ok || !res.data) return;
  const hits = res.data.hits;
  if (!Array.isArray(hits) || hits.length === 0) return;
  const mapped = hits.map(memoryHitToRiverEvent);
  setEvents([].concat(mapped, MEMORY_DEMO_EVENTS));
  setScrubIdx(0);
}

// ═══════════════════════════════════════════════════════════════════════════
// L1 · HOME — the launch pad
// ═══════════════════════════════════════════════════════════════════════════
function ScreenHome() {
  return (
    <div className="content-inner" style={{maxWidth:880, margin:'0 auto', padding:'80px 40px 64px'}}>
      <div style={{marginBottom:48}}>
        <div className="t-mono" style={{marginBottom:12}}>APR 17 · FRIDAY · 14:32</div>
        <h1 style={{fontSize:40, fontWeight:600, letterSpacing:'-0.02em', margin:'0 0 10px'}}>Good afternoon, Kenshin.</h1>
        <div style={{color:'var(--text-mute)', fontSize:16}}>23 memories captured today.</div>
      </div>

      {/* Synthesized day — single focal card */}
      <div className="card" style={{padding:40, borderColor:'var(--border-hi)', marginBottom:20}}>
        <div className="t-mono gold" style={{marginBottom:18}}>◆ YOUR DAY · SYNTHESIZED</div>
        <div style={{fontSize:22, fontWeight:500, lineHeight:1.45, marginBottom:28}}>
          You spent 2h 14m in product calls with <span className="gold">Matt</span> and the <span className="gold">Toru team</span>, mostly on pricing. The Revenue-cat chat from 14:02 proposed a three-tier model you haven't written down yet.
        </div>
        <div className="row" style={{gap:8, flexWrap:'wrap'}}>
          <button className="btn btn-sm btn-secondary" onClick={()=>runRuntimeActionA('draft.create', { source:'home_card', target:'pricing_doc' }, { successMessage:'Draft request submitted' })}>Draft the pricing doc <Icon name="arrowRight" size={14}/></button>
          <button className="btn btn-sm btn-secondary" onClick={()=>runRuntimeActionA('schedule.create', { source:'home_card', target:'matt_followup' }, { successMessage:'Follow-up scheduled' })}>Schedule Matt follow-up</button>
          <button className="btn btn-sm btn-ghost" onClick={()=>runRuntimeActionA('settings.save', { section:'home', action:'dismiss_day_card' }, { successMessage:'Card dismissed' })}>Dismiss</button>
        </div>
      </div>

      {/* Ask SHOGUN input — the only primary action */}
      <div style={{display:'flex', gap:12, alignItems:'center', padding:'4px 0'}}>
        <div className="row" style={{flex:1, height:56, padding:'0 20px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', color:'var(--text-dim)', fontSize:15}}>
          <Icon name="search" size={16}/>
          <span>Ask your memory or run a command…</span>
          <span className="spacer"/>
          <span className="t-mono" style={{fontSize:11, border:'1px solid var(--border)', padding:'2px 8px', borderRadius:4}}>⌘K</span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// L2 · MEMORY TIMELINE — HERO
// ═══════════════════════════════════════════════════════════════════════════
function ScreenMemory() {
  const [view, setView] = useState('river');
  const [zoom, setZoom] = useState('week'); // 'day' | 'week' | 'month' | 'year'
  const [periodIdx, setPeriodIdx] = useState(0); // offset within current zoom
  const [events, setEvents] = useState(() => MEMORY_DEMO_EVENTS.slice());
  const [scrubIdx, setScrubIdx] = useState(13);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await runRuntimeActionA('memory.search', { query: '', limit: 40 }, { silentError: true });
      if (cancelled) return;
      mergeIndexHitsIntoRiver(res, setEvents, setScrubIdx);
    })();
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    const onIndexChanged = async () => {
      const r = await runRuntimeActionA('memory.search', { query: '', limit: 40 }, { silentError: true });
      mergeIndexHitsIntoRiver(r, setEvents, setScrubIdx);
    };
    window.addEventListener('shogun-memory-index-changed', onIndexChanged);
    return () => window.removeEventListener('shogun-memory-index-changed', onIndexChanged);
  }, []);
  useEffect(() => {
    setScrubIdx((i) => {
      if (events.length === 0) return 0;
      return Math.min(i, events.length - 1);
    });
  }, [events.length]);
  const { bins, maxBin } = useMemo(() => {
    const binCount = 64;
    const b = new Array(binCount).fill(0);
    events.forEach((e) => {
      const p = Math.max(0, Math.min(1, (e.h - 6) / (22 - 6)));
      b[Math.floor(p * (binCount - 1))] += e.big ? 2 : 1;
    });
    return { bins: b, maxBin: Math.max(...b, 1) };
  }, [events]);
  const scrubbed = events.length
    ? events[Math.min(scrubIdx, events.length - 1)]
    : { t: '--', h: 12, src: 'note', title: 'No memories', snippet: '' };
  const srcIcon = s => s==='chat'?'chat':s==='meet'?'calendar':s==='note'?'note':s==='mail'?'mail':s==='agent'?'bot':s==='code'?'terminal':'file';
  const srcLabel = s => ({chat:'Conversation',meet:'Meeting',note:'Note',mail:'Email',agent:'Agent run',code:'Code'})[s]||'Event';

  return (
    <div className="content-inner wide" style={{padding:0, height:'100%', display:'flex', flexDirection:'column'}}>
      {/* Header */}
      <div style={{padding:'24px 40px 0', display:'flex', alignItems:'flex-end', gap:20}}>
        <div>
          <div className="t-mono" style={{marginBottom:6}}>MEMORY / TIMELINE</div>
          <h1 style={{margin:0, fontSize:28, fontWeight:600}}>April 17 · Friday <span className="jp muted" style={{fontSize:16, fontWeight:300, marginLeft:8}}>時間軸</span></h1>
        </div>
        <span className="spacer"/>
        <div style={{display:'flex', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', overflow:'hidden'}}>
          {[['river','River'],['stack','Kakejiku'],['heatmap','Heatmap']].map(([k,l])=>(
            <button key={k} onClick={()=>setView(k)} className="btn btn-sm" style={{borderRadius:0, border:0, background: view===k?'var(--surface-2)':'transparent', color: view===k?'var(--gold)':'var(--text-mute)'}}>{l}</button>
          ))}
        </div>
        <div className="row" style={{gap:8}}>
          <button className="btn btn-sm btn-secondary" onClick={async ()=>{
            const res = await runRuntimeActionA('memory.search', { query:'filters timeline', kinds:['screen','audio','input'], limit:50 }, { successMessage:'Filters applied' });
            mergeIndexHitsIntoRiver(res, setEvents, setScrubIdx);
          }}><Icon name="filter" size={14}/>Filters · 3</button>
          <button className="btn btn-sm btn-ghost" onClick={async ()=>{
            await runRuntimeActionA('memory.ingest', { title:'Quick capture · '+new Date().toLocaleTimeString(), snippet:'Saved from Memory screen.', source:'capture', kinds:['input'] }, { successMessage:'Memory indexed' });
            const r = await runRuntimeActionA('memory.search', { query:'', limit:40 }, { silentError:true });
            mergeIndexHitsIntoRiver(r, setEvents, setScrubIdx);
          }}>Save test</button>
        </div>
      </div>

      {/* Time-range nav — zoom aware (Day/Week/Month/Year) */}
      <div style={{padding:'20px 40px 14px', display:'flex', alignItems:'center', gap:12}}>
        {/* Zoom selector */}
        <div style={{display:'flex', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', overflow:'hidden', background:'var(--surface)'}}>
          {[['day','Day','日'],['week','Week','週'],['month','Month','月'],['year','Year','年']].map(([k,l,j])=>(
            <button key={k} onClick={()=>{setZoom(k); setPeriodIdx(0);}} className="btn btn-sm" style={{borderRadius:0, border:0, height:36, padding:'0 12px', background: zoom===k?'var(--surface-2)':'transparent', color: zoom===k?'var(--gold)':'var(--text-mute)', fontSize:11}}>
              <span className="en-only">{l}</span>
              <span className="jp" style={{marginLeft:4, fontSize:10}}>{j}</span>
            </button>
          ))}
        </div>
        {/* Period stepper */}
        <button className="btn btn-sm btn-ghost" onClick={()=>setPeriodIdx(i=>i-1)} style={{height:36, width:32, padding:0}}><Icon name="arrowLeft" size={13}/></button>
        <div className="t-mono" style={{minWidth:140, textAlign:'center', fontSize:11, color:'var(--text)'}}>
          {zoom==='day'   && 'Apr 17 · Fri'}
          {zoom==='week'  && 'Apr 11 – Apr 17'}
          {zoom==='month' && 'April 2026'}
          {zoom==='year'  && '2026'}
        </div>
        <button className="btn btn-sm btn-ghost" onClick={()=>setPeriodIdx(i=>i+1)} style={{height:36, width:32, padding:0}}><Icon name="arrowRight" size={13}/></button>
        <button className="btn btn-sm btn-ghost" style={{height:36, padding:'0 10px', fontSize:11}} onClick={()=>setPeriodIdx(0)}>Today · 今日</button>

        <span className="spacer"/>

        {/* Quick search for dense ranges — shown for month/year */}
        {(zoom==='month' || zoom==='year') && (
          <div className="row" style={{gap:6, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', padding:'6px 10px', height:36}}>
            <Icon name="search" size={12} className="dim"/>
            <span style={{fontSize:11, color:'var(--text-dim)'}}>Jump to date or tag…</span>
            <span className="kbd" style={{fontSize:9}}>⌘J</span>
          </div>
        )}
        <span className="t-mono" style={{fontSize:10, color:'var(--text-mute)'}}>
          {zoom==='day'   && '23 MEMORIES · 3H 47M'}
          {zoom==='week'  && '148 MEMORIES · 26H'}
          {zoom==='month' && '612 MEMORIES · 108H'}
          {zoom==='year'  && '4,218 MEMORIES · 68 DAYS'}
        </span>
      </div>

      {/* Zoom body — adapts density to zoom level */}
      <div style={{padding:'0 40px 18px'}}>
        {zoom==='day' && (
          <div className="card" style={{padding:'14px 18px', display:'flex', gap:6, alignItems:'flex-end', overflowX:'auto'}}>
            {Array.from({length:24}).map((_,h) => {
              const density = [0,0,0,0,0,0, 3,5,9,12,8, 11,14,18,22,15, 12,9,6,4,2, 1,0,0][h];
              const active = h===14;
              return (
                <div key={h} title={`${h}:00 · ${density} memories`} style={{flex:'0 0 28px', textAlign:'center', cursor:'pointer'}}>
                  <div style={{height:60, display:'flex', alignItems:'flex-end', justifyContent:'center'}}>
                    <div style={{width:16, height:Math.max(2,density*2.5), background: active?'var(--gold)':'var(--text-dim)', opacity: active?1:0.5, borderRadius:2}}/>
                  </div>
                  <div className="t-mono" style={{fontSize:9, marginTop:4, color: active?'var(--gold)':'var(--text-dim)'}}>{String(h).padStart(2,'0')}</div>
                </div>
              );
            })}
          </div>
        )}

        {zoom==='week' && (
          <div style={{display:'flex', gap:8}}>
            {['Apr 11','Apr 12','Apr 13','Apr 14','Apr 15','Apr 16','Apr 17'].map((d,i) => (
              <div key={d} className="card card-interactive" style={{flex:1, padding:'10px 14px', minWidth:72, borderColor: i===6?'var(--gold)':'var(--border)', background: i===6?'var(--surface-2)':'var(--surface)'}}>
                <div className="t-mono" style={{fontSize:10, marginBottom:4}}>{d}</div>
                <div style={{display:'flex', gap:2, alignItems:'flex-end', height:24}}>
                  {Array.from({length:10}).map((_,j)=> {
                    const h = [6,10,14,8,18,12,22][i] + (j%3)*2 - 4;
                    return <div key={j} style={{flex:1, height:Math.max(2,h), background: i===6?'var(--gold)':'var(--text-dim)', opacity: i===6?0.9:0.4}}/>
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {zoom==='month' && (
          <div className="card" style={{padding:'14px 16px'}}>
            {/* Monday-first calendar heatmap — 5 rows */}
            <div style={{display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:4, marginBottom:6}}>
              {['M','T','W','T','F','S','S'].map((d,i) => (
                <div key={i} className="t-mono" style={{fontSize:9, color:'var(--text-dim)', textAlign:'center'}}>{d}</div>
              ))}
            </div>
            <div style={{display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:4}}>
              {Array.from({length:35}).map((_,i) => {
                const day = i - 1; // April 2026 starts on a Wednesday (offset 2)
                const inMonth = day>=1 && day<=30;
                const density = inMonth ? ((day*7 + day%5 + 11) % 24) : 0;
                const isToday = day===17;
                const bg = !inMonth ? 'transparent'
                  : density<4 ? 'var(--surface)'
                  : density<9 ? 'color-mix(in srgb, var(--gold) 16%, var(--surface))'
                  : density<16 ? 'color-mix(in srgb, var(--gold) 38%, var(--surface))'
                  : 'color-mix(in srgb, var(--gold) 64%, var(--surface))';
                return (
                  <div key={i} className="card-interactive" style={{
                    aspectRatio:'1.6/1', padding:'6px 8px', background:bg,
                    border: isToday?'1px solid var(--gold)':'1px solid var(--border)',
                    borderRadius:'var(--radius-sm)', cursor: inMonth?'pointer':'default',
                    opacity: inMonth?1:0.25, position:'relative',
                  }}>
                    {inMonth && <>
                      <div className="t-mono" style={{fontSize:10, color: isToday?'var(--gold)':'var(--text-mute)'}}>{day}</div>
                      <div style={{fontSize:9, color:'var(--text-dim)', marginTop:2}}>{density} mem</div>
                    </>}
                  </div>
                );
              })}
            </div>
            <div className="row" style={{marginTop:10, gap:6, fontSize:9, color:'var(--text-dim)', fontFamily:'var(--font-mono)'}}>
              <span>LESS</span>
              {[0,1,2,3].map(i => (
                <div key={i} style={{width:14, height:10, borderRadius:2, background: i===0?'var(--surface)':`color-mix(in srgb, var(--gold) ${16*i}%, var(--surface))`, border:'1px solid var(--border)'}}/>
              ))}
              <span>MORE</span>
              <span className="spacer"/>
              <span>CLICK A DAY TO ZOOM IN · 日</span>
            </div>
          </div>
        )}

        {zoom==='year' && (
          <div className="card" style={{padding:'14px 18px'}}>
            {/* 12 months as mini heatmaps */}
            <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:14}}>
              {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m,mi) => {
                const isCurrent = mi===3;
                return (
                  <div key={m} className="card-interactive" style={{padding:'10px 12px', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', background: isCurrent?'var(--surface-2)':'var(--surface)', borderColor: isCurrent?'var(--gold)':'var(--border)', cursor:'pointer'}}>
                    <div className="row" style={{marginBottom:8}}>
                      <span className="t-mono" style={{fontSize:10, color: isCurrent?'var(--gold)':'var(--text)'}}>{m.toUpperCase()}</span>
                      <span className="spacer"/>
                      <span style={{fontSize:9, color:'var(--text-dim)'}}>{isCurrent?'612':Math.round(200 + Math.sin(mi)*120 + mi*18)}</span>
                    </div>
                    <div style={{display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:2}}>
                      {Array.from({length:30}).map((_,i) => {
                        const d = (i*5 + mi*3) % 22;
                        const bg = d<4 ? 'var(--surface)'
                          : d<9 ? 'color-mix(in srgb, var(--gold) 16%, var(--surface))'
                          : d<15 ? 'color-mix(in srgb, var(--gold) 36%, var(--surface))'
                          : 'color-mix(in srgb, var(--gold) 60%, var(--surface))';
                        return <div key={i} style={{aspectRatio:'1/1', background:bg, border:'1px solid var(--border)', borderRadius:1}}/>;
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{borderTop:'1px solid var(--border)', marginTop:14, paddingTop:10, display:'flex', alignItems:'center', gap:10, fontSize:10, color:'var(--text-dim)', fontFamily:'var(--font-mono)'}}>
              <span>TOP TAGS</span>
              {['#pricing','#shogun','#matt','#rev-cat','#speak','#hummingbird'].map(t => (
                <span key={t} className="label" style={{height:20, fontSize:10}}>{t}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* River view — scrubbable timeline */}
      {view==='river' && (
        <div style={{flex:1, padding:'0 40px 32px', minHeight:0, overflow:'hidden', display:'flex', flexDirection:'column', gap:14}}>

          {/* Scrubbed moment preview — top stage */}
          <div className="card memory-scrub-stage" style={{flex:1, padding:0, minHeight:0, display:'flex', overflow:'hidden'}}>
            {/* Left: what happened */}
            <div style={{flex:'0 0 42%', padding:'24px 28px', borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:12, overflow:'auto'}}>
              <div className="row" style={{gap:10}}>
                <div style={{width:32, height:32, borderRadius:'var(--radius-md)', background:'var(--surface-2)', border:'1px solid var(--gold-dim)', display:'flex', alignItems:'center', justifyContent:'center'}}>
                  <Icon name={srcIcon(scrubbed.src)} size={14} className="gold"/>
                </div>
                <div>
                  <div className="t-mono" style={{fontSize:10}}>{srcLabel(scrubbed.src).toUpperCase()} · {scrubbed.t}</div>
                  <div style={{fontSize:18, fontWeight:500, marginTop:2, letterSpacing:'-0.01em'}}>{scrubbed.title}</div>
                </div>
              </div>

              <div className="row" style={{gap:6, flexWrap:'wrap', marginTop:2}}>
                {scrubbed.tag==='auto' && <span className="label label-gold"><Icon name="bot" size={10} style={{marginRight:4}}/>auto-captured</span>}
                {scrubbed.memoryId && <span className="label">index</span>}
                {scrubbed.dur && <span className="label"><Icon name="clock" size={10} style={{marginRight:4}}/>{scrubbed.dur}</span>}
                <span className="label">#pricing</span>
                <span className="label">Matt</span>
                <span className="label">Toru</span>
              </div>

              <div style={{fontSize:13, lineHeight:1.65, color:'var(--text-mute)', marginTop:4}}>
                {scrubbed.snippet || 'Jumped into Revenue-cat. Locked on a three-tier structure: Plus at $17, Pro at $62, and a founder plan. Matt pushed back on the middle tier — we softened it.'}
              </div>

              <div className="t-mono" style={{fontSize:10, marginTop:6}}>3 MEMORIES WRITTEN · 2 ENTITIES LINKED</div>
              <div style={{display:'flex', flexDirection:'column', gap:6, marginTop:2}}>
                {[
                  ['decision', '"Pro tier = $62/mo, annual $49"'],
                  ['quote',    '"pricing shouldn\u2019t apologize for itself"'],
                  ['todo',     'Send tiering doc to Matt by Friday'],
                ].map(([k,v],i)=>(
                  <div key={i} className="row" style={{gap:10, padding:'8px 10px', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', background:'var(--surface)', fontSize:12}}>
                    <span className="t-mono" style={{fontSize:9, color:'var(--gold)', minWidth:60}}>{k.toUpperCase()}</span>
                    <span style={{flex:1, color:'var(--text)'}}>{v}</span>
                    <Icon name="arrowUpRight" size={11} className="dim"/>
                  </div>
                ))}
              </div>

              <span className="spacer"/>
              <div className="row" style={{gap:8, paddingTop:10, borderTop:'1px solid var(--border)', marginTop:10}}>
                <button className="btn btn-sm btn-secondary" onClick={()=>runRuntimeActionA('memory.search', { query:scrubbed.title, limit:10 }, { successMessage:'Opened in Chat context' })}><Icon name="chat" size={12}/>Open in Chat</button>
                <button className="btn btn-sm btn-secondary" onClick={()=>runRuntimeActionA('memory.search', { query:`source:${scrubbed.src} ${scrubbed.title}`, limit:10 }, { successMessage:'Source opened' })}><Icon name="file" size={12}/>Open source</button>
                {scrubbed.memoryId && (
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => requestWriteActionA(
                      'memory.delete',
                      { id: scrubbed.memoryId },
                      'Remove from memory index',
                      'Deletes this entry from the local memory index file (memory_items.json). Demo events stay in the river until refresh.',
                    )}
                  ><Icon name="x" size={12}/>Remove from index</button>
                )}
                <span className="spacer"/>
                <button className="btn btn-sm btn-ghost" onClick={()=>runRuntimeActionA('settings.save', { section:'memory', action:'open_more_menu' }, { successMessage:'More actions opened' })}><Icon name="more" size={12}/></button>
              </div>
            </div>

            {/* Right: visual snapshot (placeholder framed preview) */}
            <div style={{flex:1, position:'relative', background:'var(--surface-2)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', minWidth:0}}>
              {/* ambient grid */}
              <div style={{position:'absolute', inset:0, backgroundImage:'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)', backgroundSize:'40px 40px', opacity:0.25}}/>
              {/* crosshair frame with scrubbed hour */}
              <div style={{position:'absolute', top:14, left:14, right:14, display:'flex', alignItems:'center', gap:8, color:'var(--text-dim)'}}>
                <span className="t-mono" style={{fontSize:10}}>SNAPSHOT · {scrubbed.t}</span>
                <span className="spacer"/>
                <span className="t-mono" style={{fontSize:10}}>{scrubIdx+1} / {events.length}</span>
              </div>

              {/* Mock screen preview — depends on source */}
              <div className="snap-frame">
                {scrubbed.src==='chat' && (
                  <div className="snap-chat">
                    <div className="snap-bar"><span className="dot red"/><span className="dot yellow"/><span className="dot green"/><span className="snap-title">SHOGUN Chat · {scrubbed.title}</span></div>
                    <div className="snap-body">
                      <div className="snap-bubble you">Draft a three-tier pricing page for SHOGUN.</div>
                      <div className="snap-bubble shogun">
                        <Kamon size={11} color="var(--gold)"/>
                        <span>Pulling from Matt 1-on-1 and Rev-cat chat — here's the draft...</span>
                      </div>
                      <div className="snap-bubble shogun small">
                        <span className="gold">##</span> Plus — $17/mo · <span className="gold">##</span> Pro — $62/mo
                      </div>
                    </div>
                  </div>
                )}
                {scrubbed.src==='meet' && (
                  <div className="snap-chat">
                    <div className="snap-bar"><span className="dot red"/><span className="dot yellow"/><span className="dot green"/><span className="snap-title">Meeting · {scrubbed.title}</span></div>
                    <div className="snap-body" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
                      {['Matt','You','Tano','Toru'].map((p,i)=>(
                        <div key={i} style={{aspectRatio:'16/10', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'var(--text-dim)', position:'relative'}}>
                          {p}
                          {i===1 && <span style={{position:'absolute', bottom:4, left:6, width:6, height:6, borderRadius:'50%', background:'var(--gold)'}}/>}
                        </div>
                      ))}
                    </div>
                    <div className="snap-trans">"…and we aligned on the middle tier at sixty-two."</div>
                  </div>
                )}
                {scrubbed.src==='note' && (
                  <div className="snap-chat">
                    <div className="snap-bar"><span className="dot red"/><span className="dot yellow"/><span className="dot green"/><span className="snap-title">Note · {scrubbed.title}</span></div>
                    <div className="snap-body snap-note">
                      <div className="snap-h"># {scrubbed.title}</div>
                      <div>— Three tiers, not four. Keep decisiveness.</div>
                      <div>— Annual discount: 21% (Jacob ✓)</div>
                      <div>— Pro tier copy needs a pass.</div>
                    </div>
                  </div>
                )}
                {scrubbed.src==='mail' && (
                  <div className="snap-chat">
                    <div className="snap-bar"><span className="dot red"/><span className="dot yellow"/><span className="dot green"/><span className="snap-title">Mail · {scrubbed.title}</span></div>
                    <div className="snap-body snap-mail">
                      <div className="snap-mailrow"><span className="gold">FROM</span><span>matt@revenuecat.com</span></div>
                      <div className="snap-mailrow"><span className="gold">SUBJ</span><span>Re: Pricing tiers (v2)</span></div>
                      <div style={{marginTop:8, fontSize:11, lineHeight:1.6, color:'var(--text-mute)'}}>Looks good. The $62 feels right. Let's push on the founder plan language — last draft was soft.</div>
                    </div>
                  </div>
                )}
                {scrubbed.src==='agent' && (
                  <div className="snap-chat">
                    <div className="snap-bar"><span className="dot red"/><span className="dot yellow"/><span className="dot green"/><span className="snap-title">Agent run · {scrubbed.title}</span></div>
                    <div className="snap-body" style={{fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-mute)', lineHeight:1.7}}>
                      <div><span className="gold">$</span> shogun agent run inbox-triage</div>
                      <div>→ read 12 emails</div>
                      <div>→ drafted 3 replies</div>
                      <div>→ archived 6 threads</div>
                      <div style={{color:'var(--success)'}}>✓ completed in 1.8s</div>
                    </div>
                  </div>
                )}
                {scrubbed.src==='code' && (
                  <div className="snap-chat">
                    <div className="snap-bar"><span className="dot red"/><span className="dot yellow"/><span className="dot green"/><span className="snap-title">Terminal · {scrubbed.title}</span></div>
                    <div className="snap-body" style={{fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-mute)', lineHeight:1.7}}>
                      <div><span className="gold">$</span> git commit -m "refactor/auth-layer"</div>
                      <div>[main a4f12cd] refactor/auth-layer</div>
                      <div>14 files changed, 287 insertions(+), 412 deletions(-)</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Scrubber strip */}
          <div className="card memory-scrubber">
            <div className="row" style={{padding:'10px 14px', borderBottom:'1px solid var(--border)', gap:10}}>
              <span className="t-mono" style={{color:'var(--gold)'}}>TIMELINE</span>
              <span className="jp dim" style={{fontSize:10}}>さかのぼる</span>
              <span className="spacer"/>
              <div className="row" style={{gap:4}}>
                <button className="btn btn-sm btn-ghost" onClick={()=>setScrubIdx(Math.max(0,scrubIdx-1))} style={{padding:'0 6px'}}><Icon name="arrowLeft" size={12}/></button>
                <button className="btn btn-sm btn-ghost" onClick={()=>setScrubIdx(Math.min(events.length-1,scrubIdx+1))} style={{padding:'0 6px'}}><Icon name="arrowRight" size={12}/></button>
              </div>
              <span className="t-mono" style={{fontSize:10, color:'var(--text-dim)'}}>{events.length} EVENTS · 14H 30M</span>
            </div>

            <div className="scrub-track">
              {/* hour rule */}
              <div className="scrub-hours">
                {['06','08','10','12','14','16','18','20','22'].map((h,i) => (
                  <span key={h} style={{left:`${(i*2)/16*100}%`}}>{h}</span>
                ))}
              </div>
              {/* density histogram */}
              <div className="scrub-density">
                {bins.map((v,i)=>(
                  <div key={i} style={{height:`${(v/maxBin)*100}%`}}/>
                ))}
              </div>
              {/* hour ticks */}
              <div className="scrub-ticks">
                {Array.from({length:17}).map((_,i)=>(
                  <div key={i} style={{left:`${(i/16)*100}%`, height: i%2===0?12:6}}/>
                ))}
              </div>
              {/* event dots */}
              <div className="scrub-events">
                {events.map((e,i) => {
                  const pct = (e.h-6)/(22-6);
                  const selected = i===scrubIdx;
                  return (
                    <button
                      key={i}
                      onClick={()=>setScrubIdx(i)}
                      className={`scrub-dot scrub-dot-${e.src} ${selected?'selected':''} ${e.big?'big':''}`}
                      style={{left:`${pct*100}%`}}
                      title={`${e.t} · ${e.title}`}
                    >
                      <Icon name={srcIcon(e.src)} size={selected?11:9}/>
                    </button>
                  );
                })}
              </div>
              {/* now marker */}
              <div className="scrub-now" style={{left:`${((14.53-6)/(22-6))*100}%`}}>
                <span>NOW · 14:32</span>
              </div>
              {/* playhead */}
              <div className="scrub-playhead" style={{left:`${((scrubbed.h-6)/(22-6))*100}%`}}>
                <div className="scrub-playhead-head"><span className="t-mono">{scrubbed.t}</span></div>
              </div>
            </div>
          </div>

          {/* Scoped styles */}
          <style>{`
            .memory-scrub-stage { border-color:var(--border); }
            .snap-frame {
              width:86%; height:82%; background:var(--bg);
              border:1px solid var(--border-hi); border-radius:var(--radius-md);
              box-shadow:0 30px 60px -30px rgba(0,0,0,0.6), 0 2px 0 rgba(0,0,0,0.3);
              display:flex; flex-direction:column; overflow:hidden;
              position:relative; z-index:1;
            }
            .snap-bar {
              display:flex; align-items:center; gap:6px;
              padding:8px 12px; border-bottom:1px solid var(--border);
              background:var(--surface); flex-shrink:0;
            }
            .snap-bar .dot { width:8px; height:8px; border-radius:50%; background:var(--text-dim); }
            .snap-bar .dot.red { background:#d96b5a; }
            .snap-bar .dot.yellow { background:#d9a85a; }
            .snap-bar .dot.green { background:#7a9a6a; }
            .snap-title {
              margin-left:10px; font-size:11px;
              color:var(--text-mute); font-family:var(--font-mono);
              letter-spacing:0.05em;
            }
            .snap-body { flex:1; padding:16px 20px; overflow:hidden; display:flex; flex-direction:column; gap:10px; }
            .snap-bubble {
              padding:10px 12px; border-radius:var(--radius-md);
              font-size:12px; line-height:1.55; max-width:85%;
            }
            .snap-bubble.you { background:var(--surface-2); align-self:flex-end; border-radius:var(--radius-md) var(--radius-md) 2px var(--radius-md); }
            .snap-bubble.shogun { display:flex; gap:8px; align-items:flex-start; color:var(--text); }
            .snap-bubble.shogun.small { font-family:var(--font-mono); font-size:11px; color:var(--text-mute); }
            .snap-note { font-family:var(--font-mono); font-size:11px; line-height:1.7; color:var(--text-mute); }
            .snap-note .snap-h { color:var(--text); font-size:12px; margin-bottom:4px; }
            .snap-mail { font-size:11px; }
            .snap-mailrow {
              display:flex; gap:10px; font-family:var(--font-mono);
              font-size:10px; padding:3px 0; border-bottom:1px dashed var(--border);
            }
            .snap-mailrow span:first-child { width:40px; }
            .snap-trans {
              margin-top:6px; padding:8px 10px;
              border-left:2px solid var(--gold); background:var(--bg);
              font-size:11px; color:var(--text-mute); font-style:italic;
            }

            .memory-scrubber { padding:0; overflow:visible; }
            .scrub-track {
              position:relative; height:96px; padding:0 14px;
              background:var(--surface);
            }
            .scrub-hours {
              position:absolute; top:6px; left:14px; right:14px; height:14px;
            }
            .scrub-hours span {
              position:absolute; transform:translateX(-50%);
              font-family:var(--font-mono); font-size:9px; color:var(--text-dim);
              letter-spacing:0.1em;
            }
            .scrub-density {
              position:absolute; top:22px; left:14px; right:14px; height:26px;
              display:flex; align-items:flex-end; gap:1px;
            }
            .scrub-density div {
              flex:1; background:color-mix(in srgb, var(--gold) 30%, transparent);
              border-radius:1px 1px 0 0; min-height:1px;
            }
            .scrub-ticks {
              position:absolute; top:50px; left:14px; right:14px; height:12px;
            }
            .scrub-ticks div {
              position:absolute; width:1px; background:var(--border-hi); top:0;
            }
            .scrub-events {
              position:absolute; top:60px; left:14px; right:14px; height:28px;
            }
            .scrub-dot {
              position:absolute; top:50%; transform:translate(-50%, -50%);
              width:20px; height:20px; border-radius:50%;
              background:var(--surface-2); border:1px solid var(--border-hi);
              display:flex; align-items:center; justify-content:center;
              color:var(--text-mute); cursor:pointer;
              transition:transform 120ms, border-color 120ms, background 120ms;
            }
            .scrub-dot:hover { border-color:var(--gold-dim); color:var(--text); }
            .scrub-dot.big { width:22px; height:22px; }
            .scrub-dot.selected {
              width:28px; height:28px; background:var(--gold);
              border-color:var(--gold); color:#151212;
              box-shadow:0 0 0 4px color-mix(in srgb, var(--gold) 25%, transparent);
              z-index:3;
            }
            .scrub-dot-agent { color:var(--gold); }
            .scrub-now {
              position:absolute; top:0; bottom:4px; width:1px;
              background:var(--gold); opacity:0.5; z-index:1;
              transform:translateX(-0.5px);
            }
            .scrub-now span {
              position:absolute; top:-2px; left:4px;
              font-family:var(--font-mono); font-size:9px;
              color:var(--gold); letter-spacing:0.1em; white-space:nowrap;
            }
            .scrub-playhead {
              position:absolute; top:20px; bottom:4px; width:2px;
              background:color-mix(in srgb, var(--gold) 70%, var(--text));
              z-index:2; transform:translateX(-1px);
              pointer-events:none;
            }
            .scrub-playhead-head {
              position:absolute; bottom:-18px; left:50%; transform:translateX(-50%);
              padding:2px 6px; background:var(--gold); color:#151212;
              border-radius:3px; font-size:10px;
              box-shadow:0 2px 6px rgba(0,0,0,0.3);
            }
            .scrub-playhead-head span { color:inherit; letter-spacing:0.05em; }
          `}</style>
        </div>
      )}

      {/* Kakejiku (vertical scroll per day) */}
      {view==='stack' && (
        <div style={{flex:1, padding:'0 40px 40px', minHeight:0, overflow:'auto'}}>
          <div style={{maxWidth:820, margin:'0 auto'}}>
            {events.map((e,i) => (
              <div key={i} className="row" style={{gap:24, padding:'18px 0', borderBottom:'1px solid var(--border)'}}>
                <div style={{width:60, textAlign:'right'}}>
                  <div className="t-mono" style={{fontSize:12, color:'var(--text)'}}>{e.t}</div>
                  {i%3===0 && <div className="jp" style={{fontSize:11, color:'var(--text-dim)', marginTop:2}}>{i<4?'朝':i<7?'昼':'夕'}</div>}
                </div>
                <div style={{width:1, background:'var(--border)', alignSelf:'stretch', position:'relative'}}>
                  <div style={{position:'absolute', left:-4, top:4, width:9, height:9, borderRadius:'50%', background: e.tag==='auto'?'var(--gold)':'var(--text)'}}/>
                </div>
                <div style={{flex:1}}>
                  <div className="row" style={{gap:8, marginBottom:4}}>
                    <Icon name={e.src==='chat'?'chat':e.src==='meet'?'calendar':e.src==='note'?'note':e.src==='mail'?'mail':e.src==='agent'?'bot':'file'} size={14} className="dim"/>
                    <span className="t-mono" style={{fontSize:10}}>{e.src}</span>
                    {e.dur && <span className="label" style={{height:18, fontSize:10}}>{e.dur}</span>}
                  </div>
                  <div style={{fontSize:15, fontWeight: e.big?500:400}}>{e.title}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Heatmap */}
      {view==='heatmap' && (
        <div style={{flex:1, padding:'0 40px 40px', minHeight:0, overflowY:'auto'}}>
          <div className="card" style={{padding:24}}>
            <div className="t-mono" style={{marginBottom:16}}>ACTIVITY HEATMAP · LAST 28 DAYS</div>
            <div style={{display:'grid', gridTemplateColumns:'repeat(28, 1fr)', gap:3}}>
              {Array.from({length:7*28}).map((_,i) => {
                const v = (i * 7 + 3) % 5;
                return <div key={i} style={{aspectRatio:1, background: v===0?'var(--surface-2)':`color-mix(in srgb, var(--gold) ${v*20}%, var(--surface))`, borderRadius:2}}/>
              })}
            </div>
            <div className="row" style={{marginTop:16, fontSize:11, color:'var(--text-dim)', gap:8}}>
              <span>Less</span>
              {[0,1,2,3,4].map(v => <div key={v} style={{width:12, height:12, background: v===0?'var(--surface-2)':`color-mix(in srgb, var(--gold) ${v*20}%, var(--surface))`, borderRadius:2}}/>)}
              <span>More</span>
              <span className="spacer"/>
              <span>Peak · Tuesday afternoons</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

window.ScreenHome = ScreenHome;
window.ScreenMemory = ScreenMemory;
