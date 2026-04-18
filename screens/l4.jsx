// L4 AGENTS
window.L4Screens = [
  { code:'A1', jp:'エージェント概要', title:'Agent Overview', desc:'Global view: active, pending, completed.',
    variants:[{label:'A — Status columns', kind:'Kanban-like', render:AgOverA},{label:'B — Timeline feed', kind:'Chronological', render:AgOverB}]},
  { code:'A2', jp:'ライフサイクル', title:'Agent Lifecycle', desc:'Execution log, intermediate results, HITL points.',
    variants:[{label:'A — Log stream', kind:'Terminal-style', render:AgLifeA},{label:'B — Flow diagram', kind:'Node graph', render:AgLifeB}]},
  { code:'A3', jp:'新規作成', title:'New Agent', desc:'Define task, goal, perms, deadline, output.',
    variants:[{label:'A — Form', kind:'Step-by-step', render:AgNewA},{label:'B — Prompt-first', kind:'Describe in words', render:AgNewB}]},
  { code:'A4', jp:'ルーチン', title:'Routines', desc:'Recurring agents (morning brief, weekly, etc).',
    variants:[{label:'A — List', kind:'Table', render:AgRoutineA},{label:'B — Schedule ring', kind:'24h dial', render:AgRoutineB}]},
  { code:'A5', jp:'ルーチンビルダー', title:'Routine Builder', desc:'Schedule, trigger, prompt, output template.',
    variants:[{label:'A — Section stack', kind:'Linear form', render:AgBuildA},{label:'B — Sentence-form', kind:'Mad-libs style', render:AgBuildB}]},
  { code:'A6', jp:'テンプレート', title:'Routine Templates', desc:'Daily brief, weekly review, EOD digest blueprints.',
    variants:[{label:'A — Gallery', kind:'Card grid', render:AgTmplA},{label:'B — Categorized list', kind:'Sidebar + detail', render:AgTmplB}]},
  { code:'A7', jp:'アクション監査', title:'Action Audit', desc:'History of all actions taken (log).',
    variants:[{label:'A — Tabular log', kind:'Ledger', render:AgAuditA},{label:'B — Activity feed', kind:'Narrative', render:AgAuditB}]},
  { code:'A8', jp:'承認キュー', title:'Approval Queue', desc:'Human-in-the-loop gates (e.g. email drafts).',
    variants:[{label:'A — Split review', kind:'List + preview', render:AgApproveA},{label:'B — Stacked cards', kind:'Swipe-style', render:AgApproveB}]},
];

function AgSidebar({active}){
  const items=['Overview','Lifecycle','New','Routines','Templates','Audit','Approve'];
  return (
    <div className="wf-sidebar">
      <div className="brand jp">将</div>
      {items.map(n=><div key={n} className={'item'+(n===active?' active':'')}>{n}</div>)}
      <div className="section">Now</div>
      <div className="item xsmall">● Inbox triage</div>
      <div className="item xsmall">● Weekly recap</div>
      <div className="spacer"/>
      <div className="xsmall muted" style={{padding:6}}>4 active · 3 pending</div>
    </div>
  );
}

