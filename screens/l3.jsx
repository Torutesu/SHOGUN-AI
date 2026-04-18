// L3 CHAT — New, History, Thread, Projects, Hummingbird
window.L3Screens = [
  { code: 'C1', jp: '新しいチャット', title: 'New Chat', desc: 'Memory-augmented dialog, model select, context window.',
    variants: [
      { label: 'A — Centered prompt', kind: 'Classic blank canvas', render: NewChatA },
      { label: 'B — Context-first', kind: 'Memory preview panel', render: NewChatB },
    ]},
  { code: 'C2', jp: 'チャット履歴', title: 'Chat History', desc: 'Previous conversations, grouped by project.',
    variants: [
      { label: 'A — Grouped list', kind: 'Sidebar list', render: HistoryA },
      { label: 'B — Calendar grid', kind: 'Chats-by-day', render: HistoryB },
    ]},
  { code: 'C3', jp: 'スレッドの詳細', title: 'Thread Detail', desc: 'Conversation + related memory + derived actions.',
    variants: [
      { label: 'A — Three-pane', kind: 'Chat + memory rail', render: ThreadA },
      { label: 'B — Focus mode', kind: 'Chat only, side peeks', render: ThreadB },
    ]},
  { code: 'C4', jp: 'プロジェクト', title: 'Projects', desc: 'Workspace bundling chats + memories (Notion-style).',
    variants: [
      { label: 'A — Dashboard', kind: 'Project home', render: ProjectsA },
      { label: 'B — Kanban of threads', kind: 'Thread columns', render: ProjectsB },
    ]},
  { code: 'C5', jp: 'ハミングバード', title: 'Hummingbird', desc: 'Global shortcut · screen-aware overlay.',
    variants: [
      { label: 'A — Floating palette', kind: 'Over current app', render: HbA },
      { label: 'B — Side drawer', kind: 'Right-edge context', render: HbB },
    ]},
];

function ChatSidebar({active}){
  const items = ['New chat','Search','Meeting notes','Routines'];
  return (
    <div className="wf-sidebar">
      <div className="brand jp">対話</div>
      {items.map(n=><div key={n} className={'item'+(n===active?' active':'')}>{n}</div>)}
      <div className="section">Recents</div>
      {['SHOGUN pricing','Task prioritization','Terminal','Today plan','Daily overview'].map(r=><div key={r} className="item small">{r}</div>)}
      <div className="spacer"/>
      <div className="item xsmall muted">Context enabled ●</div>
    </div>
  );
}

function NewChatA(){
  return (
    <div className="wf">
      <ChatSidebar active="New chat"/>
      <div className="wf-main" style={{padding:'20px 50px', justifyContent:'center'}}>
        <div className="center">
          <div className="serif" style={{fontSize:20}}>What's on your mind?</div>
          <div className="jp xsmall muted">何を考えていますか</div>
        </div>
        <div className="card" style={{padding:10, marginTop:16}}>
          <div style={{fontSize:11, color:'var(--ink-4)'}}>Ask SHOGUN…</div>
          <div className="row" style={{marginTop:8, gap:4}}>
            <span className="pill">+</span><span className="pill solid">Max</span><span className="pill">Context ●</span>
            <span style={{marginLeft:'auto'}} className="xsmall muted">⌘↵</span>
          </div>
        </div>
        <div className="row gap4" style={{marginTop:10, justifyContent:'center', flexWrap:'wrap'}}>
          <span className="pill outlined">Synthesize my research</span>
          <span className="pill outlined">Draft weekly recap</span>
          <span className="pill outlined">Find to watch tonight</span>
        </div>
      </div>
    </div>
  );
}

