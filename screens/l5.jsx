// L5 WORK
window.L5Screens = [
  { code:'W1', jp:'目標ツリー', title:'Goal Tree', desc:'Hierarchical goals (semantic tree), leaves as tasks.',
    variants:[{label:'A — Tree', kind:'Indented', render:GoalA},{label:'B — Radial', kind:'Concentric', render:GoalB}]},
  { code:'W2', jp:'タスク管理', title:'Tasks', desc:'Kanban / list / calendar views.',
    variants:[{label:'A — Kanban', kind:'Columns', render:TaskA},{label:'B — List + calendar', kind:'Dual-pane', render:TaskB}]},
  { code:'W3', jp:'タスク詳細', title:'Task Detail', desc:'Linked memory, assigned agent, progress.',
    variants:[{label:'A — Split', kind:'Detail + context', render:TaskDetA},{label:'B — Timeline', kind:'History-first', render:TaskDetB}]},
  { code:'W4', jp:'会議目録', title:'Meetings', desc:'Past / today / upcoming.',
    variants:[{label:'A — Three columns', kind:'By status', render:MeetA},{label:'B — Calendar + list', kind:'Classic', render:MeetB}]},
  { code:'W5', jp:'会議インテリジェンス', title:'Meeting Intelligence', desc:'Transcript, summary, decisions, actions.',
    variants:[{label:'A — Tabbed', kind:'Pick a view', render:MIA},{label:'B — Scroll canvas', kind:'Everything visible', render:MIB}]},
  { code:'W6', jp:'ライブセッション', title:'Live Session', desc:'Real-time transcript + AI notes.',
    variants:[{label:'A — Split live', kind:'Transcript + notes', render:LiveA},{label:'B — HUD overlay', kind:'Picture-in-picture', render:LiveB}]},
];

function WkSide({active}){
  return (
    <div className="wf-sidebar">
      <div className="brand jp">務</div>
      {['Goals','Tasks','Meetings','Calendar'].map(n=><div key={n} className={'item'+(n===active?' active':'')}>{n}</div>)}
      <div className="section">Projects</div>
      {['SHOGUN','Poker','Research'].map(n=><div key={n} className="item small">{n}</div>)}
      <div className="spacer"/>
    </div>
  );
}

