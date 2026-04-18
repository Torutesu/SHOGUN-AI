// L2 MEMORY — Index, Detail, Timeline (HERO), Graph, Search, Entity, Dream Cycle
window.L2Screens = [
  {
    code: 'M1', jp: 'メモリ インデックス', title: 'Memory Index',
    desc: 'Master list of all stored data, with filters (source, entity, period).',
    variants: [
      { label: 'A — Dense table', kind: 'Power-user list', render: MemIndexA },
      { label: 'B — Card feed', kind: 'Browsable feed', render: MemIndexB },
    ],
  },
  {
    code: 'M2', jp: 'メモリの詳細', title: 'Memory Detail',
    desc: 'Full text, linked memories, source metadata, edit, tag.',
    variants: [
      { label: 'A — Three-pane', kind: 'List + body + meta', render: MemDetailA },
      { label: 'B — Focus reader', kind: 'Single column, meta below', render: MemDetailB },
    ],
  },
  {
    code: 'M3', jp: 'タイムライン', title: 'Timeline ★',
    desc: 'Chronological view. Hero screen — 2 variants with richer exploration.',
    variants: [
      { label: 'A — Horizontal river', kind: 'Scrub through time', render: MemTimelineA },
      { label: 'B — Day columns (kakejiku)', kind: 'Vertical scroll per day', render: MemTimelineB },
    ],
  },
  {
    code: 'M4', jp: 'ナレッジ グラフ', title: 'Knowledge Graph',
    desc: 'Entity relationship diagram (people, projects, concepts).',
    variants: [
      { label: 'A — Force graph + inspector', kind: 'Classic', render: MemGraphA },
      { label: 'B — Constellation map', kind: 'Spatial, starry', render: MemGraphB },
    ],
  },
  {
    code: 'M5', jp: 'メモリ検索', title: 'Memory Search',
    desc: 'Hybrid search (fulltext + semantic), filters, AI summary.',
    variants: [
      { label: 'A — Command bar first', kind: 'Keyboard-native', render: MemSearchA },
      { label: 'B — Query + summary split', kind: 'Answer on top', render: MemSearchB },
    ],
  },
  {
    code: 'M6', jp: 'エンティティ プロファイル', title: 'Entity Profile',
    desc: 'Aggregated memories tied to a person, project, or concept.',
    variants: [
      { label: 'A — Dossier layout', kind: 'Biographical', render: MemEntityA },
      { label: 'B — Timeline of interactions', kind: 'Interaction-first', render: MemEntityB },
    ],
  },
  {
    code: 'M7', jp: 'ドリーム サイクル', title: 'Dream Cycle',
    desc: 'Batch processing status: rebuild, summarize, relink progress.',
    variants: [
      { label: 'A — Status dashboard', kind: 'Progress bars, logs', render: MemDreamA },
      { label: 'B — Ambient night view', kind: 'Poetic, minimal', render: MemDreamB },
    ],
  },
];

function MemSidebar({ active }) {
  const items = ['Index','Detail','Timeline','Graph','Search','Entities','Dream'];
  return (
    <div className="wf-sidebar">
      <div className="brand jp">記憶</div>
      <div className="section">Memory</div>
      {items.map(n => <div key={n} className={'item' + (n===active?' active':'')}>{n}</div>)}
      <div className="section">Filters</div>
      <div className="item small">Last 7 days</div>
      <div className="item small">All sources</div>
      <div className="spacer"/>
      <div className="xsmall muted" style={{padding:6}}>12,408 memories</div>
    </div>
  );
}

