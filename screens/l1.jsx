// L1 HOME — Dashboard, Morning Brief, Evening Digest
window.L1Screens = [
  {
    code: 'H1',
    jp: 'ダッシュボード',
    title: 'Dashboard',
    desc: "Today's focus, morning brief, next action, active tasks.",
    variants: [
      { label: 'A — Conventional grid', kind: 'Tatami sidebar + cards', render: DashA },
      { label: 'B — Vertical scroll canvas', kind: 'Single column, rhythm', render: DashB },
    ],
  },
  {
    code: 'H2',
    jp: '朝のブリーフィング',
    title: 'Morning Briefing',
    desc: 'Wake-up briefing; repository of routine outputs.',
    variants: [
      { label: 'A — Scroll format', kind: 'Emulates a paper scroll', render: MornA },
      { label: 'B — Agenda + audio', kind: 'Audio-forward readout', render: MornB },
    ],
  },
  {
    code: 'H3',
    jp: '夕方のダイジェスト',
    title: 'Evening Digest',
    desc: 'Daily reflection, handoff notes for tomorrow.',
    variants: [
      { label: 'A — Two-column ledger', kind: 'Did / carry forward', render: EveA },
      { label: 'B — Reflective prompt', kind: 'Journal-like', render: EveB },
    ],
  },
];