function NewChatB(){
  return (
    <div className="wf">
      <ChatSidebar active="New chat"/>
      <div className="wf-main">
        <div className="topbar"><h4>New conversation</h4><span className="pill dot">Claude · Max</span></div>
        <div style={{display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:10, flex:1, minHeight:0}}>
          <div className="col gap6">
            <div className="card" style={{padding:10, minHeight:120}}>
              <div className="xsmall muted">PROMPT</div>
              <div style={{fontSize:11, marginTop:4, color:'var(--ink-4)'}}>Ask anything…</div>
            </div>
            <div className="row gap4">
              <span className="pill">+</span><span className="pill">🎤</span><span className="pill">Context ●</span>
              <span className="pill solid" style={{marginLeft:'auto'}}>Send ⌘↵</span>
            </div>
          </div>
          <div className="col gap4">
            <h5>Context preview · 12 memories</h5>
            {['Today · 9 memories','Matt · recent 3','SHOGUN project · pinned','Pricing draft'].map((c,i)=>(
              <div key={i} className="card" style={{padding:'4px 8px', fontSize:10}}>{c}</div>
            ))}
            <h5 style={{marginTop:4}}>Scope</h5>
            <div className="row gap4"><span className="pill solid">All</span><span className="pill">Project</span><span className="pill">None</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HistoryA(){
  return (
    <div className="wf">
      <ChatSidebar active="Search"/>
      <div className="wf-main">
        <div className="topbar"><h4>Chat history <span className="jp">履歴</span></h4><span className="pill">⌘K search</span></div>
        <div className="xsmall muted">TODAY</div>
        {['Revenue-cat CTO pricing','Task prioritization','Terminal debug'].map(t=>(
          <div key={t} className="row small" style={{padding:'4px 0', borderBottom:'1px dashed var(--line-2)'}}>
            <span className="ic"/><span style={{marginLeft:8, flex:1}}>{t}</span><span className="xsmall muted">14:02</span>
          </div>
        ))}
        <div className="xsmall muted" style={{marginTop:6}}>YESTERDAY</div>
        {['Daily task plan','Action plan','Capabilities overview'].map(t=>(
          <div key={t} className="row small" style={{padding:'4px 0', borderBottom:'1px dashed var(--line-2)'}}>
            <span className="ic"/><span style={{marginLeft:8, flex:1}}>{t}</span><span className="xsmall muted">—</span>
          </div>
        ))}
        <div className="xsmall muted" style={{marginTop:6}}>BY PROJECT</div>
        <div className="row gap4"><span className="pill">SHOGUN · 12</span><span className="pill">Poker · 4</span><span className="pill">Research · 8</span></div>
      </div>
    </div>
  );
}

function HistoryB(){
  const cells = Array.from({length:28}).map((_,i)=>({d:i+1, n: [0,1,0,2,3,1,0,0,4,1,2,0,1,3,0,0,2,1,0,2,1,0,1,0,2,3,1,2][i]}));
  return (
    <div className="wf">
      <ChatSidebar active="Search"/>
      <div className="wf-main">
        <div className="topbar"><h4>History <span className="jp">月暦</span></h4><span className="pill">April 2026</span></div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:2, flex:1}}>
          {cells.map(c=>(
            <div key={c.d} className="card" style={{padding:4, position:'relative', minHeight:30}}>
              <div className="xsmall muted">{c.d}</div>
              {c.n>0 && <div style={{position:'absolute', bottom:3, left:4, display:'flex', gap:1}}>
                {Array.from({length:Math.min(c.n,4)}).map((_,i)=><div key={i} style={{width:3,height:3,background:'var(--ink)'}}/>)}
              </div>}
            </div>
          ))}
        </div>
        <div className="xsmall muted center">● = 1 chat · tap a day to expand</div>
      </div>
    </div>
  );
}

