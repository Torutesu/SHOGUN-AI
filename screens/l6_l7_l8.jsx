// L6 CAPTURE, L7 INTEGRATIONS, L8 SETTINGS (compact)
window.L6Screens = [
  { code:'CP1', jp:'スクリーンキャプチャ', title:'Capture Dashboard', desc:'App/site usage distribution, today ingested.',
    variants:[{label:'A — Bar chart + list', kind:'Classic', render:CapDashA},{label:'B — Pie + zones', kind:'Distribution', render:CapDashB}]},
  { code:'CP2', jp:'キャプチャ履歴', title:'Capture History', desc:'Detailed log by app + timestamp.',
    variants:[{label:'A — Log table', kind:'Ledger', render:CapHistA},{label:'B — Timeline', kind:'Scrub', render:CapHistB}]},
  { code:'CP3', jp:'アプリ除外', title:'App Exclude', desc:'App blacklist.',
    variants:[{label:'A — Search + list', kind:'Toggle each', render:CapExAppA},{label:'B — Grid', kind:'App icons', render:CapExAppB}]},
  { code:'CP4', jp:'ウェブ除外', title:'Web Exclude', desc:'Domain / URL blacklist.',
    variants:[{label:'A — Domain list', kind:'Add/remove', render:CapExWebA},{label:'B — Rule builder', kind:'Patterns', render:CapExWebB}]},
  { code:'CP5', jp:'データ消去', title:'Data Purge', desc:'Manual delete by period / total wipe.',
    variants:[{label:'A — Preset buttons', kind:'1h / 1d / all', render:CapPurgeA},{label:'B — Time slider', kind:'Visual range', render:CapPurgeB}]},
];

window.L7Screens = [
  { code:'I1', jp:'アプリ目録', title:'App Directory', desc:'Connected + available external services.',
    variants:[{label:'A — Sections list', kind:'Like Littlebird', render:IntDirA},{label:'B — Grid tiles', kind:'App store feel', render:IntDirB}]},
  { code:'I2', jp:'接続詳細', title:'Connection Detail', desc:'Auth status, sync frequency, data scope.',
    variants:[{label:'A — Status panel', kind:'Form + meta', render:IntDetA},{label:'B — Activity log', kind:'What it read', render:IntDetB}]},
  { code:'I3', jp:'MCP サーバー', title:'MCP Servers', desc:'Connected MCP servers + tools.',
    variants:[{label:'A — Server list', kind:'With tool count', render:MCPA},{label:'B — Tool catalog', kind:'Flat tool list', render:MCPB}]},
  { code:'I4', jp:'BYOK', title:'BYOK · Model Management', desc:'Anthropic, OpenAI, Google keys.',
    variants:[{label:'A — Provider cards', kind:'Keyed provider', render:ByokA},{label:'B — Table', kind:'All keys at once', render:ByokB}]},
];

window.L8Screens = [
  { code:'S1–S9', jp:'設定', title:'Settings (all)', desc:'General, Appearance, Privacy, Data, AI, Shortcuts, Notifications, Subscription, Support.',
    variants:[{label:'A — Classic nav', kind:'Sidebar + panel', render:SetA},{label:'B — Spatial map', kind:'Grouped board', render:SetB}]},
];