function MemIndexA() {
  const rows = [
    ['14:02','Chat','Revenue-cat CTO pricing notes','work · pricing'],
    ['13:20','Meeting','All PJ / Tano + Matt','work · shogun'],
    ['11:37','Capture','Notion doc: 100倍ユーザー','research'],
    ['10:49','Chat','Speak · product ideas','research'],
    ['09:58','Email','Elevenlabs intro thread','intros'],
    ['Yesterday','Chat','SHOGUN IA draft feedback','work · shogun'],
    ['Apr 16','Meeting','Grop使','work'],
  ];
  return (
    <div className="wf">
      <MemSidebar active="Index" />
      <div className="wf-main">
        <div className="topbar">
          <h4>Memory Index <span className="jp">記憶目録</span></h4>
          <div className="row gap4"><span className="pill">source ▾</span><span className="pill">entity ▾</span><span className="pill">period ▾</span></div>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'60px 60px 1fr 120px 16px', gap:8, padding:'4px 0', borderBottom:'1px solid var(--line)', fontFamily:'JetBrains Mono', fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--ink-4)'}}>
          <span>Time</span><span>Source</span><span>Title</span><span>Tags</span><span/>
        </div>
        <div style={{overflow:'hidden', flex:1}}>
          {rows.map((r,i)=>(
            <div key={i} style={{display:'grid', gridTemplateColumns:'60px 60px 1fr 120px 16px', gap:8, padding:'5px 0', borderBottom:'1px dashed var(--line-2)', fontSize:10, alignItems:'center'}}>
              <span className="muted mono" style={{fontSize:9}}>{r[0]}</span>
              <span className="mono" style={{fontSize:9}}>{r[1]}</span>
              <span>{r[2]}</span>
              <span className="xsmall muted">{r[3]}</span>
              <span className="muted">→</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MemIndexB() {
  return (
    <div className="wf">
      <MemSidebar active="Index" />
      <div className="wf-main">
        <div className="topbar">
          <h4>Memory <span className="jp">記憶</span></h4>
          <span className="pill dot">12,408 total</span>
        </div>
        <div className="xsmall muted">TODAY · APR 17</div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, flex:1, minHeight:0}}>
          {[
            ['Revenue-cat CTO','Discussed tiered usage pricing…','14:02 · chat'],
            ['All PJ meeting','Matt shared roadmap for Q2…','13:20 · meeting'],
            ['Notion: 100倍ユーザー','Framework for compound growth…','11:37 · capture'],
            ['Speak product ideas','Three angles on pronunciation…','10:49 · chat'],
          ].map((c,i)=>(
            <div key={i} className="card" style={{padding:8}}>
              <div className="row" style={{justifyContent:'space-between'}}>
                <div style={{fontSize:11, fontWeight:500}}>{c[0]}</div>
                <span className="ic"/>
              </div>
              <div className="small muted" style={{margin:'4px 0', lineHeight:1.3}}>{c[1]}</div>
              <div className="xsmall muted">{c[2]}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MemDetailA() {
  return (
    <div className="wf">
      <div className="wf-sidebar" style={{width:120}}>
        <div className="brand jp">記憶</div>
        <div className="xsmall muted" style={{padding:'4px 6px'}}>TODAY</div>
        {['Revenue-cat CTO','All PJ meeting','Notion doc','Speak ideas','Elevenlabs'].map((t,i)=>(
          <div key={i} className={'item' + (i===0?' active':'')} style={{fontSize:9}}>{t}</div>
        ))}
      </div>
      <div className="wf-main">
        <div className="topbar">
          <div><h4>Revenue-cat CTO</h4><div className="xsmall muted">CHAT · APR 17 · 14:02</div></div>
          <div className="row gap4"><span className="pill">Edit</span><span className="pill">Tag</span><span className="pill">⋯</span></div>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'1.6fr 1fr', gap:12, flex:1, minHeight:0}}>
          <div className="col gap4" style={{fontSize:10, lineHeight:1.5}}>
            <div className="bar lite" style={{width:'100%'}}/>
            <div className="bar lite" style={{width:'96%'}}/>
            <div className="bar lite" style={{width:'92%'}}/>
            <div className="bar lite" style={{width:'70%'}}/>
            <div style={{height:6}}/>
            <div className="bar lite" style={{width:'88%'}}/>
            <div className="bar lite" style={{width:'94%'}}/>
            <div className="bar lite" style={{width:'60%'}}/>
          </div>
          <div className="col gap6">
            <h5>Linked · 4</h5>
            <div className="card" style={{padding:'4px 8px', fontSize:9}}>SHOGUN pricing draft</div>
            <div className="card" style={{padding:'4px 8px', fontSize:9}}>Matt · 1-on-1 notes</div>
            <h5 style={{marginTop:6}}>Entities</h5>
            <div className="row gap4"><span className="pill">Matt</span><span className="pill">Pricing</span><span className="pill">Revenue-cat</span></div>
            <h5 style={{marginTop:6}}>Source</h5>
            <div className="xsmall muted">Chat · Claude · 42 msgs · 14:02–14:48</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MemDetailB() {
  return (
    <div className="wf">
      <div className="wf-main" style={{padding:'16px 80px', maxWidth:'none'}}>
        <div className="xsmall muted">← BACK · APR 17 · 14:02</div>
        <div className="serif" style={{fontSize:20, margin:'6px 0'}}>Revenue-cat CTO · pricing notes</div>
        <div className="row gap4 xsmall muted">
          <span>chat</span><span>·</span><span>42 messages</span><span>·</span><span>3 entities</span>
        </div>
        <div className="line" style={{margin:'12px 0'}}/>
        <div className="col gap4">
          <div className="bar lite" style={{width:'100%'}}/>
          <div className="bar lite" style={{width:'94%'}}/>
          <div className="bar lite" style={{width:'98%'}}/>
          <div className="bar lite" style={{width:'72%'}}/>
          <div style={{height:4}}/>
          <div className="bar lite" style={{width:'88%'}}/>
          <div className="bar lite" style={{width:'65%'}}/>
        </div>
        <div className="line" style={{margin:'12px 0'}}/>
        <div className="row gap8 xsmall muted">
          <span>→ Linked (4)</span><span>→ Source</span><span>→ Edit</span><span>→ Tag</span><span style={{marginLeft:'auto'}}>⌘E to edit</span>
        </div>
      </div>
    </div>
  );
}

function MemTimelineA() {
  // horizontal river
  return (
    <div className="wf">
      <MemSidebar active="Timeline"/>
      <div className="wf-main">
        <div className="topbar">
          <h4>Timeline <span className="jp">時間軸</span></h4>
          <div className="row gap4"><span className="pill solid">Day</span><span className="pill">Week</span><span className="pill">Month</span></div>
        </div>
        <div className="xsmall muted">APRIL 17 · FRIDAY</div>
        <div style={{position:'relative', flex:1, minHeight:0, padding:'20px 0'}}>
          {/* hour axis */}
          <div style={{position:'absolute', top:'50%', left:0, right:0, height:1, background:'var(--ink)'}}/>
          {['06','09','12','15','18','21'].map((h,i)=>(
            <div key={h} style={{position:'absolute', left:`${i*18+4}%`, top:'calc(50% + 6px)', fontFamily:'JetBrains Mono', fontSize:9, color:'var(--ink-4)'}}>{h}:00</div>
          ))}
          {/* events */}
          {[
            [8, 0.12, 'chat', 'Morning brief'],
            [22, 0.32, 'meet', 'All PJ'],
            [14, 0.50, 'chat', 'Revenue-cat'],
            [16, 0.62, 'capt', 'Notion'],
            [12, 0.78, 'mail', 'Elevenlabs'],
          ].map((e,i)=>(
            <div key={i} style={{position:'absolute', left:`${e[1]*100}%`, top:`calc(50% - ${e[0]+10}px)`}}>
              <div className="card" style={{padding:'3px 6px', fontSize:9, whiteSpace:'nowrap'}}>
                <span className="mono xsmall">{e[2]}</span> · {e[3]}
              </div>
              <div style={{width:1, height:e[0]+6, background:'var(--ink-4)', margin:'0 auto'}}/>
              <div style={{width:5, height:5, background:'var(--ink)', borderRadius:'50%', margin:'-2px auto 0'}}/>
            </div>
          ))}
        </div>
        <div className="row" style={{justifyContent:'space-between', borderTop:'1px solid var(--line)', paddingTop:6}}>
          <span className="xsmall muted">← THU · APR 16</span>
          <span className="xsmall muted">23 memories today</span>
          <span className="xsmall muted">SAT · APR 18 →</span>
        </div>
      </div>
    </div>
  );
}

function MemTimelineB() {
  // kakejiku - vertical scroll per day, Japanese scroll metaphor
  const hours = [
    ['07:00','朝','Morning brief ran',''],
    ['09:12','','Chat · Terminal',''],
    ['10:30','','Meeting: Grop使','25m'],
    ['11:37','昼','Captured Notion doc',''],
    ['13:20','','All PJ meeting','42m'],
    ['14:02','','Revenue-cat pricing',''],
    ['17:00','夕','Inbox triage ran',''],
    ['19:42','夜','Evening digest',''],
  ];
  return (
    <div className="wf">
      <MemSidebar active="Timeline"/>
      <div className="wf-main">
        <div className="topbar">
          <h4>Timeline <span className="jp">掛軸</span></h4>
          <div className="row gap4"><span className="pill">← Apr 16</span><span className="pill solid">Apr 17</span><span className="pill">Apr 18 →</span></div>
        </div>
        <div style={{flex:1, minHeight:0, overflow:'hidden', display:'grid', gridTemplateColumns:'40px 1px 1fr', gap:10}}>
          <div className="col gap4">
            {hours.map((h,i)=>(
              <div key={i} className="mono xsmall" style={{height:28, display:'flex', alignItems:'center'}}>{h[0]}</div>
            ))}
          </div>
          <div style={{background:'var(--ink)', margin:'6px 0'}}/>
          <div className="col gap4">
            {hours.map((h,i)=>(
              <div key={i} style={{height:28, display:'flex', alignItems:'center', gap:8, borderBottom:'1px dashed var(--line-2)'}}>
                {h[1] && <span className="jp" style={{fontSize:10, color:'var(--ink-4)', width:14}}>{h[1]}</span>}
                {!h[1] && <span style={{width:14}}/>}
                <span style={{fontSize:10, flex:1}}>{h[2]}</span>
                {h[3] && <span className="xsmall muted">{h[3]}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MemGraphA() {
  return (
    <div className="wf">
      <MemSidebar active="Graph"/>
      <div className="wf-main" style={{padding:0}}>
        <div className="topbar" style={{padding:'10px 14px'}}>
          <h4>Graph <span className="jp">関係図</span></h4>
          <div className="row gap4"><span className="pill">People</span><span className="pill">Projects</span><span className="pill">Concepts</span></div>
        </div>
        <div style={{flex:1, position:'relative', background:'var(--paper-3)'}}>
          <svg viewBox="0 0 400 200" style={{width:'100%', height:'100%'}}>
            <g stroke="#a8a8a8" strokeWidth="0.5" fill="none">
              <line x1="200" y1="100" x2="110" y2="60"/>
              <line x1="200" y1="100" x2="310" y2="50"/>
              <line x1="200" y1="100" x2="280" y2="150"/>
              <line x1="200" y1="100" x2="100" y2="150"/>
              <line x1="110" y1="60" x2="60" y2="100"/>
              <line x1="310" y1="50" x2="340" y2="110"/>
            </g>
            <g fontFamily="Inter" fontSize="7" fill="#1a1a1a" textAnchor="middle">
              <circle cx="200" cy="100" r="14" fill="#1a1a1a"/>
              <text x="200" y="103" fill="#f5f3ee">SHOGUN</text>
              <circle cx="110" cy="60" r="8" fill="#fff" stroke="#1a1a1a"/><text x="110" y="75">Matt</text>
              <circle cx="310" cy="50" r="8" fill="#fff" stroke="#1a1a1a"/><text x="310" y="65">Toru team</text>
              <circle cx="280" cy="150" r="8" fill="#fff" stroke="#1a1a1a"/><text x="280" y="165">Pricing</text>
              <circle cx="100" cy="150" r="8" fill="#fff" stroke="#1a1a1a"/><text x="100" y="165">IA draft</text>
              <circle cx="60" cy="100" r="5" fill="#fff" stroke="#a8a8a8"/>
              <circle cx="340" cy="110" r="5" fill="#fff" stroke="#a8a8a8"/>
            </g>
          </svg>
          <div style={{position:'absolute', top:10, right:10, width:120, background:'#fff', border:'1px solid var(--line)', padding:8, fontSize:9}}>
            <div className="xsmall muted">SELECTED</div>
            <div style={{fontSize:10, margin:'2px 0'}}>SHOGUN</div>
            <div className="xsmall muted">project · 47 memories</div>
            <div className="bar lite" style={{margin:'4px 0'}}/>
            <div className="xsmall">6 related entities</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MemGraphB() {
  // constellation
  const nodes = [
    [0.3,0.2,'Matt',5],[0.7,0.15,'Toru team',5],[0.5,0.45,'SHOGUN',10],
    [0.22,0.6,'IA',4],[0.75,0.55,'Pricing',4],[0.4,0.78,'Memory',6],
    [0.6,0.82,'Agents',6],[0.15,0.35,'Notion',3],[0.88,0.3,'Speak',3],
    [0.1,0.8,'Elevenlabs',3],[0.9,0.75,'Rev-cat',3],
  ];
  return (
    <div className="wf">
      <div className="wf-main" style={{padding:0, background:'#111', color:'#eee'}}>
        <div className="topbar" style={{padding:'10px 14px', borderColor:'#333'}}>
          <div><h4 style={{color:'#eee'}}>Constellation</h4><span className="jp" style={{color:'#888', fontSize:10}}>星図</span></div>
          <span className="xsmall" style={{color:'#888'}}>47 ENTITIES · 128 LINKS</span>
        </div>
        <div style={{flex:1, position:'relative'}}>
          <svg viewBox="0 0 400 240" style={{width:'100%', height:'100%'}}>
            {nodes.map((a,i)=>nodes.slice(i+1).map((b,j)=>(
              Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1]) < 0.6 && (
                <line key={i+'-'+j} x1={a[0]*400} y1={a[1]*240} x2={b[0]*400} y2={b[1]*240} stroke="#444" strokeWidth="0.3"/>
              )
            )))}
            {nodes.map((n,i)=>(
              <g key={i}>
                <circle cx={n[0]*400} cy={n[1]*240} r={n[3]/2} fill="#eee"/>
                <text x={n[0]*400} y={n[1]*240+n[3]+6} fill="#aaa" fontSize="7" fontFamily="Inter" textAnchor="middle">{n[2]}</text>
              </g>
            ))}
          </svg>
        </div>
        <div className="row" style={{padding:'6px 14px', borderTop:'1px solid #333', justifyContent:'space-between'}}>
          <span className="xsmall" style={{color:'#888'}}>◆ zoom · drag · click node</span>
          <span className="xsmall" style={{color:'#888'}}>Brightest = most recent</span>
        </div>
      </div>
    </div>
  );
}

function MemSearchA() {
  return (
    <div className="wf">
      <div className="wf-main" style={{padding:'14px 40px'}}>
        <div className="card" style={{padding:10, borderColor:'var(--ink)'}}>
          <div className="row">
            <span className="mono xsmall muted">⌘K</span>
            <span style={{fontSize:13, marginLeft:10, color:'var(--ink-3)'}}>what did Matt say about pricing tiers?</span>
            <span className="ic" style={{marginLeft:'auto'}}/>
          </div>
        </div>
        <div className="row gap4">
          <span className="pill solid">Hybrid</span><span className="pill">Full-text</span><span className="pill">Semantic</span>
          <span style={{marginLeft:'auto'}} className="xsmall muted">14 results · 0.2s</span>
        </div>
        <div className="card" style={{background:'var(--paper-3)', padding:10}}>
          <div className="xsmall muted">AI SUMMARY</div>
          <div style={{fontSize:10, marginTop:4, lineHeight:1.4}}>
            Matt suggested 3-tier pricing (Basic/Plus/Pro) mirroring Littlebird's model, with Plus at $17/mo. He emphasized Pro should include BYOK credits and early-access.
          </div>
        </div>
        <div className="col gap4" style={{flex:1, minHeight:0, overflow:'hidden'}}>
          {['Matt · 1-on-1 notes · APR 14','Revenue-cat CTO chat · APR 17','SHOGUN pricing draft · APR 10','All PJ meeting · APR 17'].map((r,i)=>(
            <div key={i} className="row small" style={{padding:'4px 6px', borderBottom:'1px dashed var(--line-2)'}}>
              <span className="mono xsmall muted" style={{width:20}}>{i+1}</span>
              <span style={{flex:1}}>{r}</span>
              <span className="xsmall muted">94%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MemSearchB() {
  return (
    <div className="wf">
      <MemSidebar active="Search"/>
      <div className="wf-main">
        <div className="card" style={{padding:8}}>
          <div className="xsmall muted">ASK YOUR MEMORY</div>
          <div style={{fontSize:12, marginTop:2}}>What did Matt say about pricing tiers?</div>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:10, flex:1, minHeight:0}}>
          <div className="card" style={{padding:10, background:'var(--paper-3)'}}>
            <h5>Answer</h5>
            <div style={{fontSize:10, lineHeight:1.5}}>
              Matt proposed three tiers with Plus at $17/mo and Pro at $100/mo, roughly mirroring Littlebird. Pro should include BYOK credits.
            </div>
            <div className="xsmall muted" style={{marginTop:6}}>Synthesized from 4 memories · Apr 10–17</div>
          </div>
          <div className="col gap4">
            <h5>Sources</h5>
            {['Matt 1-on-1 · APR 14','Rev-cat chat · APR 17','Pricing draft · APR 10','All PJ · APR 17'].map((r,i)=>(
              <div key={i} className="card" style={{padding:'4px 8px', fontSize:9}}>[{i+1}] {r}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MemEntityA() {
  return (
    <div className="wf">
      <MemSidebar active="Entities"/>
      <div className="wf-main">
        <div className="topbar">
          <div className="row gap8">
            <div style={{width:28, height:28, border:'1px solid var(--ink)', display:'grid', placeItems:'center'}}>M</div>
            <div><h4>Matt <span className="jp">マット</span></h4><div className="xsmall muted">PERSON · 18 INTERACTIONS · SINCE FEB 2025</div></div>
          </div>
          <span className="pill">Pin</span>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, flex:1, minHeight:0}}>
          <div className="col gap6">
            <h5>What SHOGUN knows</h5>
            <div className="card" style={{padding:8, fontSize:10, lineHeight:1.4}}>
              Co-founder at Toru. Based in SF. Interested in compound-memory systems & pricing. Prefers async comms.
            </div>
            <h5>Topics</h5>
            <div className="row gap4"><span className="pill">Pricing</span><span className="pill">Memory</span><span className="pill">Fundraising</span></div>
          </div>
          <div className="col gap4">
            <h5>Recent interactions</h5>
            {['All PJ meeting · Apr 17','1-on-1 · Apr 14','Slack DM · Apr 12','Pricing chat · Apr 10','Email thread · Apr 7'].map((r,i)=>(
              <div key={i} className="row small" style={{borderBottom:'1px dashed var(--line-2)', padding:'3px 0'}}>
                <span>{r}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MemEntityB() {
  return (
    <div className="wf">
      <div className="wf-main" style={{padding:'16px 40px'}}>
        <div className="center">
          <div style={{width:40, height:40, border:'1px solid var(--ink)', display:'grid', placeItems:'center', margin:'0 auto'}}>M</div>
          <h4 style={{margin:'6px 0 2px'}} className="serif">Matt</h4>
          <div className="xsmall muted">18 interactions · since Feb 2025</div>
        </div>
        <div className="line" style={{margin:'10px 0'}}/>
        <div className="col gap4" style={{flex:1, minHeight:0, overflow:'hidden'}}>
          {[
            ['APR 17','meeting','All PJ · Matt shared Q2 roadmap'],
            ['APR 14','1on1','Matt proposed 3-tier pricing'],
            ['APR 12','slack','Matt: "should we ship dream cycle?"'],
            ['APR 10','chat','Pricing exploration · 42 messages'],
            ['APR 07','email','Intro from Sarah'],
          ].map((r,i)=>(
            <div key={i} className="row" style={{padding:'5px 0', borderBottom:'1px dashed var(--line-2)'}}>
              <span className="mono xsmall muted" style={{width:44}}>{r[0]}</span>
              <span className="mono xsmall muted" style={{width:50}}>{r[1]}</span>
              <span style={{fontSize:10, flex:1}}>{r[2]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MemDreamA() {
  return (
    <div className="wf">
      <MemSidebar active="Dream"/>
      <div className="wf-main">
        <div className="topbar">
          <h4>Dream Cycle <span className="jp">夢の循環</span></h4>
          <span className="pill dot">Running · started 22:00</span>
        </div>
        {[
          ['Rebuild embeddings','1,248 / 3,200','72%'],
          ['Summarize sessions','18 / 22','84%'],
          ['Re-link entities','done',''],
          ['Prune duplicates','42 flagged','pending review'],
        ].map((r,i)=>(
          <div key={i} className="card" style={{padding:8}}>
            <div className="row">
              <span style={{fontSize:11}}>{r[0]}</span>
              <span className="xsmall muted" style={{marginLeft:'auto'}}>{r[1]}</span>
            </div>
            <div className="bar lite" style={{marginTop:4, position:'relative', overflow:'hidden'}}>
              <div style={{position:'absolute', top:0,left:0,bottom:0, width:r[2]||'100%', background:'var(--ink)'}}/>
            </div>
            <div className="xsmall muted" style={{marginTop:3}}>{r[2]}</div>
          </div>
        ))}
        <div className="xsmall muted" style={{marginTop:'auto'}}>NEXT CYCLE · TOMORROW 22:00 · Schedule ↗</div>
      </div>
    </div>
  );
}

function MemDreamB() {
  return (
    <div className="wf">
      <div className="wf-main" style={{background:'#0e0e0e', color:'#ddd', padding:'20px 40px', justifyContent:'center'}}>
        <div className="center">
          <div className="jp" style={{fontSize:28, letterSpacing:'0.3em', color:'#ddd'}}>夢</div>
          <div className="xsmall" style={{color:'#888', marginTop:4, letterSpacing:'0.2em'}}>DREAM CYCLE · RUNNING</div>
        </div>
        <div style={{margin:'18px auto', width:'70%'}}>
          <div style={{display:'flex', gap:2}}>
            {Array.from({length:40}).map((_,i)=>(
              <div key={i} style={{flex:1, height:i<29?18:8, background:i<29?'#ddd':'#333', transition:'all 0.3s'}}/>
            ))}
          </div>
          <div className="row" style={{justifyContent:'space-between', marginTop:6, fontSize:9, color:'#888'}}>
            <span>22:00 STARTED</span><span>72%</span><span>~14 MIN LEFT</span>
          </div>
        </div>
        <div className="center" style={{fontSize:10, color:'#aaa', fontStyle:'italic'}}>
          Reorganizing 3,200 memories · Linking new entities · Summarizing today
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  MemIndexA, MemIndexB, MemDetailA, MemDetailB,
  MemTimelineA, MemTimelineB, MemGraphA, MemGraphB,
  MemSearchA, MemSearchB, MemEntityA, MemEntityB,
  MemDreamA, MemDreamB,
});