function AgOverA(){
  const cols = [
    ['Active', ['Inbox triage · 2m','Weekly recap · queued','Meeting prep · 17:00']],
    ['Pending', ['Email draft approval · 3','Data export · waiting']],
    ['Completed', ['Morning brief · 07:00','News update · 07:30','Capture sweep']],
  ];
  return (
    <div className="wf">
      <AgSidebar active="Overview"/>
      <div className="wf-main">
        <div className="topbar"><h4>Agents <span className="jp">家臣</span></h4><span className="pill">+ New agent</span></div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8, flex:1, minHeight:0}}>
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
function AgOverB(){
  const events = [
    ['07:00','✓','Morning brief · ran'],
    ['07:30','✓','News update · ran'],
    ['13:00','●','Inbox triage · running'],
    ['14:00','○','Meeting prep · scheduled'],
    ['17:00','○','EOD digest · scheduled'],
    ['22:00','○','Dream cycle · scheduled'],
  ];
  return (
    <div className="wf">
      <AgSidebar active="Overview"/>
      <div className="wf-main">
        <div className="topbar"><h4>Today's dispatch</h4><span className="xsmall muted">APR 17</span></div>
        <div className="col gap4">
          {events.map((e,i)=>(
            <div key={i} className="row" style={{borderBottom:'1px dashed var(--line-2)', padding:'5px 0'}}>
              <span className="mono xsmall muted" style={{width:36}}>{e[0]}</span>
              <span style={{width:14}}>{e[1]}</span>
              <span style={{fontSize:10}}>{e[2]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AgLifeA(){
  const log = [
    ['13:00:02','started','Agent: Inbox triage · run #241'],
    ['13:00:04','fetch','Gmail · 14 unread'],
    ['13:00:12','classify','3 urgent · 8 reply · 3 archive'],
    ['13:00:18','draft','Replied to Sarah (intro)'],
    ['13:00:22','hitl','✋ Waiting approval · 3 drafts'],
  ];
  return (
    <div className="wf">
      <AgSidebar active="Lifecycle"/>
      <div className="wf-main" style={{background:'#0e0e0e', color:'#ddd'}}>
        <div className="topbar" style={{borderColor:'#333'}}>
          <h4 style={{color:'#ddd'}}>Inbox triage <span className="jp" style={{color:'#888'}}>実行</span></h4>
          <span className="pill" style={{borderColor:'#555', color:'#ddd'}}>running · 00:22</span>
        </div>
        <div style={{fontFamily:'JetBrains Mono', fontSize:10, flex:1, overflow:'hidden'}}>
          {log.map((l,i)=>(
            <div key={i} style={{display:'grid', gridTemplateColumns:'70px 60px 1fr', gap:6, padding:'3px 0', borderBottom:'1px dashed #222'}}>
              <span style={{color:'#777'}}>{l[0]}</span>
              <span style={{color:'#aaa'}}>{l[1]}</span>
              <span style={{color:'#ddd'}}>{l[2]}</span>
            </div>
          ))}
          <div style={{color:'#ddd', marginTop:6}}>▋</div>
        </div>
        <div className="row gap4" style={{borderTop:'1px solid #333', paddingTop:6}}>
          <span className="pill" style={{color:'#ddd', borderColor:'#555'}}>Review</span>
          <span className="pill" style={{color:'#ddd', borderColor:'#555'}}>Pause</span>
          <span className="pill" style={{color:'#ddd', borderColor:'#555'}}>Kill</span>
        </div>
      </div>
    </div>
  );
}
function AgLifeB(){
  const nodes=[['Fetch',0.1],['Classify',0.3],['Draft',0.5],['Approve',0.7],['Send',0.9]];
  return (
    <div className="wf">
      <AgSidebar active="Lifecycle"/>
      <div className="wf-main">
        <div className="topbar"><h4>Flow <span className="jp">流れ</span></h4><span className="xsmall muted">Inbox triage</span></div>
        <div style={{position:'relative', flex:1, padding:'20px 0'}}>
          <div style={{position:'absolute', top:'50%', left:'6%', right:'6%', height:1, background:'var(--ink)'}}/>
          {nodes.map((n,i)=>(
            <div key={i} style={{position:'absolute', left:`calc(${n[1]*100}% - 20px)`, top:'calc(50% - 20px)', width:40, height:40, border:'1px solid var(--ink)', background: i<3?'var(--ink)':'#fff', color:i<3?'var(--paper)':'var(--ink)', display:'grid', placeItems:'center', fontSize:9, textAlign:'center'}}>
              {n[0]}
            </div>
          ))}
          <div style={{position:'absolute', left:'65%', top:'calc(50% + 28px)', fontSize:9, color:'var(--ink-4)'}}>✋ waiting</div>
        </div>
      </div>
    </div>
  );
}

function AgNewA(){
  return (
    <div className="wf">
      <AgSidebar active="New"/>
      <div className="wf-main">
        <div className="topbar"><h4>New agent <span className="jp">召集</span></h4><span className="pill">Step 2 / 4</span></div>
        <h5>Name</h5><div className="card" style={{padding:6, fontSize:10}}>Weekly Slack recap</div>
        <h5>Task</h5><div className="card" style={{padding:6, fontSize:10, color:'var(--ink-4)'}}>Every Friday, summarize Slack activity…</div>
        <h5>Permissions</h5>
        <div className="row gap4"><span className="pill dot">Slack read</span><span className="pill dot">Memory read</span><span className="pill">Gmail</span></div>
        <h5>Deadline</h5><div className="card" style={{padding:6, fontSize:10}}>Fri 16:00</div>
        <h5>Output</h5>
        <div className="row gap4"><span className="pill solid">Memory</span><span className="pill">Email</span><span className="pill">Chat</span></div>
        <div className="row gap4" style={{marginTop:'auto'}}><span className="pill">← Back</span><span className="pill solid" style={{marginLeft:'auto'}}>Next →</span></div>
      </div>
    </div>
  );
}
function AgNewB(){
  return (
    <div className="wf">
      <AgSidebar active="New"/>
      <div className="wf-main" style={{padding:'20px 40px'}}>
        <div className="xsmall muted center">DESCRIBE YOUR AGENT</div>
        <div className="card" style={{padding:14, marginTop:10, minHeight:80}}>
          <div className="serif" style={{fontSize:13, lineHeight:1.5}}>
            Every Friday at 16:00, <u>read my Slack</u> across all channels and write a <u>weekly recap</u> to <u>memory</u>. If anything urgent came up, <u>flag it</u>.
          </div>
        </div>
        <div className="xsmall muted">SHOGUN UNDERSTOOD</div>
        <div className="col gap4">
          <div className="row small"><span className="mono xsmall muted" style={{width:70}}>trigger</span><span>Weekly · Fri 16:00</span></div>
          <div className="row small"><span className="mono xsmall muted" style={{width:70}}>reads</span><span>Slack (all channels)</span></div>
          <div className="row small"><span className="mono xsmall muted" style={{width:70}}>writes</span><span>Memory · weekly-recap</span></div>
          <div className="row small"><span className="mono xsmall muted" style={{width:70}}>notifies</span><span>If urgent</span></div>
        </div>
        <div className="row gap4" style={{marginTop:'auto'}}><span className="pill">Edit prompt</span><span className="pill solid" style={{marginLeft:'auto'}}>Create agent ↵</span></div>
      </div>
    </div>
  );
}

function AgRoutineA(){
  return (
    <div className="wf">
      <AgSidebar active="Routines"/>
      <div className="wf-main">
        <div className="topbar"><h4>Routines <span className="jp">日課</span></h4><span className="pill">+ New routine</span></div>
        {[['Daily Morning Brief','Daily · 07:00','Active'],['News Update','Daily · 07:30','Active'],['EOD Digest','Daily · 17:00','Active'],['Weekly Review','Weekly · Sun 19:00','Paused'],['Monthly Reset','Monthly · 1st 07:00','Active']].map((r,i)=>(
          <div key={i} className="row" style={{padding:'6px 8px', borderBottom:'1px dashed var(--line-2)'}}>
            <span className="ic fill"/>
            <span style={{marginLeft:8, fontSize:11, flex:1}}>{r[0]}</span>
            <span className="xsmall muted" style={{width:120}}>{r[1]}</span>
            <span className={'pill '+(r[2]==='Active'?'dot':'')}>{r[2]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
function AgRoutineB(){
  const items=[[0.28,'07:00','Morning'],[0.31,'07:30','News'],[0.71,'17:00','EOD'],[0.92,'22:00','Dream']];
  return (
    <div className="wf">
      <AgSidebar active="Routines"/>
      <div className="wf-main">
        <div className="topbar"><h4>24-hour dial <span className="jp">時計</span></h4><span className="xsmall muted">DAILY ROUTINES</span></div>
        <div style={{flex:1, position:'relative', display:'grid', placeItems:'center'}}>
          <svg viewBox="-110 -110 220 220" style={{width:'80%', height:'100%'}}>
            <circle r="100" fill="none" stroke="#1a1a1a" strokeWidth="0.5"/>
            <circle r="80" fill="none" stroke="#cfcfcf" strokeWidth="0.3" strokeDasharray="1 3"/>
            {[0,0.25,0.5,0.75].map(a=>{
              const x1=Math.sin(a*2*Math.PI)*100, y1=-Math.cos(a*2*Math.PI)*100;
              return <line key={a} x1="0" y1="0" x2={x1} y2={y1} stroke="#cfcfcf" strokeWidth="0.3"/>;
            })}
            <text y="-108" textAnchor="middle" fontSize="7" fill="#767676">0</text>
            <text x="108" y="3" fontSize="7" fill="#767676">6</text>
            <text y="115" textAnchor="middle" fontSize="7" fill="#767676">12</text>
            <text x="-108" y="3" textAnchor="end" fontSize="7" fill="#767676">18</text>
            {items.map((it,i)=>{
              const a=it[0];
              const x=Math.sin(a*2*Math.PI)*80, y=-Math.cos(a*2*Math.PI)*80;
              return <g key={i}><circle cx={x} cy={y} r="4" fill="#1a1a1a"/><text x={x} y={y-8} textAnchor="middle" fontSize="6" fill="#1a1a1a">{it[2]}</text></g>;
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}

function AgBuildA(){
  return (
    <div className="wf">
      <AgSidebar active="Routines"/>
      <div className="wf-main">
        <div className="topbar"><h4>Routine builder</h4><span className="pill">Test run</span></div>
        <h5>Schedule</h5>
        <div className="row gap4"><span className="pill solid">Daily</span><span className="pill">Weekly</span><span className="pill">Monthly</span><span className="pill">Custom</span></div>
        <h5>Time</h5><div className="card" style={{padding:6, fontSize:10}}>07:00 · Tokyo</div>
        <h5>Prompt</h5>
        <div className="card" style={{padding:8, fontSize:10, minHeight:40, color:'var(--ink-4)'}}>Act as my productivity coach. Summarize…</div>
        <h5>Output template</h5>
        <div className="row gap4"><span className="pill">Markdown</span><span className="pill solid">Speaker script</span><span className="pill">JSON</span></div>
      </div>
    </div>
  );
}
function AgBuildB(){
  return (
    <div className="wf">
      <AgSidebar active="Routines"/>
      <div className="wf-main" style={{padding:'18px 40px'}}>
        <div className="xsmall muted center">ROUTINE AS A SENTENCE</div>
        <div className="serif" style={{fontSize:14, lineHeight:1.8, marginTop:12}}>
          Every <span className="card" style={{padding:'2px 8px', background:'var(--paper-3)'}}>day</span> at <span className="card" style={{padding:'2px 8px', background:'var(--paper-3)'}}>07:00</span>,
          read <span className="card" style={{padding:'2px 8px', background:'var(--paper-3)'}}>my calendar + overnight memories</span> and
          produce <span className="card" style={{padding:'2px 8px', background:'var(--paper-3)'}}>a 5-min spoken brief</span>,
          sent to <span className="card" style={{padding:'2px 8px', background:'var(--paper-3)'}}>Morning Brief inbox</span>.
        </div>
        <div className="xsmall muted" style={{marginTop:16}}>PREVIEW</div>
        <div className="card" style={{padding:8}}><div className="bar lite" style={{width:'90%'}}/><div className="bar lite" style={{width:'70%', marginTop:3}}/></div>
      </div>
    </div>
  );
}

function AgTmplA(){
  const tmpls=['Daily Morning Brief','Weekly Activity Summary','Daily News Update','End of Day Digest','Communication Review','Yesterday\'s Summary','Monthly Review','+ Custom'];
  return (
    <div className="wf">
      <AgSidebar active="Templates"/>
      <div className="wf-main">
        <div className="topbar"><h4>Templates <span className="jp">型</span></h4><span className="xsmall muted">PICK A BLUEPRINT</span></div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6, flex:1, minHeight:0}}>
          {tmpls.map(t=>(
            <div key={t} className={'card'+(t.startsWith('+')?' outlined':'')} style={{padding:8, minHeight:52}}>
              <div style={{fontSize:10, fontWeight:500}}>{t}</div>
              <div className="bar lite" style={{width:'80%', marginTop:6}}/>
              <div className="bar lite" style={{width:'60%', marginTop:3}}/>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
function AgTmplB(){
  return (
    <div className="wf">
      <div className="wf-sidebar">
        <div className="brand jp">型</div>
        <div className="section">Daily</div>
        <div className="item active">Morning Brief</div>
        <div className="item">News Update</div>
        <div className="item">EOD Digest</div>
        <div className="section">Weekly</div>
        <div className="item">Activity Summary</div>
        <div className="item">Comm Review</div>
        <div className="section">Monthly</div>
        <div className="item">Monthly Review</div>
      </div>
      <div className="wf-main">
        <div className="topbar"><h4>Daily Morning Brief</h4><span className="pill solid">Use template</span></div>
        <div className="xsmall muted">DAILY · 07:00 · POPULAR</div>
        <div className="card" style={{padding:8, fontSize:10, lineHeight:1.5}}>
          A concise 5-minute motivational readout to kickstart your day with priorities, calendar, and inspiration.
        </div>
        <h5>Includes</h5>
        <div className="col gap4 small">
          <span>✓ Weather & schedule</span><span>✓ Overnight activity</span><span>✓ Today's 3 priorities</span><span>✓ One quote</span>
        </div>
        <h5>Preview output</h5>
        <div className="card" style={{padding:8}}><div className="bar lite" style={{width:'90%'}}/><div className="bar lite" style={{width:'80%', marginTop:3}}/><div className="bar lite" style={{width:'60%', marginTop:3}}/></div>
      </div>
    </div>
  );
}

function AgAuditA(){
  const rows=[['14:03','inbox-triage','reply_draft','Sarah intro','pending'],['13:01','morning-brief','memory_write','brief-apr-17','done'],['12:52','news-update','http_get','nyt.com','done'],['11:30','meeting-prep','calendar_read','apr-17-15:00','done']];
  return (
    <div className="wf">
      <AgSidebar active="Audit"/>
      <div className="wf-main">
        <div className="topbar"><h4>Action audit <span className="jp">記録</span></h4><span className="pill">Export</span></div>
        <div style={{display:'grid', gridTemplateColumns:'50px 110px 100px 1fr 80px', gap:6, padding:'4px 0', borderBottom:'1px solid var(--line)', fontSize:9, fontFamily:'JetBrains Mono', textTransform:'uppercase', letterSpacing:'0.12em', color:'var(--ink-4)'}}>
          <span>Time</span><span>Agent</span><span>Action</span><span>Target</span><span>State</span>
        </div>
        {rows.map((r,i)=>(
          <div key={i} style={{display:'grid', gridTemplateColumns:'50px 110px 100px 1fr 80px', gap:6, padding:'4px 0', borderBottom:'1px dashed var(--line-2)', fontSize:10}}>
            <span className="mono xsmall muted">{r[0]}</span>
            <span className="mono xsmall">{r[1]}</span>
            <span className="mono xsmall">{r[2]}</span>
            <span>{r[3]}</span>
            <span className="xsmall">{r[4]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
function AgAuditB(){
  return (
    <div className="wf">
      <AgSidebar active="Audit"/>
      <div className="wf-main">
        <div className="topbar"><h4>Activity <span className="jp">行跡</span></h4><span className="xsmall muted">APR 17</span></div>
        <div className="col gap6">
          {[['14:03','Inbox triage drafted 3 replies','awaiting approval'],['13:01','Morning brief saved to memory','done'],['12:52','News update fetched 7 sources','done'],['11:30','Meeting prep read calendar','done']].map((r,i)=>(
            <div key={i} style={{paddingBottom:6, borderBottom:'1px dashed var(--line-2)'}}>
              <div className="row"><span className="mono xsmall muted" style={{width:44}}>{r[0]}</span><span style={{fontSize:11}}>{r[1]}</span></div>
              <div className="xsmall muted" style={{paddingLeft:44}}>{r[2]}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AgApproveA(){
  return (
    <div className="wf">
      <AgSidebar active="Approve"/>
      <div className="wf-main" style={{padding:'10px 14px'}}>
        <div className="topbar"><h4>Approval queue · 3 <span className="jp">裁可</span></h4><span className="pill">Approve all</span></div>
        <div style={{display:'grid', gridTemplateColumns:'140px 1fr', gap:10, flex:1, minHeight:0}}>
          <div className="col gap4">
            {['Reply to Sarah','Pricing draft send','Weekly recap'].map((t,i)=>(
              <div key={t} className={'card'+(i===0?' ':'')} style={{padding:6, fontSize:10, borderColor: i===0?'var(--ink)':'var(--line)'}}>{t}</div>
            ))}
          </div>
          <div className="card" style={{padding:10}}>
            <div className="xsmall muted">DRAFT · REPLY TO SARAH</div>
            <div className="bar lite" style={{width:'100%', marginTop:6}}/>
            <div className="bar lite" style={{width:'94%', marginTop:3}}/>
            <div className="bar lite" style={{width:'80%', marginTop:3}}/>
            <div className="bar lite" style={{width:'60%', marginTop:3}}/>
            <div className="row gap4" style={{marginTop:10}}>
              <span className="pill">Edit</span><span className="pill">Regenerate</span>
              <span className="pill solid" style={{marginLeft:'auto'}}>✓ Approve & Send</span>
              <span className="pill">✕ Reject</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
function AgApproveB(){
  return (
    <div className="wf">
      <div className="wf-main" style={{padding:'14px 40px', justifyContent:'center'}}>
        <div className="xsmall muted center">3 ACTIONS AWAIT APPROVAL · 1 OF 3</div>
        <div style={{position:'relative', marginTop:12}}>
          <div className="card" style={{position:'absolute', inset:'8px -8px -4px 8px', padding:10, opacity:0.4}}></div>
          <div className="card" style={{position:'absolute', inset:'4px -4px -2px 4px', padding:10, opacity:0.7}}></div>
          <div className="card" style={{padding:14, position:'relative', background:'#fff'}}>
              <div className="xsmall muted">AGENT · INBOX TRIAGE</div>
              <div className="serif" style={{fontSize:14, margin:'4px 0'}}>Reply to Sarah (intro)</div>
              <div className="bar lite" style={{width:'100%'}}/>
              <div className="bar lite" style={{width:'90%', marginTop:3}}/>
              <div className="bar lite" style={{width:'70%', marginTop:3}}/>
          </div>
        </div>
        <div className="row gap8" style={{marginTop:14, justifyContent:'center'}}>
          <span className="pill">← Reject</span><span className="pill">Edit</span><span className="pill solid">Approve →</span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {AgOverA,AgOverB,AgLifeA,AgLifeB,AgNewA,AgNewB,AgRoutineA,AgRoutineB,AgBuildA,AgBuildB,AgTmplA,AgTmplB,AgAuditA,AgAuditB,AgApproveA,AgApproveB});