// ============ L6 ============
function CapSide({active}){
  return <div className="wf-sidebar"><div className="brand jp">捕</div>
    {['Dashboard','History','App exclude','Web exclude','Purge'].map(n=><div key={n} className={'item'+(n===active?' active':'')}>{n}</div>)}
    <div className="spacer"/><div className="xsmall muted" style={{padding:6}}>3,420 captures · today</div>
  </div>;
}
function CapDashA(){
  const apps=[['Chrome',0.44],['VS Code',0.22],['Figma',0.14],['Slack',0.10],['Mail',0.06],['Other',0.04]];
  return <div className="wf"><CapSide active="Dashboard"/><div className="wf-main">
    <div className="topbar"><h4>Capture <span className="jp">見聞</span></h4><span className="pill dot">Recording</span></div>
    <div className="xsmall muted">APPS · TODAY</div>
    {apps.map((a,i)=><div key={i} className="row" style={{gap:6, alignItems:'center', padding:'3px 0'}}>
      <span style={{fontSize:10, width:60}}>{a[0]}</span>
      <div style={{flex:1, height:8, background:'var(--line-3)'}}><div style={{width:`${a[1]*100}%`, height:'100%', background:'var(--ink)'}}/></div>
      <span className="xsmall muted" style={{width:32, textAlign:'right'}}>{Math.round(a[1]*100)}%</span>
    </div>)}
    <h5 style={{marginTop:4}}>Ingested</h5>
    <div className="row gap4"><span className="pill">3,420 frames</span><span className="pill">12 hrs</span><span className="pill">82MB</span></div>
  </div></div>;
}
function CapDashB(){
  return <div className="wf"><CapSide active="Dashboard"/><div className="wf-main">
    <div className="topbar"><h4>Zones <span className="jp">圏</span></h4></div>
    <div style={{flex:1, display:'grid', placeItems:'center'}}>
      <svg viewBox="-60 -60 120 120" style={{width:'60%'}}>
        <circle r="50" fill="none" stroke="#cfcfcf"/>
        <path d="M0,-50 A50,50 0 0,1 47,17 L0,0 Z" fill="#1a1a1a"/>
        <path d="M47,17 A50,50 0 0,1 -16,47 L0,0 Z" fill="#4a4a4a"/>
        <path d="M-16,47 A50,50 0 0,1 -47,-17 L0,0 Z" fill="#a8a8a8"/>
        <path d="M-47,-17 A50,50 0 0,1 0,-50 L0,0 Z" fill="#e2e2e2"/>
      </svg>
    </div>
    <div className="row gap4" style={{justifyContent:'center'}}>
      <span className="xsmall"><span className="ic fill"/> work 44%</span>
      <span className="xsmall"><span className="ic" style={{background:'#4a4a4a'}}/> comm 24%</span>
      <span className="xsmall"><span className="ic" style={{background:'#a8a8a8'}}/> research 18%</span>
      <span className="xsmall"><span className="ic"/> misc 14%</span>
    </div>
  </div></div>;
}
function CapHistA(){
  return <div className="wf"><CapSide active="History"/><div className="wf-main">
    <div className="topbar"><h4>Capture history</h4><span className="pill">Filter</span></div>
    {[['14:22','Chrome','reddit.com/r/design'],['14:18','Figma','SHOGUN – L3'],['14:05','Slack','#general'],['13:45','VS Code','l5.jsx'],['13:20','Zoom','All PJ meeting']].map((r,i)=>(
      <div key={i} className="row" style={{padding:'4px 0', borderBottom:'1px dashed var(--line-2)', fontSize:10}}>
        <span className="mono xsmall muted" style={{width:44}}>{r[0]}</span>
        <span className="mono xsmall" style={{width:70}}>{r[1]}</span>
        <span style={{flex:1}}>{r[2]}</span>
      </div>
    ))}
  </div></div>;
}
function CapHistB(){
  return <div className="wf"><CapSide active="History"/><div className="wf-main">
    <div className="topbar"><h4>Activity stream</h4></div>
    <div style={{position:'relative', flex:1}}>
      <div style={{position:'absolute', left:40, top:0, bottom:0, width:1, background:'var(--ink)'}}/>
      {[10,30,55,75,85].map((t,i)=>(
        <div key={i} style={{position:'absolute', left:0, top:`${t}%`, right:0, display:'flex', gap:10, alignItems:'center'}}>
          <span className="mono xsmall muted" style={{width:36}}>{['14:22','14:05','13:45','13:20','12:58'][i]}</span>
          <div style={{width:6, height:6, background:'var(--ink)', borderRadius:'50%'}}/>
          <span style={{fontSize:10}}>{['Chrome · reddit','Slack · #general','VS Code · l5.jsx','Zoom · All PJ','Chrome · notion'][i]}</span>
        </div>
      ))}
    </div>
  </div></div>;
}
function CapExAppA(){
  return <div className="wf"><CapSide active="App exclude"/><div className="wf-main">
    <div className="topbar"><h4>Exclude apps</h4><span className="pill">Filter</span></div>
    <div className="card" style={{padding:6, fontSize:10, color:'var(--ink-4)'}}>Search…</div>
    {['1Password','Finder','Messages','Mail','Banking app'].map((a,i)=>(
      <div key={i} className="row" style={{padding:'5px 0', borderBottom:'1px dashed var(--line-2)'}}>
        <div className="ic" style={{width:14, height:14}}/>
        <span style={{marginLeft:8, fontSize:10, flex:1}}>{a}</span>
        <div style={{width:22, height:12, background:i<2?'var(--ink)':'var(--line)', position:'relative', borderRadius:6}}>
          <div style={{position:'absolute', top:1, left:i<2?11:1, width:10, height:10, background:'#fff', borderRadius:5}}/>
        </div>
      </div>
    ))}
  </div></div>;
}
function CapExAppB(){
  return <div className="wf"><CapSide active="App exclude"/><div className="wf-main">
    <div className="topbar"><h4>App grid</h4><span className="xsmall muted">TAP TO TOGGLE</span></div>
    <div style={{display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gap:6, flex:1}}>
      {['1P','Fi','Me','Ma','Bk','Sp','No','Sl','VS','Ch','Fg','Zm'].map((n,i)=>(
        <div key={i} style={{border:'1px solid var(--line)', padding:6, textAlign:'center', background:i<5?'var(--paper-2)':'#fff', opacity:i<5?0.5:1}}>
          <div className="ic" style={{width:20, height:20, margin:'0 auto'}}/>
          <div className="xsmall" style={{marginTop:4}}>{n}</div>
          {i<5 && <div className="xsmall muted">✕</div>}
        </div>
      ))}
    </div>
  </div></div>;
}
function CapExWebA(){
  return <div className="wf"><CapSide active="Web exclude"/><div className="wf-main">
    <div className="topbar"><h4>Exclude websites · 11</h4><span className="pill">+ Add</span></div>
    {['bank.jp','healthrecords.com','*.internal/*','tax-portal.gov','salesforce.com/private'].map(d=>(
      <div key={d} className="row" style={{padding:'5px 0', borderBottom:'1px dashed var(--line-2)'}}>
        <span className="mono" style={{fontSize:10, flex:1}}>{d}</span><span className="xsmall muted">✕</span>
      </div>
    ))}
  </div></div>;
}
function CapExWebB(){
  return <div className="wf"><CapSide active="Web exclude"/><div className="wf-main">
    <div className="topbar"><h4>Rule builder</h4></div>
    <div className="card" style={{padding:10}}>
      <div className="row gap4"><span className="pill solid">Block</span><span>URL matches</span>
        <div className="card" style={{padding:'3px 8px', fontSize:10, flex:1}} >*.bank.jp/*</div>
      </div>
      <div className="row gap4" style={{marginTop:6}}><span className="pill solid">Block</span><span>Title contains</span>
        <div className="card" style={{padding:'3px 8px', fontSize:10, flex:1}} >password</div>
      </div>
    </div>
    <div className="xsmall muted">PREVIEW · 23 URLS IN LAST 24H WOULD BE BLOCKED</div>
  </div></div>;
}
function CapPurgeA(){
  return <div className="wf"><CapSide active="Purge"/><div className="wf-main">
    <div className="topbar"><h4>Purge <span className="jp">消去</span></h4></div>
    {[['Last hour','Remove captures from last 60m'],['Last 24 hours','Remove today\'s captures'],['Last 7 days','Remove this week'],['All captures','Cannot be undone']].map((r,i)=>(
      <div key={i} className="row card" style={{padding:8, justifyContent:'space-between'}}>
        <div><div style={{fontSize:11}}>{r[0]}</div><div className="xsmall muted">{r[1]}</div></div>
        <span className={'pill'+(i===3?' solid':'')}>Delete</span>
      </div>
    ))}
  </div></div>;
}
function CapPurgeB(){
  return <div className="wf"><CapSide active="Purge"/><div className="wf-main">
    <div className="topbar"><h4>Time range</h4></div>
    <div className="xsmall muted" style={{marginTop:6}}>DRAG TO SELECT RANGE</div>
    <div style={{flex:1, position:'relative', padding:'24px 0'}}>
      <div style={{position:'relative', height:40, background:'var(--line-3)'}}>
        <div style={{position:'absolute', top:0, bottom:0, left:'20%', right:'55%', background:'var(--ink)'}}/>
        <div style={{position:'absolute', top:-4, left:'20%', width:2, height:48, background:'var(--ink)'}}/>
        <div style={{position:'absolute', top:-4, left:'45%', width:2, height:48, background:'var(--ink)'}}/>
      </div>
      <div className="row" style={{justifyContent:'space-between', marginTop:6}}>
        <span className="xsmall muted">APR 1</span><span className="xsmall muted">APR 17</span>
      </div>
    </div>
    <div className="row"><span style={{fontSize:11}}>Apr 4–9 selected · 814 captures</span><span className="pill solid" style={{marginLeft:'auto'}}>Delete range</span></div>
  </div></div>;
}

// ============ L7 ============
function IntSide({active}){
  return <div className="wf-sidebar"><div className="brand jp">繋</div>
    {['Apps','Connections','MCP','BYOK'].map(n=><div key={n} className={'item'+(n===active?' active':'')}>{n}</div>)}
    <div className="spacer"/><div className="xsmall muted" style={{padding:6}}>4 connected</div>
  </div>;
}
function IntDirA(){
  return <div className="wf"><IntSide active="Apps"/><div className="wf-main">
    <div className="topbar"><h4>Integrations <span className="jp">接続</span></h4></div>
    {[['Apple Calendar','Beta','Connect'],['Gmail','Connected','torubj0904'],['Google Calendar','Connected','torubj0904'],['Google Drive','','Connect'],['Outlook','','Connect'],['Slack','','Connect']].map((r,i)=>(
      <div key={i} className="row" style={{padding:'6px 8px', borderBottom:'1px dashed var(--line-2)'}}>
        <div className="ic" style={{width:14, height:14}}/>
        <span style={{marginLeft:8, fontSize:11}}>{r[0]}</span>
        {r[1] && <span className="pill" style={{marginLeft:6, fontSize:8}}>{r[1]}</span>}
        <span className="xsmall muted" style={{marginLeft:'auto'}}>{r[2]}</span>
      </div>
    ))}
  </div></div>;
}
function IntDirB(){
  return <div className="wf"><IntSide active="Apps"/><div className="wf-main">
    <div className="topbar"><h4>App directory</h4><span className="pill">Filter</span></div>
    <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6, flex:1}}>
      {['Cal','Gmail','GCal','Drive','Outl','Slack','Notion','Linear','GitHub','Figma','Zoom','+'].map((n,i)=>(
        <div key={i} className={'card'+(n==='+'?' outlined':'')} style={{padding:8, textAlign:'center'}}>
          <div className="ic" style={{width:24, height:24, margin:'0 auto'}}/>
          <div className="xsmall" style={{marginTop:4}}>{n}</div>
          {i<3 && <div className="xsmall muted">●</div>}
        </div>
      ))}
    </div>
  </div></div>;
}
function IntDetA(){
  return <div className="wf"><IntSide active="Connections"/><div className="wf-main">
    <div className="topbar"><div><h4>Gmail</h4><span className="xsmall muted">CONNECTED · APR 12</span></div><span className="pill dot">Healthy</span></div>
    <h5>Account</h5><div className="card" style={{padding:6, fontSize:10}}>torubj0904@gmail.com</div>
    <h5>Sync</h5>
    <div className="row gap4"><span className="pill solid">Realtime</span><span className="pill">5 min</span><span className="pill">Hourly</span></div>
    <h5>Scope</h5>
    <div className="col gap2 small"><span>✓ Read inbox</span><span>✓ Read sent</span><span>✕ Send as me</span><span>✕ Delete</span></div>
    <div className="row gap4" style={{marginTop:'auto'}}><span className="pill">Reconnect</span><span className="pill">Disconnect</span></div>
  </div></div>;
}
function IntDetB(){
  return <div className="wf"><IntSide active="Connections"/><div className="wf-main">
    <div className="topbar"><h4>Gmail · activity</h4></div>
    {[['14:22','read','Sarah intro thread'],['13:50','read','Elevenlabs reply'],['13:10','memory','Saved thread to memory'],['12:05','read','14 new unread'],['07:00','agent','Inbox triage fetched']].map((r,i)=>(
      <div key={i} className="row" style={{padding:'4px 0', borderBottom:'1px dashed var(--line-2)', fontSize:10}}>
        <span className="mono xsmall muted" style={{width:44}}>{r[0]}</span>
        <span className="mono xsmall" style={{width:60}}>{r[1]}</span>
        <span style={{flex:1}}>{r[2]}</span>
      </div>
    ))}
  </div></div>;
}
function MCPA(){
  return <div className="wf"><IntSide active="MCP"/><div className="wf-main">
    <div className="topbar"><h4>MCP servers <span className="jp">接続器</span></h4><span className="pill">+ Add</span></div>
    {[['github-mcp','Connected','14 tools'],['linear-mcp','Connected','6 tools'],['filesystem','Local','3 tools'],['postgres','Offline','0 tools']].map((r,i)=>(
      <div key={i} className="card" style={{padding:8}}>
        <div className="row">
          <span className="mono" style={{fontSize:11, flex:1}}>{r[0]}</span>
          <span className="pill" style={{fontSize:8}}>{r[1]}</span>
        </div>
        <div className="xsmall muted" style={{marginTop:4}}>{r[2]}</div>
      </div>
    ))}
  </div></div>;
}
function MCPB(){
  return <div className="wf"><IntSide active="MCP"/><div className="wf-main">
    <div className="topbar"><h4>Tool catalog</h4><span className="xsmall muted">23 TOOLS · 4 SERVERS</span></div>
    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:4, flex:1, minHeight:0}}>
      {['github.search_repos','github.create_issue','linear.list_tickets','linear.update_ticket','fs.read_file','fs.write_file','postgres.query','github.pr_review'].map(t=>(
        <div key={t} className="row" style={{padding:'3px 6px', border:'1px solid var(--line-2)', fontFamily:'JetBrains Mono', fontSize:9}}>
          <span>{t}</span><span className="xsmall muted" style={{marginLeft:'auto'}}>↗</span>
        </div>
      ))}
    </div>
  </div></div>;
}
function ByokA(){
  return <div className="wf"><IntSide active="BYOK"/><div className="wf-main">
    <div className="topbar"><h4>Model keys <span className="jp">鍵</span></h4></div>
    {[['Anthropic','sk-ant-•••••abc','default'],['OpenAI','sk-•••••xyz',''],['Google','AIza•••••',''],['Groq','gsk_•••••','fast']].map((r,i)=>(
      <div key={i} className="card" style={{padding:8}}>
        <div className="row">
          <span style={{fontSize:11, flex:1}}>{r[0]}</span>
          {r[2] && <span className="pill" style={{fontSize:8}}>{r[2]}</span>}
        </div>
        <div className="mono xsmall muted" style={{marginTop:3}}>{r[1]}</div>
        <div className="row gap4" style={{marginTop:6}}><span className="xsmall muted">Edit</span><span className="xsmall muted">Test</span><span className="xsmall muted">Remove</span></div>
      </div>
    ))}
  </div></div>;
}
function ByokB(){
  return <div className="wf"><IntSide active="BYOK"/><div className="wf-main">
    <div className="topbar"><h4>BYOK · table</h4></div>
    <div style={{display:'grid', gridTemplateColumns:'90px 1fr 70px 60px 60px', gap:6, padding:'4px 0', borderBottom:'1px solid var(--line)', fontSize:9, fontFamily:'JetBrains Mono', color:'var(--ink-4)'}}>
      <span>PROVIDER</span><span>KEY</span><span>USED</span><span>STATUS</span><span/>
    </div>
    {[['Anthropic','sk-ant-•••••abc','42k','ok'],['OpenAI','sk-•••••xyz','0','unused'],['Google','AIza•••••','1.2k','ok'],['Groq','gsk_•••••','8k','ok']].map((r,i)=>(
      <div key={i} style={{display:'grid', gridTemplateColumns:'90px 1fr 70px 60px 60px', gap:6, padding:'4px 0', borderBottom:'1px dashed var(--line-2)', fontSize:10}}>
        <span>{r[0]}</span><span className="mono xsmall">{r[1]}</span><span className="xsmall muted">{r[2]}</span><span className="xsmall">{r[3]}</span><span className="xsmall muted">Edit</span>
      </div>
    ))}
  </div></div>;
}

// ============ L8 ============
function SetA(){
  return <div className="wf">
    <div className="wf-sidebar" style={{width:120}}>
      <div className="brand jp">設</div>
      {['General','System','Appearance','Privacy','Data','AI Models','Shortcuts','Notifications','Subscription','Support'].map((n,i)=>(
        <div key={n} className={'item'+(i===2?' active':'')} style={{fontSize:9}}>{n}</div>
      ))}
    </div>
    <div className="wf-main">
      <div className="topbar"><h4>Appearance <span className="jp">外観</span></h4></div>
      <h5>Color mode</h5>
      <div className="row gap6">
        {['Light','Dark','System'].map((t,i)=>(
          <div key={t} className={'card'+(i===1?'':' outlined')} style={{padding:6, width:80, textAlign:'center'}}>
            <div className="ph" style={{height:36}}/>
            <div className="xsmall" style={{marginTop:3}}>{t}</div>
          </div>
        ))}
      </div>
      <h5>Density</h5>
      <div className="row gap4"><span className="pill">Compact</span><span className="pill solid">Normal</span><span className="pill">Roomy</span></div>
      <h5>Typography</h5>
      <div className="row gap4"><span className="pill solid">Serif + sans</span><span className="pill">Sans</span><span className="pill">Mono</span></div>
      <h5>Grid</h5>
      <div className="row gap4"><span className="pill">Tatami · 8</span><span className="pill solid">Tatami · 12</span></div>
    </div>
  </div>;
}
function SetB(){
  const groups=[
    ['You',['General','Subscription','Support']],
    ['System',['Launch','Notifications','Shortcuts']],
    ['Intelligence',['AI Models','BYOK','Chat']],
    ['Data',['Privacy','Data controls','Capture']],
    ['Look',['Appearance','Typography','Density']],
  ];
  return <div className="wf"><div className="wf-main">
    <div className="topbar"><h4>Settings map <span className="jp">設定図</span></h4><span className="xsmall muted">CLICK A CELL</span></div>
    <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:6, flex:1, minHeight:0}}>
      {groups.map(([n, items])=>(
        <div key={n} className="card" style={{padding:8}}>
          <div className="xsmall muted" style={{textTransform:'uppercase', letterSpacing:'0.15em'}}>{n}</div>
          <div className="col gap2" style={{marginTop:6}}>
            {items.map(i=><div key={i} className="row small" style={{justifyContent:'space-between'}}><span>{i}</span><span className="muted">→</span></div>)}
          </div>
        </div>
      ))}
    </div>
  </div></div>;
}

Object.assign(window,{CapDashA,CapDashB,CapHistA,CapHistB,CapExAppA,CapExAppB,CapExWebA,CapExWebB,CapPurgeA,CapPurgeB,IntDirA,IntDirB,IntDetA,IntDetB,MCPA,MCPB,ByokA,ByokB,SetA,SetB});