function DashA() {
  return (
    <div className="wf">
      <div className="wf-sidebar">
        <div className="brand jp">将軍</div>
        <div className="item active">Home<span className="xsmall">⌘1</span></div>
        <div className="item">Memory</div>
        <div className="item">Chat</div>
        <div className="item">Agents</div>
        <div className="item">Work</div>
        <div className="section">Pinned</div>
        <div className="item">Morning Brief</div>
        <div className="item">Approval Queue</div>
        <div className="item">Goal Tree</div>
        <div className="spacer" />
        <div className="user">Toru · Basic</div>
      </div>
      <div className="wf-main">
        <div className="topbar">
          <div>
            <h4>Good evening, Toru <span className="jp">こんばんは</span></h4>
            <div className="small">Fri · April 17 · 19:42 JST</div>
          </div>
          <div className="row gap8">
            <span className="pill dot">9 memories today</span>
            <span className="pill">+ Command</span>
          </div>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'1.3fr 1fr', gap:10, flex:1, minHeight:0}}>
          <div className="col gap8">
            <div className="card">
              <h5>Today's focus</h5>
              <div className="serif" style={{fontSize:13, lineHeight:1.3}}>Finish SHOGUN IA review & ship 3 variants to Toru.</div>
              <div className="row gap8 small muted" style={{marginTop:6}}>
                <span>Derived from M · 4 memories</span><span>·</span><span>Edit</span>
              </div>
            </div>
            <div className="card" style={{flex:1}}>
              <h5>Morning brief · 07:00 <span className="xsmall">RAN</span></h5>
              <div className="col gap4" style={{marginTop:4}}>
                <div className="bar" style={{width:'92%'}} />
                <div className="bar mid" style={{width:'74%'}} />
                <div className="bar lite" style={{width:'60%'}} />
                <div className="bar lite" style={{width:'80%'}} />
              </div>
              <div className="small muted" style={{marginTop:6}}>Open full · Export · Re-run</div>
            </div>
          </div>
          <div className="col gap8">
            <div className="card">
              <h5>Next action</h5>
              <div style={{fontSize:11}}>Review approval queue (3)</div>
              <div className="xsmall muted">Agent · Inbox triage</div>
            </div>
            <div className="card" style={{flex:1}}>
              <h5>Active agents · 4</h5>
              <div className="col gap4" style={{marginTop:4}}>
                <div className="row gap4"><span className="ic fill" /><span style={{fontSize:10}}>Inbox triage</span><span className="xsmall muted" style={{marginLeft:'auto'}}>running</span></div>
                <div className="row gap4"><span className="ic circle" /><span style={{fontSize:10}}>Weekly recap</span><span className="xsmall muted" style={{marginLeft:'auto'}}>queued</span></div>
                <div className="row gap4"><span className="ic" /><span style={{fontSize:10}}>Meeting prep</span><span className="xsmall muted" style={{marginLeft:'auto'}}>17:00</span></div>
                <div className="row gap4"><span className="ic dash" /><span style={{fontSize:10}}>Dream cycle</span><span className="xsmall muted" style={{marginLeft:'auto'}}>22:00</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashB() {
  return (
    <div className="wf">
      <div className="wf-main" style={{padding:'14px 60px', maxWidth:'none'}}>
        <div className="center" style={{borderBottom:'1px solid var(--line-2)', paddingBottom:8}}>
          <div className="xsmall muted">FRI · APRIL 17 · 19:42</div>
          <h4 className="serif" style={{fontSize:22, margin:'6px 0 2px'}}>Good evening, Toru</h4>
          <div className="jp" style={{fontSize:10, color:'var(--ink-4)'}}>こんばんは、とおる</div>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'40px 1fr', gap:12, marginTop:8}}>
          <div className="vertical-jp">今日の焦点</div>
          <div className="col gap8">
            <div className="serif" style={{fontSize:14, lineHeight:1.3}}>Finish SHOGUN IA review & ship 3 variants.</div>
            <div className="small muted">Derived from 4 memories · synthesized 07:02</div>
          </div>
        </div>
        <div className="line" style={{margin:'8px 0'}} />
        <div style={{display:'grid', gridTemplateColumns:'40px 1fr', gap:12}}>
          <div className="vertical-jp">次の行動</div>
          <div className="card" style={{background:'var(--paper-3)'}}>
            <div style={{fontSize:11}}>Review approval queue · 3 items waiting</div>
            <div className="xsmall muted" style={{marginTop:4}}>Inbox triage agent · drafts ready</div>
          </div>
        </div>
        <div className="line" style={{margin:'8px 0'}} />
        <div style={{display:'grid', gridTemplateColumns:'40px 1fr', gap:12}}>
          <div className="vertical-jp">活動中</div>
          <div className="col gap4">
            <div className="row small"><span className="ic fill" /><span style={{marginLeft:6}}>Inbox triage</span><span className="muted" style={{marginLeft:'auto'}}>running · 2m</span></div>
            <div className="row small"><span className="ic" /><span style={{marginLeft:6}}>Weekly recap</span><span className="muted" style={{marginLeft:'auto'}}>queued</span></div>
            <div className="row small"><span className="ic dash" /><span style={{marginLeft:6}}>Dream cycle</span><span className="muted" style={{marginLeft:'auto'}}>22:00</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MornA() {
  return (
    <div className="wf">
      <div className="wf-main" style={{padding:'14px 48px'}}>
        <div className="row" style={{justifyContent:'space-between', borderBottom:'1px solid var(--ink)', paddingBottom:6}}>
          <div>
            <div className="serif" style={{fontSize:16}}>Morning Brief</div>
            <div className="xsmall muted">APRIL 17, FRI · 07:00 · READ 4 MIN</div>
          </div>
          <div className="row gap4">
            <span className="kbd">↻</span><span className="kbd">↓</span><span className="kbd">⏻</span>
          </div>
        </div>
        <div style={{overflow:'hidden', flex:1}}>
          <h5 style={{marginTop:8}}>01 · Weather & schedule</h5>
          <div className="col gap4">
            <div className="bar lite" style={{width:'94%'}}/>
            <div className="bar lite" style={{width:'80%'}}/>
          </div>
          <h5 style={{marginTop:10}}>02 · Overnight activity</h5>
          <div className="col gap4">
            <div className="bar lite" style={{width:'88%'}}/>
            <div className="bar lite" style={{width:'72%'}}/>
            <div className="bar lite" style={{width:'90%'}}/>
          </div>
          <h5 style={{marginTop:10}}>03 · Today's three priorities</h5>
          <div className="col gap4">
            <div className="card" style={{padding:'4px 8px', fontSize:10}}>① Ship SHOGUN wireframes by 15:00</div>
            <div className="card" style={{padding:'4px 8px', fontSize:10}}>② Prep for Revenue-cat CTO call</div>
            <div className="card" style={{padding:'4px 8px', fontSize:10}}>③ Review Memory dream cycle output</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MornB() {
  return (
    <div className="wf">
      <div className="wf-sidebar" style={{width:120}}>
        <div className="brand jp">朝</div>
        <div className="section">Sections</div>
        <div className="item active">Overview</div>
        <div className="item">Weather</div>
        <div className="item">Schedule</div>
        <div className="item">Overnight</div>
        <div className="item">Priorities</div>
        <div className="item">Inspiration</div>
        <div className="spacer"/>
        <div className="xsmall muted" style={{padding:6}}>April 17 · 07:00</div>
      </div>
      <div className="wf-main">
        <div className="topbar">
          <h4>Morning Brief <span className="jp">おはよう</span></h4>
          <span className="pill dot">Playing · 01:24 / 04:12</span>
        </div>
        <div className="card" style={{background:'var(--paper-3)', padding:14}}>
          <div className="xsmall muted">NOW PLAYING</div>
          <div className="serif" style={{fontSize:14, margin:'4px 0'}}>"Good morning, Toru. Three things matter today…"</div>
          <div className="row gap8" style={{marginTop:6}}>
            <div className="bar" style={{flex:1, height:3, background:'var(--ink)'}}/>
            <div className="bar lite" style={{flex:2, height:3}}/>
          </div>
          <div className="row gap4 xsmall muted" style={{marginTop:6}}>
            <span className="kbd">⏮</span><span className="kbd">⏯</span><span className="kbd">⏭</span><span className="kbd">1.2×</span>
            <span style={{marginLeft:'auto'}}>Transcript ↓</span>
          </div>
        </div>
        <h5>Agenda</h5>
        <div className="col gap4">
          <div className="row small"><span className="mono">01</span><span style={{marginLeft:8}}>Weather · Tokyo, 17°C, clear</span></div>
          <div className="row small"><span className="mono">02</span><span style={{marginLeft:8}}>3 meetings today · first at 10:30</span></div>
          <div className="row small"><span className="mono">03</span><span style={{marginLeft:8}}>5 memories from overnight</span></div>
          <div className="row small"><span className="mono">04</span><span style={{marginLeft:8}}>Top priority: SHOGUN IA review</span></div>
        </div>
      </div>
    </div>
  );
}

function EveA() {
  return (
    <div className="wf">
      <div className="wf-main" style={{padding:'14px 40px'}}>
        <div className="topbar">
          <h4>Evening Digest <span className="jp">夕刻</span></h4>
          <div className="xsmall muted">APR 17 · 19:42</div>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1px 1fr', gap:16, flex:1, minHeight:0}}>
          <div className="col gap4">
            <h5>Done today</h5>
            <div className="row small"><span>✓</span><span style={{marginLeft:6}}>IA doc review</span></div>
            <div className="row small"><span>✓</span><span style={{marginLeft:6}}>3 meetings transcribed</span></div>
            <div className="row small"><span>✓</span><span style={{marginLeft:6}}>Inbox triaged · 14 replies drafted</span></div>
            <div className="row small"><span>✓</span><span style={{marginLeft:6}}>Weekly recap generated</span></div>
            <div className="row small muted"><span>~</span><span style={{marginLeft:6}}>Memory graph rebuild · 82%</span></div>
          </div>
          <div style={{background:'var(--line-2)'}}/>
          <div className="col gap4">
            <h5>Carry to tomorrow</h5>
            <div className="card" style={{padding:'4px 8px', fontSize:10}}>Revenue-cat CTO prep doc</div>
            <div className="card" style={{padding:'4px 8px', fontSize:10}}>Review dream cycle output</div>
            <div className="card" style={{padding:'4px 8px', fontSize:10}}>Respond: Elevenlabs intro email</div>
            <div className="xsmall muted" style={{marginTop:4}}>Morning brief will pick these up at 07:00.</div>
          </div>
        </div>
        <div className="line" style={{marginTop:8}}/>
        <div className="xsmall muted center">Save · Share · Regenerate</div>
      </div>
    </div>
  );
}

function EveB() {
  return (
    <div className="wf">
      <div className="wf-main" style={{padding:'20px 60px', justifyContent:'center'}}>
        <div className="xsmall muted center">APRIL 17 · FRIDAY · 19:42</div>
        <div className="serif center" style={{fontSize:22, lineHeight:1.25, margin:'8px 0'}}>
          What mattered today?
        </div>
        <div className="jp center" style={{fontSize:10, color:'var(--ink-4)'}}>今日、何が大切だったか</div>
        <div className="card" style={{marginTop:14, padding:12, background:'var(--paper-3)'}}>
          <div className="xsmall muted">SHOGUN's reflection</div>
          <div style={{fontSize:11, marginTop:4, lineHeight:1.4}}>
            You spent 3.2h on SHOGUN design, had productive calls with Matt & the Toru team, and left the Elevenlabs intro unanswered. Your energy shifted after lunch — worth noting.
          </div>
        </div>
        <div className="row gap8" style={{marginTop:10}}>
          <div className="card outlined" style={{flex:1, padding:8, fontSize:10}}>→ Write a line</div>
          <div className="card outlined" style={{flex:1, padding:8, fontSize:10}}>→ Voice note</div>
          <div className="card outlined" style={{flex:1, padding:8, fontSize:10}}>→ Skip</div>
        </div>
      </div>
    </div>
  );
}

window.DashA = DashA; window.DashB = DashB;
window.MornA = MornA; window.MornB = MornB;
window.EveA = EveA; window.EveB = EveB;