function ThreadA(){
  return (
    <div className="wf">
      <ChatSidebar active="Search"/>
      <div className="wf-main" style={{padding:'10px 14px'}}>
        <div className="topbar"><h4>Revenue-cat CTO</h4><span className="pill dot">Context · 12 linked</span></div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 140px', gap:10, flex:1, minHeight:0}}>
          <div className="col gap4">
            {[['user','What did Matt say about pricing?'],['ai','Matt proposed 3 tiers…'],['user','Draft a pricing page'],['ai','Here\'s a draft…']].map((m,i)=>(
              <div key={i} className="card" style={{padding:6, background: m[0]==='user'?'var(--paper-3)':'#fff', marginLeft: m[0]==='user'?40:0, marginRight: m[0]==='ai'?40:0}}>
                <div className="xsmall muted">{m[0]==='user'?'YOU':'SHOGUN'}</div>
                <div style={{fontSize:10, marginTop:2}}>{m[1]}</div>
              </div>
            ))}
          </div>
          <div className="col gap4">
            <h5>Linked</h5>
            <div className="card" style={{padding:'4px 6px', fontSize:9}}>Matt 1-on-1</div>
            <div className="card" style={{padding:'4px 6px', fontSize:9}}>Pricing draft</div>
            <h5 style={{marginTop:4}}>Derived</h5>
            <div className="card" style={{padding:'4px 6px', fontSize:9}}>→ Task: send draft</div>
            <div className="card" style={{padding:'4px 6px', fontSize:9}}>→ Memory: saved</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ThreadB(){
  return (
    <div className="wf">
      <div className="wf-main" style={{padding:'14px 80px', maxWidth:'none'}}>
        <div className="xsmall muted">← BACK · REVENUE-CAT CTO · 14:02</div>
        <div className="col gap6" style={{marginTop:8, flex:1, minHeight:0}}>
          {[['user','What did Matt say about pricing?'],['ai','Matt proposed 3 tiers with Plus at $17/mo and Pro at $100/mo. He wants BYOK credits in Pro.'],['user','Draft a one-pager']].map((m,i)=>(
            <div key={i}>
              <div className="xsmall muted">{m[0]==='user'?'YOU':'SHOGUN'}</div>
              <div style={{fontSize:11, marginTop:2, paddingBottom:6, borderBottom:'1px dashed var(--line-2)'}}>{m[1]}</div>
            </div>
          ))}
          <div className="card" style={{padding:8, background:'var(--paper-3)'}}>
            <div className="xsmall muted">TYPE…</div>
          </div>
        </div>
        <div className="row gap4 xsmall muted"><span>← 12 linked memories</span><span>→ 2 derived actions</span></div>
      </div>
    </div>
  );
}

function ProjectsA(){
  return (
    <div className="wf">
      <ChatSidebar active="Search"/>
      <div className="wf-main">
        <div className="topbar"><h4>SHOGUN AI <span className="jp">企画</span></h4><span className="pill">+ Add</span></div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
          <div className="card"><h5>About</h5><div className="bar lite" style={{width:'90%'}}/><div className="bar lite" style={{width:'70%', marginTop:4}}/></div>
          <div className="card"><h5>Stats</h5><div style={{fontSize:10}}>12 chats · 47 memories · 3 agents</div></div>
        </div>
        <h5>Threads</h5>
        <div className="col gap4">
          {['IA review','Pricing draft','Routine templates','Brand exploration'].map(t=>(
            <div key={t} className="row small" style={{padding:'4px 6px', border:'1px solid var(--line)'}}>
              <span>{t}</span><span className="xsmall muted" style={{marginLeft:'auto'}}>Apr 17</span>
            </div>
          ))}
        </div>
        <h5>Memories</h5>
        <div className="row gap4"><span className="pill">47 linked</span><span className="pill">Browse →</span></div>
      </div>
    </div>
  );
}

function ProjectsB(){
  const cols = [
    ['Open', ['IA review','Pricing draft']],
    ['In progress', ['Brand v2','Routine templates']],
    ['Paused', ['Mobile spec']],
    ['Archived', ['Naming','Logo v1','Old IA']],
  ];
  return (
    <div className="wf">
      <div className="wf-main" style={{padding:'10px 14px'}}>
        <div className="topbar"><h4>SHOGUN AI · threads</h4><span className="pill">Kanban</span></div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:6, flex:1, minHeight:0}}>
          {cols.map(([name, items])=>(
            <div key={name} className="col gap4">
              <div className="xsmall muted" style={{textTransform:'uppercase', letterSpacing:'0.15em'}}>{name} · {items.length}</div>
              {items.map(it=><div key={it} className="card" style={{padding:'4px 6px', fontSize:10}}>{it}</div>)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HbA(){
  return (
    <div className="wf">
      <div className="wf-main" style={{padding:0, background:'var(--paper-2)', position:'relative'}}>
        {/* fake background app */}
        <div className="ph" style={{position:'absolute', inset:0}}>BACKGROUND APP</div>
        {/* floating palette */}
        <div style={{position:'absolute', bottom:30, left:'50%', transform:'translateX(-50%)', width:'70%', background:'#fff', border:'1px solid var(--ink)', padding:10, boxShadow:'0 10px 40px rgba(0,0,0,0.25)'}}>
          <div className="row">
            <span className="jp" style={{fontSize:10}}>⟡</span>
            <span className="xsmall muted" style={{marginLeft:6}}>HUMMINGBIRD · ⌥⌥</span>
            <span className="pill" style={{marginLeft:'auto', fontSize:8}}>Chrome · article</span>
          </div>
          <div style={{fontSize:11, marginTop:6, color:'var(--ink-4)'}}>Summarize this article about creativity…</div>
          <div className="row gap4" style={{marginTop:6}}>
            <span className="pill" style={{fontSize:8}}>Ask about screen</span>
            <span className="pill" style={{fontSize:8}}>Save to memory</span>
            <span className="pill" style={{fontSize:8}}>New chat</span>
            <span className="pill solid" style={{marginLeft:'auto', fontSize:8}}>↵</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function HbB(){
  return (
    <div className="wf">
      <div className="wf-main" style={{padding:0, position:'relative'}}>
        <div className="ph" style={{position:'absolute', inset:'0 200px 0 0'}}>BACKGROUND APP</div>
        <div style={{position:'absolute', top:0, right:0, bottom:0, width:200, background:'#fff', borderLeft:'1px solid var(--ink)', padding:12, display:'flex', flexDirection:'column', gap:6}}>
          <div className="row">
            <span className="jp" style={{fontSize:12}}>⟡</span>
            <span className="xsmall muted" style={{marginLeft:6}}>HUMMINGBIRD</span>
            <span className="xsmall muted" style={{marginLeft:'auto'}}>×</span>
          </div>
          <div className="xsmall muted">SEES · CHROME · article</div>
          <div className="card" style={{padding:6, fontSize:10, background:'var(--paper-3)'}}>
            <div className="xsmall muted">SUMMARY</div>
            <div className="bar lite" style={{width:'100%', marginTop:3}}/>
            <div className="bar lite" style={{width:'80%', marginTop:3}}/>
          </div>
          <div className="card" style={{padding:6}}>
            <div className="xsmall muted">ASK…</div>
          </div>
          <div className="col gap4 small">
            <span>→ Save article</span>
            <span>→ Link to memory</span>
            <span>→ Draft reply</span>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {NewChatA, NewChatB, HistoryA, HistoryB, ThreadA, ThreadB, ProjectsA, ProjectsB, HbA, HbB});