function GoalA(){
  const nodes=[
    [0,'SHOGUN ships by June',''],
    [1,'Memory works', '3 tasks'],
    [2,'Ingest pipeline','done'],
    [2,'Dream cycle','70%'],
    [1,'Agents work','5 tasks'],
    [2,'Routines','in progress'],
    [2,'Approval flow','todo'],
    [1,'Brand lands','2 tasks'],
  ];
  return (
    <div className="wf">
      <WkSide active="Goals"/>
      <div className="wf-main">
        <div className="topbar"><h4>Goal tree <span className="jp">目標樹</span></h4><span className="pill">+ Goal</span></div>
        <div className="col gap4">
          {nodes.map((n,i)=>(
            <div key={i} className="row" style={{paddingLeft:n[0]*20, padding:'4px 0', borderBottom:'1px dashed var(--line-2)'}}>
              <span className="mono xsmall muted" style={{marginRight:8}}>{n[0]===0?'◆':n[0]===1?'▸':'·'}</span>
              <span style={{fontSize: n[0]===0?12: n[0]===1?11:10, fontWeight:n[0]===0?500:400, flex:1}}>{n[1]}</span>
              <span className="xsmall muted">{n[2]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
function GoalB(){
  return (
    <div className="wf">
      <WkSide active="Goals"/>
      <div className="wf-main" style={{padding:0}}>
        <div className="topbar" style={{padding:'10px 14px'}}><h4>Goal garden <span className="jp">枯山水</span></h4><span className="xsmall muted">CONCENTRIC</span></div>
        <div style={{flex:1, display:'grid', placeItems:'center'}}>
          <svg viewBox="-110 -110 220 220" style={{width:'80%', height:'100%'}}>
            <circle r="100" fill="none" stroke="#cfcfcf" strokeDasharray="2 2"/>
            <circle r="60" fill="none" stroke="#cfcfcf" strokeDasharray="2 2"/>
            <circle r="24" fill="#1a1a1a"/>
            <text textAnchor="middle" y="3" fill="#f5f3ee" fontSize="7">SHOGUN</text>
            {[['Memory',-60,0],['Agents',42,42],['Brand',42,-42],['GTM',-30,-55]].map((s,i)=>(
              <g key={i}><circle cx={s[1]} cy={s[2]} r="14" fill="#fff" stroke="#1a1a1a"/><text x={s[1]} y={s[2]+2} textAnchor="middle" fontSize="6">{s[0]}</text></g>
            ))}
            {[['ingest',-90,20],['dream',-85,-30],['approve',80,60],['routine',70,20],['logo',60,-70],['type',30,-80]].map((s,i)=>(
              <g key={i}><circle cx={s[1]} cy={s[2]} r="6" fill="#fff" stroke="#767676"/><text x={s[1]} y={s[2]+14} textAnchor="middle" fontSize="5" fill="#767676">{s[0]}</text></g>
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}

function TaskA(){
  const cols=[['Todo',['Draft pricing','Brand v2','Mobile spec']],['Doing',['SHOGUN IA','Agent routines']],['Review',['Pricing page','Memory import']],['Done',['Logo','Naming']]];
  return (
    <div className="wf">
      <WkSide active="Tasks"/>
      <div className="wf-main">
        <div className="topbar"><h4>Tasks <span className="jp">任務</span></h4><div className="row gap4"><span className="pill solid">Kanban</span><span className="pill">List</span><span className="pill">Calendar</span></div></div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:6, flex:1, minHeight:0}}>
          {cols.map(([n,items])=>(
            <div key={n} className="col gap4">
              <div className="xsmall muted" style={{textTransform:'uppercase', letterSpacing:'0.15em'}}>{n} · {items.length}</div>
              {items.map(i=><div key={i} className="card" style={{padding:'4px 6px', fontSize:10}}>{i}</div>)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
function TaskB(){
  return (
    <div className="wf">
      <WkSide active="Tasks"/>
      <div className="wf-main">
        <div className="topbar"><h4>Tasks · April <span className="jp">任務</span></h4><div className="row gap4"><span className="pill">List</span><span className="pill solid">List + cal</span></div></div>
        <div style={{display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:10, flex:1, minHeight:0}}>
          <div className="col gap4">
            {['◯ Ship SHOGUN wireframes','◯ Draft pricing page','● Agent routines','✓ Logo v1'].map((t,i)=>(
              <div key={i} className="row small" style={{padding:'4px 0', borderBottom:'1px dashed var(--line-2)'}}>
                <span style={{flex:1}}>{t}</span><span className="xsmall muted">Apr {17+i}</span>
              </div>
            ))}
          </div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:2}}>
            {Array.from({length:21}).map((_,i)=>(
              <div key={i} style={{minHeight:22, border:'1px solid var(--line-2)', padding:2, position:'relative'}}>
                <div className="xsmall muted" style={{fontSize:7}}>{i+1}</div>
                {[3,7,11,15].includes(i) && <div style={{position:'absolute', bottom:2, left:2, width:10, height:3, background:'var(--ink)'}}/>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskDetA(){
  return (
    <div className="wf">
      <WkSide active="Tasks"/>
      <div className="wf-main">
        <div className="topbar"><div><h4>Ship SHOGUN wireframes</h4><span className="xsmall muted">DUE APR 18 · DOING</span></div><span className="pill dot">Agent: Design</span></div>
        <div style={{display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:10, flex:1, minHeight:0}}>
          <div className="col gap4">
            <h5>Notes</h5>
            <div className="card" style={{padding:8, fontSize:10, minHeight:60}}>All 8 layers · mid-fi · bilingual labels · JP-inspired grid…</div>
            <h5>Sub-tasks</h5>
            <div className="col gap4 small">
              <span>✓ IA digest</span><span>✓ Tab shell</span><span>● L1–L4</span><span>○ L5–L8</span><span>○ Tweaks</span>
            </div>
          </div>
          <div className="col gap4">
            <h5>Linked memory</h5>
            <div className="card" style={{padding:'4px 6px', fontSize:9}}>IA draft · Apr 16</div>
            <div className="card" style={{padding:'4px 6px', fontSize:9}}>Matt's feedback</div>
            <h5 style={{marginTop:4}}>Progress</h5>
            <div className="bar lite" style={{position:'relative'}}><div style={{position:'absolute', inset:0, width:'58%', background:'var(--ink)'}}/></div>
            <div className="xsmall muted">58% · 4 of 7 done</div>
          </div>
        </div>
      </div>
    </div>
  );
}
function TaskDetB(){
  return (
    <div className="wf">
      <WkSide active="Tasks"/>
      <div className="wf-main" style={{padding:'14px 30px'}}>
        <div className="xsmall muted">← BACK</div>
        <div className="serif" style={{fontSize:16, margin:'4px 0'}}>Ship SHOGUN wireframes</div>
        <div className="xsmall muted">APR 14 CREATED · DUE APR 18 · 58%</div>
        <div className="line" style={{margin:'10px 0'}}/>
        <div className="col gap4">
          {[['APR 14','Task created from chat'],['APR 15','Agent linked · Design'],['APR 16','Linked memory: IA draft'],['APR 17','4 subtasks completed'],['APR 17','● in progress']].map((r,i)=>(
            <div key={i} className="row"><span className="mono xsmall muted" style={{width:60}}>{r[0]}</span><span style={{fontSize:10}}>{r[1]}</span></div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MeetA(){
  return (
    <div className="wf">
      <WkSide active="Meetings"/>
      <div className="wf-main">
        <div className="topbar"><h4>Meetings <span className="jp">会合</span></h4><span className="pill">+ Manual</span></div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6, flex:1, minHeight:0}}>
          {[['Past',['All PJ · Apr 17','1-on-1 Matt · Apr 14','Grop · Apr 16']],['Today',['Revenue-cat · 14:02','Design review · 17:00']],['Upcoming',['CTO call · Apr 18','Design sync · Apr 19']]].map(([n,items])=>(
            <div key={n} className="col gap4">
              <div className="xsmall muted" style={{textTransform:'uppercase', letterSpacing:'0.15em'}}>{n}</div>
              {items.map(i=><div key={i} className="card" style={{padding:'4px 6px', fontSize:10}}>{i}</div>)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
function MeetB(){
  return (
    <div className="wf">
      <WkSide active="Meetings"/>
      <div className="wf-main">
        <div className="topbar"><h4>Meetings · Week 16</h4></div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:2, flex:1, minHeight:0}}>
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d,i)=>(
            <div key={d} className="col gap2" style={{border:'1px solid var(--line-2)', padding:4}}>
              <div className="xsmall muted">{d} {13+i}</div>
              {i===3 && <div className="card" style={{padding:'2px 4px', fontSize:8}}>All PJ 13:20</div>}
              {i===4 && <><div className="card" style={{padding:'2px 4px', fontSize:8}}>Rev-cat 14:00</div><div className="card" style={{padding:'2px 4px', fontSize:8}}>Design 17:00</div></>}
              {i===1 && <div className="card" style={{padding:'2px 4px', fontSize:8}}>Matt 10:00</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MIA(){
  return (
    <div className="wf">
      <WkSide active="Meetings"/>
      <div className="wf-main">
        <div className="topbar"><h4>All PJ · Apr 17</h4><div className="row gap4"><span className="pill solid">Summary</span><span className="pill">Transcript</span><span className="pill">Decisions</span><span className="pill">Actions</span></div></div>
        <div className="card" style={{padding:10, background:'var(--paper-3)'}}>
          <h5>Summary</h5>
          <div className="bar lite" style={{width:'100%'}}/><div className="bar lite" style={{width:'94%', marginTop:3}}/><div className="bar lite" style={{width:'82%', marginTop:3}}/>
        </div>
        <h5>Decisions · 3</h5>
        <div className="col gap4 small"><span>✓ Ship IA doc by Apr 20</span><span>✓ Hire one designer</span><span>✓ Move pricing discussion offline</span></div>
        <h5>Action items · 4</h5>
        <div className="col gap4 small"><span>◯ Toru · draft brand v2</span><span>◯ Matt · send pricing one-pager</span><span>◯ SHOGUN · set weekly recap routine</span></div>
      </div>
    </div>
  );
}
function MIB(){
  return (
    <div className="wf">
      <div className="wf-main" style={{padding:'14px 30px'}}>
        <div className="xsmall muted">APR 17 · 42 MIN · 3 ATTENDEES</div>
        <div className="serif" style={{fontSize:16, margin:'4px 0'}}>All PJ meeting</div>
        <div className="line" style={{margin:'10px 0'}}/>
        <div style={{display:'grid', gridTemplateColumns:'1.3fr 1fr', gap:12, flex:1, minHeight:0}}>
          <div className="col gap4">
            <h5>Transcript</h5>
            {['Matt: "Let\'s lock the IA by Friday."','Toru: "We still need pricing tiers…"','Matt: "Plus at 17 is the right anchor."','Toru: "Agreed — I\'ll draft a one-pager."'].map((l,i)=>(
              <div key={i} style={{fontSize:10, lineHeight:1.5}}>{l}</div>
            ))}
          </div>
          <div className="col gap4">
            <h5>Decisions</h5>
            <div className="card" style={{padding:6, fontSize:10}}>Ship IA by Apr 20</div>
            <div className="card" style={{padding:6, fontSize:10}}>Plus = $17</div>
            <h5 style={{marginTop:4}}>Actions</h5>
            <div className="card" style={{padding:6, fontSize:10}}>Toru · brand v2</div>
            <div className="card" style={{padding:6, fontSize:10}}>Matt · pricing one-pager</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LiveA(){
  return (
    <div className="wf">
      <WkSide active="Meetings"/>
      <div className="wf-main">
        <div className="topbar"><h4>Live · Revenue-cat <span className="jp">生中継</span></h4><span className="pill dot" style={{borderColor:'var(--ink)'}}>● REC · 14:22</span></div>
        <div style={{display:'grid', gridTemplateColumns:'1.3fr 1fr', gap:10, flex:1, minHeight:0}}>
          <div className="card" style={{padding:8}}>
            <h5>Transcript</h5>
            <div className="col gap2" style={{fontSize:10, lineHeight:1.4}}>
              <div><span className="xsmall muted">14:20 · MATT</span><br/>If we go with per-seat pricing…</div>
              <div><span className="xsmall muted">14:21 · TORU</span><br/>I'd rather anchor on usage.</div>
              <div><span className="xsmall muted">14:22 · MATT</span><br/>Okay — let's try 3 tiers.</div>
              <div style={{color:'var(--ink-4)'}}>▋ transcribing…</div>
            </div>
          </div>
          <div className="card" style={{padding:8, background:'var(--paper-3)'}}>
            <h5>Live notes</h5>
            <div className="col gap4 small">
              <span>● Pricing anchor discussion</span>
              <span>● Matt prefers per-seat</span>
              <span>● Toru prefers usage</span>
              <span>→ Decision: 3 tiers</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
function LiveB(){
  return (
    <div className="wf">
      <div className="wf-main" style={{padding:0, position:'relative', background:'var(--paper-2)'}}>
        <div className="ph" style={{position:'absolute', inset:0}}>ZOOM CALL</div>
        <div style={{position:'absolute', top:14, right:14, width:180, background:'#fff', border:'1px solid var(--ink)', padding:10, boxShadow:'0 6px 20px rgba(0,0,0,0.15)'}}>
          <div className="row"><span className="jp" style={{fontSize:10}}>生</span><span className="xsmall muted" style={{marginLeft:6}}>SHOGUN LIVE</span><span className="pill" style={{marginLeft:'auto', fontSize:8}}>● REC</span></div>
          <div className="card" style={{padding:6, marginTop:6, background:'var(--paper-3)'}}>
            <div className="xsmall muted">CAPTURING</div>
            <div style={{fontSize:10, marginTop:2}}>"…let's try 3 tiers."</div>
          </div>
          <div className="xsmall muted" style={{marginTop:6}}>LIVE NOTES · 4</div>
          <div className="col gap2 small">
            <span>● Pricing tiers</span><span>● Plus = $17</span><span>→ Action: draft</span>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {GoalA,GoalB,TaskA,TaskB,TaskDetA,TaskDetB,MeetA,MeetB,MIA,MIB,LiveA,LiveB});
