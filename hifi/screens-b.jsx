/* global Icon, Kamon, React */
const { useState: useStateB } = React;

function runRuntimeActionB(key, payload, options) {
  if (!window.SHOGUN_RUNTIME || !window.SHOGUN_RUNTIME.executeAction) return Promise.resolve({ ok:false });
  return window.SHOGUN_RUNTIME.executeAction(key, payload || {}, options || {});
}

// ═══════════════════════════════════════════════════════════════════════════
// L3 · CHAT — interaction layer (memory-aware conversations)
// ═══════════════════════════════════════════════════════════════════════════
function ScreenChat() {
  const [mode, setMode] = useStateB('active'); // 'empty' | 'active'
  const prompts = [
    {t:'Draft follow-ups from today', jp:'追跡'},
    {t:'What did Matt say about pricing?', jp:'価格'},
    {t:'Coach me before the 1:1', jp:'助言'},
    {t:'Summarize week in 5 bullets', jp:'要約'},
  ];

  if (mode === 'empty') {
    return (
      <div style={{display:'grid', gridTemplateColumns:'1fr', height:'100%', overflow:'hidden'}}>
        <div style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'40px 32px 80px', overflowY:'auto'}}>
          <div style={{maxWidth:680, width:'100%', textAlign:'center'}}>
            <div style={{width:64, height:64, margin:'0 auto 20px', borderRadius:'50%', background:'var(--surface)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center'}}>
              <Kamon size={28} color="var(--gold)"/>
            </div>
            <h1 style={{margin:0, fontSize:32, fontWeight:600, letterSpacing:'-0.02em'}}>
              What's on your mind?
              <span className="jp" style={{fontSize:20, marginLeft:12, color:'var(--text-mute)', fontWeight:300}}>対話</span>
            </h1>
            <div style={{marginTop:10, color:'var(--text-mute)', fontSize:14}}>
              SHOGUN reads from 12,408 memories to answer you. Ask anything.
            </div>

            {/* Hero composer */}
            <div className="chat-hero-composer" style={{marginTop:36}}>
              <div style={{padding:'16px 18px 4px', fontSize:15, color:'var(--text-dim)', textAlign:'left'}}>Ask anything · reference memory with @</div>
              <div className="row" style={{padding:'6px 14px 14px', gap:8}}>
                <button className="btn btn-sm btn-ghost" style={{padding:'0 8px'}} onClick={()=>runRuntimeActionB('memory.search', { query:'chat composer memory', limit:15 }, { successMessage:'Memory context loaded' })}><Icon name="memory" size={13}/>Memory</button>
                <button className="btn btn-sm btn-ghost" style={{padding:'0 8px'}} onClick={()=>runRuntimeActionB('schedule.create', { source:'chat_composer', action:'choose_agent' }, { successMessage:'Agent picker opened' })}><Icon name="agents" size={13}/>Agent</button>
                <button className="btn btn-sm btn-ghost" style={{padding:'0 8px'}} onClick={()=>runRuntimeActionB('integrations.connect', { source:'chat_composer', action:'choose_tool' }, { successMessage:'Tool picker opened' })}><Icon name="plug" size={13}/>Tool</button>
                <button className="btn btn-sm btn-ghost" style={{padding:'0 6px'}} onClick={()=>runRuntimeActionB('draft.create', { source:'chat_composer', action:'attach' }, { successMessage:'Attachment flow opened' })}><Icon name="paperclip" size={13}/></button>
                <span className="spacer"/>
                <span className="t-mono" style={{fontSize:10, color:'var(--text-mute)'}}>SONNET 4</span>
                <button className="btn btn-sm" style={{padding:'0 10px', background:'var(--gold)', color:'#151212', borderColor:'var(--gold)'}} onClick={()=>runRuntimeActionB('schedule.create', { source:'chat_composer', action:'voice_input' }, { successMessage:'Voice input started' })}><Icon name="mic" size={13}/></button>
                <button className="btn btn-sm btn-primary" onClick={()=>runRuntimeActionB('draft.create', { source:'chat_composer', action:'send_prompt' }, { successMessage:'Prompt sent' })}><Icon name="arrowRight" size={13}/></button>
              </div>
            </div>

            {/* Starters */}
            <div className="row" style={{gap:8, marginTop:18, flexWrap:'wrap', justifyContent:'center'}}>
              {prompts.map((p,i) => (
                <button key={i} onClick={()=>setMode('active')} className="btn btn-sm btn-ghost" style={{fontSize:12, height:28, padding:'0 12px', borderRadius:999, border:'1px dashed var(--border)', color:'var(--text-mute)'}}>
                  <span className="en-only">{p.t}</span>
                  <span className="jp" style={{fontSize:10, marginLeft:6}}>{p.jp}</span>
                </button>
              ))}
            </div>

            <div style={{marginTop:48, display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12, textAlign:'left'}}>
              {[
                {icon:'memory', k:'Grounded in memory', jp:'記憶', d:'Every answer cites the moments it came from.'},
                {icon:'shield', k:'Local first', jp:'守秘', d:'Conversations stay on your machine. Always.'},
                {icon:'agents', k:'Act, don\u2019t just answer', jp:'家臣', d:'Spawn agents mid-conversation to do the work.'},
              ].map((f,i) => (
                <div key={i} className="card" style={{padding:14}}>
                  <div className="row" style={{gap:8, marginBottom:6}}>
                    <Icon name={f.icon} size={13} className="gold"/>
                    <span style={{fontSize:12, fontWeight:500}}>{f.k}</span>
                    <span className="jp dim" style={{fontSize:10}}>{f.jp}</span>
                  </div>
                  <div style={{fontSize:11, color:'var(--text-mute)', lineHeight:1.5}}>{f.d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{display:'grid', gridTemplateColumns:'1fr 300px', height:'100%'}}>
      {/* Main chat */}
      <div style={{display:'flex', flexDirection:'column', overflow:'hidden'}}>
        <div style={{padding:'14px 32px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12}}>
          <button className="btn btn-sm btn-ghost" onClick={()=>setMode('empty')} style={{padding:'0 8px'}}><Icon name="plus" size={13}/>New</button>
          <div style={{width:1, height:20, background:'var(--border)'}}/>
          <div>
            <div style={{fontSize:14, fontWeight:500}}>Revenue-cat pricing tiers <span className="jp dim" style={{fontSize:11, marginLeft:6}}>価格</span></div>
            <div className="t-mono" style={{fontSize:9, marginTop:2}}>SONNET 4 · 42 MESSAGES · 14:02–14:48</div>
          </div>
          <span className="spacer"/>
          <span className="label label-gold"><Icon name="memory" size={10} style={{marginRight:4}}/>12 memories referenced</span>
          <button className="btn btn-sm btn-ghost" onClick={()=>runRuntimeActionB('settings.save', { section:'chat', action:'open_header_menu' }, { successMessage:'Header menu opened' })}><Icon name="more" size={14}/></button>
        </div>

        <div style={{flex:1, overflowY:'auto', padding:'32px 32px'}}>
          <div style={{maxWidth:720, margin:'0 auto', display:'flex', flexDirection:'column', gap:28}}>

            {/* Day divider */}
            <div className="row" style={{gap:10, margin:'0 auto 4px', color:'var(--text-dim)'}}>
              <span style={{height:1, width:40, background:'var(--border)'}}/>
              <span className="t-mono" style={{fontSize:10}}>APR 17 · 14:02</span>
              <span className="jp" style={{fontSize:10}}>今日</span>
              <span style={{height:1, width:40, background:'var(--border)'}}/>
            </div>

            {/* user */}
            <div style={{alignSelf:'flex-end', maxWidth:'80%'}}>
              <div style={{background:'var(--surface-2)', padding:'14px 18px', borderRadius:'var(--radius-lg) var(--radius-lg) 2px var(--radius-lg)', fontSize:14, lineHeight:1.6}}>
                Based on what Matt and I discussed last week, draft a three-tier pricing page for SHOGUN.
              </div>
              <div className="t-mono" style={{fontSize:10, marginTop:6, textAlign:'right', color:'var(--text-dim)'}}>14:02 · YOU</div>
            </div>

            {/* thinking trace */}
            <div style={{maxWidth:'90%', paddingLeft:2}}>
              <div className="row" style={{marginBottom:8, gap:8}}>
                <Kamon size={18} color="var(--gold)"/>
                <span style={{fontSize:11, color:'var(--gold)', fontWeight:500, letterSpacing:'0.1em'}}>SHOGUN</span>
                <span className="jp dim" style={{fontSize:11}}>将</span>
                <span className="t-mono" style={{fontSize:9, color:'var(--text-dim)'}}>THOUGHT FOR 3.2s</span>
              </div>
              <div className="thinking-trace">
                <div className="trace-step"><Icon name="memory" size={11} className="gold"/><span>Searched memory: "Matt + pricing + SHOGUN"</span><span className="t-mono dim" style={{fontSize:9, marginLeft:'auto'}}>18 HITS</span></div>
                <div className="trace-step"><Icon name="filter" size={11} className="gold"/><span>Filtered to last 14 days</span><span className="t-mono dim" style={{fontSize:9, marginLeft:'auto'}}>12 KEPT</span></div>
                <div className="trace-step"><Icon name="note" size={11} className="gold"/><span>Cross-referenced with Rev-cat chat, Pricing draft</span></div>
              </div>
            </div>

            {/* assistant with memory chips */}
            <div style={{maxWidth:'90%'}}>
              <div style={{fontSize:14.5, lineHeight:1.75, color:'var(--text)'}}>
                Pulling from your conversations with Matt and the Revenue-cat team — here's a draft that reflects the tiering you already agreed on. I kept the annual discount at the number you settled on with Jacob (21%).
              </div>
              {/* memory cite chips */}
              <div className="row" style={{gap:6, marginTop:14, flexWrap:'wrap'}}>
                {[
                  ['Matt 1-on-1', 'APR 14', '3 quotes'],
                  ['Rev-cat chat', 'APR 17', '5 quotes'],
                  ['Pricing draft', 'APR 10', '4 quotes'],
                ].map(([t,d,q],i)=>(
                  <div key={i} className="memory-chip">
                    <Icon name="memory" size={11} className="gold"/>
                    <span>{t}</span>
                    <span className="t-mono" style={{fontSize:9, color:'var(--text-dim)'}}>{d}</span>
                    <span className="t-mono" style={{fontSize:9, color:'var(--gold)'}}>{q}</span>
                  </div>
                ))}
              </div>
              {/* artifact card */}
              <div className="card artifact-card" style={{marginTop:18, padding:0, overflow:'hidden'}}>
                <div style={{padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10, background:'var(--surface-2)'}}>
                  <Icon name="file" size={14} className="gold"/>
                  <span style={{fontSize:13, fontWeight:500}}>pricing-page-draft.md</span>
                  <span className="t-mono dim" style={{fontSize:9}}>847 WORDS · 3 TIERS</span>
                  <span className="spacer"/>
                  <button className="btn btn-sm btn-ghost" onClick={()=>runRuntimeActionB('draft.create', { source:'chat_artifact', file:'pricing-page-draft.md' }, { successMessage:'Opened in Work' })}>Open in Work <Icon name="arrowUpRight" size={12}/></button>
                </div>
                <div style={{padding:20, fontFamily:'var(--font-mono)', fontSize:12, lineHeight:1.8, color:'var(--text-mute)'}}>
                  <div style={{color:'var(--text)'}}># SHOGUN Pricing</div>
                  <div>&nbsp;</div>
                  <div><span className="gold">##</span> <span style={{color:'var(--text)'}}>Plus — $17/mo</span></div>
                  <div>— Memory layer (unlimited)</div>
                  <div>— 5 agents, BYOK</div>
                  <div>&nbsp;</div>
                  <div><span className="gold">##</span> <span style={{color:'var(--text)'}}>Pro — $62/mo · $49/mo annual</span></div>
                  <div>— Everything in Plus</div>
                  <div>— Dream cycle, priority capture</div>
                  <div style={{opacity:0.5, marginTop:8, fontSize:10}}>... 28 more lines</div>
                </div>
                <div style={{padding:'10px 16px', borderTop:'1px solid var(--border)', display:'flex', gap:8, background:'var(--bg)'}}>
                  <button className="btn btn-sm btn-ghost" style={{padding:'0 8px', fontSize:11}} onClick={()=>runRuntimeActionB('draft.create', { action:'accept_artifact' }, { successMessage:'Artifact accepted' })}><Icon name="check" size={11}/>Accept</button>
                  <button className="btn btn-sm btn-ghost" style={{padding:'0 8px', fontSize:11}} onClick={()=>runRuntimeActionB('draft.create', { action:'reject_artifact' }, { successMessage:'Artifact rejected' })}><Icon name="x" size={11}/>Reject</button>
                  <span className="spacer"/>
                  <button className="btn btn-sm btn-ghost" style={{padding:'0 8px', fontSize:11}} onClick={()=>runRuntimeActionB('draft.create', { action:'iterate_artifact' }, { successMessage:'Iteration request queued' })}>Iterate <Icon name="arrowRight" size={10}/></button>
                </div>
              </div>

              {/* Assistant actions */}
              <div className="row" style={{gap:4, marginTop:12, color:'var(--text-dim)'}}>
                <button className="msg-action" onClick={()=>runRuntimeActionB('draft.create', { action:'approve_reply' }, { successMessage:'Reply approved' })}><Icon name="check" size={12}/></button>
                <button className="msg-action" onClick={()=>runRuntimeActionB('draft.create', { action:'copy_reply' }, { successMessage:'Copied to clipboard buffer' })}><Icon name="file" size={12}/>Copy</button>
                <button className="msg-action" onClick={()=>runRuntimeActionB('schedule.create', { action:'spawn_agent', source:'chat' }, { successMessage:'Agent scheduled' })}><Icon name="agents" size={12}/>Spawn agent</button>
                <button className="msg-action" onClick={()=>runRuntimeActionB('settings.save', { section:'memory', action:'save_from_chat' }, { successMessage:'Saved to memory queue' })}><Icon name="memory" size={12}/>Save to memory</button>
                <span className="spacer"/>
                <span className="t-mono" style={{fontSize:9}}>14:02 · 2,180 TOKENS</span>
              </div>
            </div>

            {/* follow-up user */}
            <div style={{alignSelf:'flex-end', maxWidth:'80%'}}>
              <div style={{background:'var(--surface-2)', padding:'12px 16px', borderRadius:'var(--radius-lg) var(--radius-lg) 2px var(--radius-lg)', fontSize:14, lineHeight:1.6}}>
                Tighten the Pro tier copy. Make it feel more decisive.
              </div>
              <div className="t-mono" style={{fontSize:10, marginTop:6, textAlign:'right', color:'var(--text-dim)'}}>14:05 · YOU</div>
            </div>

            {/* streaming response */}
            <div style={{maxWidth:'90%'}}>
              <div className="row" style={{marginBottom:8, gap:8}}>
                <Kamon size={18} color="var(--gold)"/>
                <span style={{fontSize:11, color:'var(--gold)', fontWeight:500, letterSpacing:'0.1em'}}>SHOGUN</span>
                <span className="t-mono" style={{fontSize:9, color:'var(--text-dim)'}}>WRITING…</span>
                <div className="streaming-dots"><span/><span/><span/></div>
              </div>
              <div style={{fontSize:14.5, lineHeight:1.75, color:'var(--text)'}}>
                Here's a tighter Pro tier. I pulled your voice from the Rev-cat chat where you said "pricing shouldn't apologize for itself"<span className="cursor-caret"/>
              </div>
            </div>

          </div>
        </div>

        {/* Composer */}
        <div className="composer-wrap">
          <div style={{maxWidth:720, margin:'0 auto'}}>
            <div className="composer">
              <div style={{fontSize:14, color:'var(--text)', padding:'4px 0 12px'}}>Reply · <span style={{color:'var(--text-dim)'}}>reference memory with @</span></div>
              <div className="row" style={{gap:8}}>
                <button className="btn btn-sm btn-ghost" style={{padding:'0 8px'}} onClick={()=>runRuntimeActionB('memory.search', { query:'reply memory context', limit:10 }, { successMessage:'Memory context loaded' })}><Icon name="memory" size={13}/>Memory</button>
                <button className="btn btn-sm btn-ghost" style={{padding:'0 8px'}} onClick={()=>runRuntimeActionB('schedule.create', { source:'reply_composer', action:'choose_agent' }, { successMessage:'Agent picker opened' })}><Icon name="agents" size={13}/>Agent</button>
                <button className="btn btn-sm btn-ghost" style={{padding:'0 8px'}} onClick={()=>runRuntimeActionB('integrations.connect', { source:'reply_composer', action:'choose_tool' }, { successMessage:'Tool picker opened' })}><Icon name="plug" size={13}/>Tool</button>
                <button className="btn btn-sm btn-ghost" style={{padding:'0 6px'}} onClick={()=>runRuntimeActionB('draft.create', { source:'reply_composer', action:'attach' }, { successMessage:'Attachment flow opened' })}><Icon name="paperclip" size={13}/></button>
                <span className="spacer"/>
                <span className="t-mono" style={{fontSize:10, color:'var(--text-mute)'}}>SONNET 4</span>
                <button className="btn btn-sm" style={{padding:'0 10px', background:'var(--surface-2)', color:'var(--text)'}} onClick={()=>runRuntimeActionB('schedule.create', { source:'reply_composer', action:'voice_input' }, { successMessage:'Voice input started' })}><Icon name="mic" size={13}/></button>
                <button className="btn btn-sm btn-primary" onClick={()=>runRuntimeActionB('draft.create', { source:'reply_composer', action:'send_reply' }, { successMessage:'Reply sent' })}><Icon name="arrowRight" size={13}/></button>
              </div>
            </div>
            <div className="t-mono" style={{fontSize:9, marginTop:8, textAlign:'center', color:'var(--text-dim)'}}>
              SHOGUN READS FROM 12,408 MEMORIES · LOCAL
              <span className="jp" style={{marginLeft:10}}>記憶より</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right rail — memory context */}
      <div style={{borderLeft:'1px solid var(--border)', overflowY:'auto', padding:'20px 20px', background:'var(--surface)'}}>
        <div className="row" style={{marginBottom:14}}>
          <span className="t-mono">CONTEXT</span>
          <span className="jp dim" style={{fontSize:10, marginLeft:6}}>文脈</span>
          <span className="spacer"/>
          <button className="btn btn-sm btn-ghost" style={{padding:'0 4px'}} onClick={()=>runRuntimeActionB('settings.save', { section:'context', action:'open_menu' }, { successMessage:'Context menu opened' })}><Icon name="more" size={12}/></button>
        </div>

        <div className="ctx-block">
          <div className="ctx-head">TOPICS</div>
          <div className="row" style={{flexWrap:'wrap', gap:4}}>
            {['pricing','SHOGUN','revenue-cat','tiering'].map(t => (
              <span key={t} className="ctx-chip">#{t}</span>
            ))}
          </div>
        </div>

        <div className="ctx-block">
          <div className="ctx-head">ENTITIES</div>
          <div style={{display:'flex', flexDirection:'column', gap:6}}>
            {[['Matt','person','18'],['Toru','org','32'],['Pricing','concept','11'],['Jacob','person','7']].map((e,i)=>(
              <div key={i} className="ctx-entity">
                <div className="ctx-entity-avatar" style={{color: e[1]==='person'?'var(--gold)':'var(--text-mute)'}}>
                  {e[1]==='person'?<Icon name="users" size={10}/>:e[1]==='org'?<Icon name="shield" size={10}/>:<Icon name="tag" size={10}/>}
                </div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:12, fontWeight:500}}>{e[0]}</div>
                  <div style={{fontSize:10, color:'var(--text-dim)'}}>{e[1]} · {e[2]} memories</div>
                </div>
                <Icon name="arrowUpRight" size={10} className="dim"/>
              </div>
            ))}
          </div>
        </div>

        <div className="ctx-block">
          <div className="ctx-head">ACTIONS</div>
          <div style={{display:'flex', flexDirection:'column', gap:6}}>
            <button className="btn btn-sm btn-secondary" style={{justifyContent:'flex-start', fontSize:12}} onClick={()=>runRuntimeActionB('draft.create', { source:'context_panel', action:'save_work' }, { successMessage:'Saved to Work queue' })}><Icon name="file" size={12}/>Save to Work</button>
            <button className="btn btn-sm btn-secondary" style={{justifyContent:'flex-start', fontSize:12}} onClick={()=>runRuntimeActionB('schedule.create', { source:'context_panel', action:'follow_up' }, { successMessage:'Follow-up scheduled' })}><Icon name="calendar" size={12}/>Schedule follow-up</button>
            <button className="btn btn-sm btn-secondary" style={{justifyContent:'flex-start', fontSize:12}} onClick={()=>runRuntimeActionB('schedule.create', { source:'context_panel', action:'spawn_agent' }, { successMessage:'Agent scheduled' })}><Icon name="agents" size={12}/>Spawn agent</button>
            <button className="btn btn-sm btn-secondary" style={{justifyContent:'flex-start', fontSize:12}} onClick={()=>runRuntimeActionB('app.create_share_link', { source:'context_panel' }, { successMessage:'Share link prepared' })}><Icon name="upload" size={12}/>Share</button>
          </div>
        </div>
      </div>

      {/* Scoped styles for ScreenChat */}
      <style>{`
        .chat-hero-composer {
          border:1px solid var(--border-hi); background:var(--surface);
          border-radius:var(--radius-lg);
          box-shadow:0 2px 0 rgba(0,0,0,0.2), 0 20px 40px -20px rgba(0,0,0,0.35);
        }
        .thinking-trace {
          border:1px solid var(--border); border-radius:var(--radius-md);
          background:var(--surface); padding:8px 4px;
        }
        .trace-step {
          display:flex; align-items:center; gap:10px;
          padding:6px 12px; font-size:12px; color:var(--text-mute);
        }
        .trace-step + .trace-step { border-top:1px dashed var(--border); }
        .trace-step .dim { opacity:0.7; }
        .memory-chip {
          display:inline-flex; align-items:center; gap:8px;
          padding:6px 10px;
          background:var(--surface); border:1px solid var(--gold-dim);
          border-radius:var(--radius-sm); font-size:11px;
          cursor:pointer; transition:border-color 120ms;
        }
        .memory-chip:hover { border-color:var(--gold); }
        .artifact-card { border-color:var(--gold-dim); }
        .msg-action {
          display:inline-flex; align-items:center; gap:5px;
          padding:4px 8px; border-radius:var(--radius-sm);
          background:transparent; border:1px solid transparent;
          color:var(--text-dim); font-size:11px; cursor:pointer;
        }
        .msg-action:hover { color:var(--text); background:var(--surface-2); border-color:var(--border); }
        .composer-wrap { padding:16px 32px 24px; border-top:1px solid var(--border); background:var(--bg); }
        .composer {
          border:1px solid var(--border-hi); border-radius:var(--radius-lg);
          padding:12px 14px; background:var(--surface);
          box-shadow:0 1px 0 rgba(0,0,0,0.2);
        }
        .composer:focus-within { border-color:var(--gold-dim); }
        .streaming-dots { display:inline-flex; gap:3px; margin-left:4px; }
        .streaming-dots span {
          width:4px; height:4px; border-radius:50%; background:var(--gold);
          animation: stream 1.2s infinite ease-in-out;
        }
        .streaming-dots span:nth-child(2) { animation-delay:0.15s; }
        .streaming-dots span:nth-child(3) { animation-delay:0.3s; }
        @keyframes stream { 0%,80%,100% {opacity:0.3;} 40% {opacity:1;} }
        .cursor-caret {
          display:inline-block; width:2px; height:14px; background:var(--gold);
          vertical-align:text-bottom; margin-left:2px;
          animation: blink 1s steps(2, start) infinite;
        }
        @keyframes blink { to { opacity:0; } }
        .ctx-block { margin-bottom:22px; }
        .ctx-head {
          font-family:var(--font-mono); font-size:10px;
          letter-spacing:0.14em; color:var(--text-dim);
          margin-bottom:10px;
        }
        .ctx-chip {
          font-size:11px; color:var(--text-mute);
          padding:3px 8px; background:var(--bg);
          border:1px solid var(--border); border-radius:3px;
        }
        .ctx-entity {
          display:flex; align-items:center; gap:10px;
          padding:8px 10px; border:1px solid var(--border);
          border-radius:var(--radius-sm); background:var(--bg);
          cursor:pointer; transition:border-color 120ms;
        }
        .ctx-entity:hover { border-color:var(--border-hi); }
        .ctx-entity-avatar {
          width:22px; height:22px; flex-shrink:0;
          display:flex; align-items:center; justify-content:center;
          background:var(--surface-2); border:1px solid var(--border);
          border-radius:50%;
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// L4 · AGENTS — execution layer
// ═══════════════════════════════════════════════════════════════════════════
function ScreenAgents() {
  return (
    <div className="content-inner">
      <div className="page-head">
        <div>
          <div className="t-mono" style={{marginBottom:8}}>EXECUTION LAYER</div>
          <h1>Agents <span className="jp">家臣</span></h1>
          <div className="sub">Agents that read your memory and act. 20 MCP tools available.</div>
        </div>
        <div className="row">
          <button className="btn btn-secondary" onClick={()=>runRuntimeActionB('settings.save', { section:'agents', action:'open_mcp_console' }, { successMessage:'MCP console opened' })}><Icon name="terminal" size={14}/>MCP console</button>
          <button className="btn btn-primary" onClick={()=>runRuntimeActionB('schedule.create', { source:'agents', action:'new_agent' }, { successMessage:'Agent creation started' })}><Icon name="plus" size={14}/>New agent</button>
        </div>
      </div>

      {/* Status overview */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:16, marginBottom:32}}>
        {[
          ['Running','4','var(--success)'],
          ['Scheduled','7','var(--gold)'],
          ['Paused','2','var(--text-dim)'],
          ['Tools connected','20','var(--text)'],
        ].map((s,i)=>(
          <div key={i} className="card" style={{padding:20}}>
            <div className="t-mono" style={{marginBottom:10}}>{s[0]}</div>
            <div style={{fontSize:36, fontWeight:600, color: s[2], letterSpacing:'-0.02em'}}>{s[1]}</div>
          </div>
        ))}
      </div>

      {/* Agent grid */}
      <div style={{fontSize:13, fontWeight:500, marginBottom:14, color:'var(--text-mute)'}}>Your agents</div>
      <div style={{display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:16, marginBottom:32}}>
        {[
          {name:'Inbox triage', jp:'受信整理', desc:'Sorts Gmail by memory-derived priority. Drafts replies for you to approve.', status:'running', schedule:'every 2 hours', tools:['mail','memory'], runs:142, icon:'mail'},
          {name:'Meeting notes', jp:'議事録', desc:'Captures calendar events, extracts decisions into memory, links to entities.', status:'idle', schedule:'trigger: cal event', tools:['calendar','memory'], runs:87, icon:'calendar'},
          {name:'Daily digest', jp:'日報', desc:'Synthesizes the day at 21:00. Writes a morning brief for tomorrow at 07:00.', status:'scheduled', schedule:'21:00 daily', tools:['memory','note'], runs:38, icon:'note'},
          {name:'Weekly review', jp:'週次', desc:'Sunday morning. What moved this week? What needs decisions. Drafts a retro.', status:'scheduled', schedule:'Sun 10:00', tools:['memory','note','calendar'], runs:5, icon:'clock'},
        ].map((a,i)=>(
          <div key={i} className="card card-hover" style={{padding:0, overflow:'hidden'}}>
            <div style={{padding:'18px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12}}>
              <div style={{width:36, height:36, border:'1px solid var(--border)', borderRadius:'var(--radius-md)', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--surface-2)'}}>
                <Icon name={a.icon} size={16} className="gold"/>
              </div>
              <div style={{flex:1}}>
                <div className="row" style={{gap:8}}>
                  <span style={{fontSize:14, fontWeight:500}}>{a.name}</span>
                  <span className="jp muted" style={{fontSize:11}}>{a.jp}</span>
                </div>
                <div className="row" style={{gap:6, marginTop:4}}>
                  <span className="dot" style={{width:6, height:6, borderRadius:'50%', background: a.status==='running'?'var(--success)':a.status==='idle'?'var(--text-dim)':'var(--gold)'}}/>
                  <span className="t-mono" style={{fontSize:10, textTransform:'none', letterSpacing:'0.05em', color:'var(--text-mute)'}}>{a.status} · {a.schedule}</span>
                </div>
              </div>
              <button className="btn btn-sm btn-ghost" onClick={()=>runRuntimeActionB('settings.save', { section:'agents', action:'agent_row_menu', agent:a.name }, { successMessage:'Agent menu opened' })}><Icon name="more" size={14}/></button>
            </div>
            <div style={{padding:'16px 20px', fontSize:13, color:'var(--text-mute)', lineHeight:1.5}}>
              {a.desc}
            </div>
            <div style={{padding:'12px 20px', borderTop:'1px solid var(--border)', background:'var(--surface-2)', display:'flex', alignItems:'center', gap:8}}>
              <span className="t-mono" style={{fontSize:10}}>{a.runs} RUNS</span>
              <span className="spacer"/>
              {a.tools.map(t => <span key={t} className="label"><Icon name={t} size={10} style={{marginRight:4}}/>{t}</span>)}
            </div>
          </div>
        ))}
      </div>

      {/* Live activity log */}
      <div style={{fontSize:13, fontWeight:500, marginBottom:14, color:'var(--text-mute)'}}>Live activity</div>
      <div className="card" style={{padding:0, fontFamily:'var(--font-mono)', fontSize:12, background:'var(--bg)'}}>
        {[
          ['14:31:08', 'inbox-triage', 'Read 3 emails · drafted 1 reply', 'success'],
          ['14:18:42', 'meeting-notes', 'Processed "All PJ" meeting · 6 decisions extracted', 'success'],
          ['14:02:15', 'memory', 'Indexed conversation · 42 messages · 3 entities linked', 'info'],
          ['13:58:00', 'meeting-notes', 'Triggered by cal event: All PJ', 'info'],
          ['13:22:44', 'inbox-triage', 'Skipped · no new emails since 11:00', 'muted'],
        ].map((r,i) => (
          <div key={i} className="row" style={{padding:'10px 20px', borderBottom:i<4?'1px solid var(--border)':'none', gap:14}}>
            <span style={{color:'var(--text-dim)', fontSize:11}}>{r[0]}</span>
            <span className="gold" style={{minWidth:120}}>{r[1]}</span>
            <span style={{flex:1, color: r[3]==='muted'?'var(--text-dim)':'var(--text)'}}>{r[2]}</span>
            <span className="label" style={{background:'transparent', color: r[3]==='success'?'var(--success)':r[3]==='info'?'var(--text-mute)':'var(--text-dim)', borderColor: r[3]==='success'?'color-mix(in srgb, var(--success) 40%, transparent)':'var(--border)'}}>{r[3].toUpperCase()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

window.ScreenChat = ScreenChat;
window.ScreenAgents = ScreenAgents;
