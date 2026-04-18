/* global Icon, Kamon, React, ScreenHome, ScreenMemory, ScreenChat, ScreenAgents, ScreenWork, ScreenMeetings, ScreenCapture, ScreenIntegrations, ScreenSettings, SettingsModal, ConfirmWriteModal, ShogunIpcClient, ShogunAPI, ShogunActionRegistry */
const { useState, useEffect, useRef } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "language": "en",
  "accentDensity": "standard",
  "dotGrid": false,
  "goldIntensity": "standard"
}/*EDITMODE-END*/;

const NAV = [
  {id:'home',      label:'Home',         jp:'起動',   icon:'dashboard', section:'main'},
  {id:'memory',    label:'Memory',       jp:'記憶',   icon:'memory',    section:'main'},
  {id:'chat',      label:'Chat',         jp:'対話',   icon:'chat',      section:'main'},
  {id:'agents',    label:'Agents',       jp:'家臣',   icon:'agents',    section:'main'},
  {id:'work',      label:'Work',         jp:'任務',   icon:'work',      section:'workspace'},
  {id:'meetings',  label:'Meetings',     jp:'会議',   icon:'calendar',  section:'workspace'},
  {id:'capture',   label:'Capture',      jp:'捕捉',   icon:'capture',   section:'workspace'},
  {id:'integrations', label:'Integrations', jp:'接続', icon:'plug',   section:'workspace'},
  {id:'settings',  label:'Settings',     jp:'設定',   icon:'settings',  section:'workspace'},
];

const INITIAL_CHAT_HISTORY = [
  {id:'c1', title:'Revenue-cat pricing tiers', time:'14:02', when:'TODAY', jp:'今日', favorite:true},
  {id:'c2', title:'Speak · pronunciation angles', time:'10:49', when:'TODAY', jp:'今日', favorite:false},
  {id:'c3', title:'Morning brief summary', time:'07:12', when:'TODAY', jp:'今日', favorite:false},
  {id:'c4', title:'SHOGUN IA draft', time:'', when:'YESTERDAY', jp:'昨日', favorite:true},
  {id:'c5', title:'Matt 1-on-1 prep', time:'', when:'YESTERDAY', jp:'昨日', favorite:false},
  {id:'c6', title:'Rust error handling', time:'', when:'YESTERDAY', jp:'昨日', favorite:false},
];

function ensureRuntimeDeps() {
  if (!window.ShogunIpcClient) {
    window.ShogunIpcClient = {
      createIpcClient: () => ({
        transport: 'mock',
        invoke: async (command, payload) => ({ ok:true, data:{ command, payload, mock:true } }),
      }),
    };
  }
  if (!window.ShogunAPI) {
    window.ShogunAPI = {
      createApi: (client) => ({
        appOpenHummingbird: (input) => client.invoke('app_open_hummingbird', input),
        appCreateShareLink: (input) => client.invoke('app_create_share_link', input),
        settingsLoad: (input) => client.invoke('app_settings_load', input),
        settingsSave: (input) => client.invoke('app_settings_save', input),
        integrationConnect: (input) => client.invoke('app_integration_connect', input),
        integrationToggle: (input) => client.invoke('app_integration_toggle', input),
        capturePause: (input) => client.invoke('app_capture_pause', input),
        captureResume: (input) => client.invoke('app_capture_resume', input),
        permissionsManage: (input) => client.invoke('app_permissions_manage', input),
        diagnosticsReport: (input) => client.invoke('app_diagnostics_report', input),
        accountDeleteData: (input) => client.invoke('app_delete_data_range', input),
        accountDeleteAll: (input) => client.invoke('app_delete_all_data', input),
        accountDeleteSelf: (input) => client.invoke('app_delete_account', input),
        memorySearch: (input) => client.invoke('shogun_memory_search', input),
        memoryIngest: (input) => client.invoke('shogun_memory_ingest', input),
        memoryDelete: (input) => client.invoke('shogun_memory_delete', input),
        briefGet: (input) => client.invoke('shogun_brief_get', input),
        statsGet: (input) => client.invoke('shogun_stats', input),
        draftCreate: (input) => client.invoke('shogun_draft', input),
        scheduleAction: (input) => client.invoke('shogun_schedule_action', input),
      }),
    };
  }
  if (!window.ShogunActionRegistry) {
    window.ShogunActionRegistry = {
      createActionRegistry: (api) => {
        const map = {
          'app.open_hummingbird': api.appOpenHummingbird,
          'app.create_share_link': api.appCreateShareLink,
          'settings.save': api.settingsSave,
          'settings.load': api.settingsLoad,
          'integrations.connect': api.integrationConnect,
          'integrations.toggle': api.integrationToggle,
          'capture.pause': api.capturePause,
          'capture.resume': api.captureResume,
          'permissions.manage': api.permissionsManage,
          'diagnostics.report': api.diagnosticsReport,
          'data.delete_range': api.accountDeleteData,
          'data.delete_all': api.accountDeleteAll,
          'account.delete': api.accountDeleteSelf,
          'memory.search': api.memorySearch,
          'memory.ingest': api.memoryIngest,
          'memory.delete': api.memoryDelete,
          'brief.get': api.briefGet,
          'stats.get': api.statsGet,
          'draft.create': api.draftCreate,
          'schedule.create': api.scheduleAction,
        };
        return {
          run: async (key, payload) => {
            const fn = map[key];
            if (!fn) return { ok:false, error:{ message:`Action not connected: ${key}` } };
            const result = await fn(payload || {});
            return result && result.ok === false ? result : { ok:true, data:result };
          },
        };
      },
    };
  }
}

/** Apply `sections.appearance` from settings JSON to `<html>` (color mode, font size). */
function applySavedAppearance(sections) {
  if (!sections || typeof sections !== 'object') return;
  const a = sections.appearance;
  if (!a || typeof a !== 'object') return;
  const pref = a.colorMode != null ? String(a.colorMode) : '';
  if (pref === 'light' || pref === 'dark' || pref === 'auto') {
    document.documentElement.setAttribute('data-appearance', pref);
    const effective = pref === 'auto'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : pref;
    document.documentElement.setAttribute('data-color-mode', effective);
  }
  if (a.fontSize != null) {
    const fs = String(a.fontSize).toLowerCase();
    if (fs === 'normal' || fs === 'compact' || fs === 'comfortable') {
      document.documentElement.setAttribute('data-font-size', fs);
    }
  } else {
    document.documentElement.removeAttribute('data-font-size');
  }
}

function App() {
  ensureRuntimeDeps();
  const WriteModal = ConfirmWriteModal || function FallbackWriteModal(props) {
    if (!props.open) return null;
    return (
      <>
        <div style={{position:'fixed', inset:0, zIndex:150, background:'rgba(10,9,8,0.55)'}} onClick={props.onCancel}/>
        <div style={{position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', zIndex:151, width:'min(520px,92vw)', background:'var(--surface)', border:'1px solid var(--border-hi)', borderRadius:'var(--radius-lg)', padding:16}}>
          <div style={{fontSize:15, fontWeight:600, marginBottom:4}}>{props.title || 'Confirm action'}</div>
          <div style={{fontSize:12, color:'var(--text-dim)', marginBottom:10}}>{props.description || 'This action may change local state.'}</div>
          <pre style={{maxHeight:180, overflow:'auto', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:10, margin:0, fontSize:11, fontFamily:'var(--font-mono)'}}>{JSON.stringify(props.payload || {}, null, 2)}</pre>
          <div style={{display:'flex', justifyContent:'flex-end', gap:8, marginTop:12}}>
            <button className="btn btn-sm btn-ghost" onClick={props.onCancel}>Cancel</button>
            <button className="btn btn-sm btn-secondary" onClick={props.onConfirm}>{props.pending ? 'Running...' : 'Confirm'}</button>
          </div>
        </div>
      </>
    );
  };
  const [active, setActive] = useState(() => localStorage.getItem('shogun-active') || 'home');
  const [activeChat, setActiveChat] = useState('c1');
  const [chats, setChats] = useState(INITIAL_CHAT_HISTORY);
  const [dragId, setDragId] = useState(null);
  const [dragOver, setDragOver] = useState(null); // {id, pos:'before'|'after'|'fav'|'chats'}
  const [tweaks, setTweaks] = useState(TWEAK_DEFAULTS);
  const [editMode, setEditMode] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareMode, setShareMode] = useState('private');
  const [shareTip, setShareTip] = useState(null); // 'popout' | 'star' | 'share' | null
  const [userOpen, setUserOpen] = useState(false);
  const [userAnchor, setUserAnchor] = useState({left:0, bottom:0, width:220});
  const userBtnRef = React.useRef(null);
  const [settingsOpen, setSettingsOpen] = useState(null); // null | 'general' | 'system' | 'appearance' | 'privacy' | 'data' | 'hummingbird' | 'meetings' | 'chat' | 'integrations' | 'shortcuts' | 'subscription' | 'team' | 'support' | 'api' | 'upgrade' | 'changelog' | 'feedback'
  const [toast, setToast] = useState(null);
  const [writeConfirm, setWriteConfirm] = useState({ open:false, actionKey:null, payload:null, title:null, description:null });
  const [writePending, setWritePending] = useState(false);
  const runtimeRef = useRef(null);
  const toastTimerRef = useRef(null);

  const openUser = () => {
    const r = userBtnRef.current?.getBoundingClientRect();
    if (r) setUserAnchor({left: r.left, bottom: window.innerHeight - r.top + 8, width: r.width});
    setUserOpen(v => !v);
  };

  useEffect(() => { localStorage.setItem('shogun-active', active); }, [active]);
  useEffect(() => () => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
  }, []);

  const pushToast = (message, kind='info') => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToast({ message, kind });
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2200);
  };

  if (!runtimeRef.current && ShogunIpcClient && ShogunAPI && ShogunActionRegistry) {
    const client = ShogunIpcClient.createIpcClient();
    const api = ShogunAPI.createApi(client);
    const registry = ShogunActionRegistry.createActionRegistry(api, {
      onMissing: (key) => pushToast(`Action not connected: ${key}`, 'warn'),
      onExecute: () => {},
    });
    runtimeRef.current = { client, api, registry };
  }

  const executeAction = async (actionKey, payload, options={}) => {
    if (!runtimeRef.current) {
      pushToast('IPC runtime unavailable', 'error');
      return { ok:false };
    }
    const res = await runtimeRef.current.registry.run(actionKey, payload);
    if (res.ok) {
      if (options.successMessage) pushToast(options.successMessage, 'success');
    } else if (!options.silentError) {
      pushToast(res.error?.message || 'Action failed', 'error');
    }
    return res;
  };

  const requestWriteAction = (actionKey, payload, title, description) => {
    setWriteConfirm({ open:true, actionKey, payload, title, description });
  };

  useEffect(() => {
    window.SHOGUN_RUNTIME = {
      executeAction,
      requestWriteAction,
      pushToast,
      getActiveChat: () => chats.find(c => c.id === activeChat) || null,
    };
    return () => { delete window.SHOGUN_RUNTIME; };
  }, [activeChat, chats]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleFav = (id) => setChats(cs => cs.map(c => c.id===id ? {...c, favorite: !c.favorite} : c));
  const onDragStart = (id) => (e) => { setDragId(id); e.dataTransfer.effectAllowed = 'move'; };
  const onDragOverItem = (id) => (e) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientY - rect.top) < rect.height/2 ? 'before' : 'after';
    setDragOver({id, pos});
  };
  const onDragOverBucket = (bucket) => (e) => { e.preventDefault(); setDragOver({id:null, pos:bucket}); };
  const onDrop = () => {
    if (!dragId || !dragOver) { setDragId(null); setDragOver(null); return; }
    setChats(cs => {
      const src = cs.find(c => c.id===dragId);
      if (!src) return cs;
      const rest = cs.filter(c => c.id!==dragId);
      // bucket drop (empty area)
      if (dragOver.id===null) {
        const moved = {...src, favorite: dragOver.pos==='fav'};
        return [...rest, moved];
      }
      // reorder relative to another item — also join that bucket
      const target = rest.find(c => c.id===dragOver.id);
      if (!target) return cs;
      const moved = {...src, favorite: target.favorite};
      const idx = rest.findIndex(c => c.id===dragOver.id);
      const insertAt = dragOver.pos==='before' ? idx : idx+1;
      const out = [...rest];
      out.splice(insertAt, 0, moved);
      return out;
    });
    setDragId(null); setDragOver(null);
  };

  useEffect(() => {
    document.body.classList.toggle('dot-grid', tweaks.dotGrid);
    document.body.setAttribute('data-lang', tweaks.language);
    document.body.setAttribute('data-density', tweaks.accentDensity);
    document.body.setAttribute('data-gold', tweaks.goldIntensity);
  }, [tweaks]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onScheme = () => {
      if (document.documentElement.getAttribute('data-appearance') !== 'auto') return;
      document.documentElement.setAttribute('data-color-mode', mq.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', onScheme);
    return () => mq.removeEventListener('change', onScheme);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await executeAction('settings.load', {}, { silentError: true });
      if (cancelled || !r.ok || !r.data?.settings?.sections) return;
      applySavedAppearance(r.data.settings.sections);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const onAppearance = (e) => {
      const a = e.detail && e.detail.appearance;
      if (!a || typeof a !== 'object') return;
      applySavedAppearance({ appearance: a });
    };
    window.addEventListener('shogun-appearance-changed', onAppearance);
    return () => window.removeEventListener('shogun-appearance-changed', onAppearance);
  }, []);

  const cycleLang = () => {
    const order = ['en','jp','bi'];
    const next = order[(order.indexOf(tweaks.language)+1) % order.length];
    update('language', next);
  };

  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === '__activate_edit_mode') setEditMode(true);
      if (e.data?.type === '__deactivate_edit_mode') setEditMode(false);
    };
    window.addEventListener('message', handler);
    window.parent.postMessage({type:'__edit_mode_available'}, '*');
    return () => window.removeEventListener('message', handler);
  }, []);

  const update = (k,v) => {
    const next = {...tweaks, [k]: v};
    setTweaks(next);
    window.parent.postMessage({type:'__edit_mode_set_keys', edits:{[k]: v}}, '*');
  };

  const sections = [
    {id:'main', label:'Core', jp:'核'},
    {id:'workspace', label:'Workspace', jp:'作業'},
  ];
  const favChats = chats.filter(c => c.favorite);
  const restChats = chats.filter(c => !c.favorite);

  const Screen = {
    home: ScreenHome,
    memory: ScreenMemory,
    chat: ScreenChat,
    agents: ScreenAgents,
    work: ScreenWork,
    meetings: ScreenMeetings,
    capture: ScreenCapture,
    integrations: ScreenIntegrations,
    settings: ScreenSettings,
  }[active] || ScreenHome;

  return (
    <div className="app" data-screen-label={active}>
      {/* Topbar */}
      <div className="topbar">
        <div className="brand" onClick={()=>setActive('home')} style={{cursor:'pointer'}} title="Home · 起動">
          <Kamon size={24} color="var(--text)"/>
          <div>
            <div className="brand-title en-only">SHOGUN</div>
            <div className="brand-jp jp">将軍</div>
          </div>
        </div>
        <div className="cmdk">
          <Icon name="search" size={14}/>
          <span>Ask your memory or run a command…</span>
          <span className="kbd">⌘K</span>
        </div>
        <div className="right">
          {/* 3 page actions: Hummingbird · favorite · share */}
          <div className="page-actions">
            <button
              className="page-action"
              onMouseEnter={()=>setShareTip('popout')}
              onMouseLeave={()=>setShareTip(null)}
              onClick={() => requestWriteAction(
                'app.open_hummingbird',
                { source:'topbar', activeScreen:active },
                'Open Hummingbird',
                'This triggers a native app-level action.'
              )}
            >
              <Icon name="popout" size={15}/>
              {shareTip==='popout' && <span className="tip">Open in Hummingbird</span>}
            </button>
            <button className={'page-action'+(favorited?' on':'')} onMouseEnter={()=>setShareTip('star')} onMouseLeave={()=>setShareTip(null)} onClick={()=>setFavorited(v=>!v)}>
              <Icon name="star" size={15}/>
              {shareTip==='star' && <span className="tip">{favorited?'Unfavorite':'Favorite chat'}</span>}
            </button>
            <button className={'page-action'+(shareOpen?' active':'')} onMouseEnter={()=>setShareTip('share')} onMouseLeave={()=>setShareTip(null)} onClick={()=>setShareOpen(v=>!v)}>
              <Icon name="upload" size={15}/>
              {shareTip==='share' && !shareOpen && <span className="tip">Share chat</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="sidebar" data-screen-label="sidebar">
        {sections.map(sec => (
          <div key={sec.id}>
            <div className="section-label"><span className="en-only">{sec.label}</span><span className="en-only"> · </span><span className="jp">{sec.jp}</span></div>
            {NAV.filter(n => n.section === sec.id).map(n => (
              <React.Fragment key={n.id}>
                <div className={'nav-item '+(active===n.id?'active':'')} onClick={() => setActive(n.id)}>
                  <Icon name={n.icon} size={16}/>
                  <span className="nav-label en-only">{n.label}</span>
                  {n.star && <span className="gold" style={{fontSize:8, marginLeft:-4}}>★</span>}
                  <span className="jp">{n.jp}</span>
                  {n.count && <span className="count">{n.count}</span>}
                </div>
                {/* Chat history sub-nav */}
                {n.id==='chat' && active==='chat' && (
                  <div className="chat-subnav">
                    <button
                      className="btn btn-sm btn-secondary"
                      style={{width:'calc(100% - 14px)', margin:'6px 7px 10px', justifyContent:'flex-start'}}
                      onClick={() => {
                        const id = `c${Date.now()}`;
                        const item = { id, title:'New conversation', time:'', when:'TODAY', jp:'今日', favorite:false };
                        setChats(prev => [item, ...prev]);
                        setActiveChat(id);
                        setActive('chat');
                        pushToast('New conversation created', 'success');
                      }}
                    ><Icon name="plus" size={12}/>New conversation</button>

                    {/* Favorites bucket */}
                    <div
                      className={'chat-bucket '+(dragOver?.pos==='fav'?'drop':'')}
                      onDragOver={onDragOverBucket('fav')}
                      onDrop={onDrop}
                    >
                      <div className="chat-subgroup t-mono">
                        <span className="gold" style={{fontSize:9, marginRight:4}}>★</span>
                        <span className="en-only">FAVORITES</span>
                        <span className="jp" style={{marginLeft:6}}>お気に入り</span>
                        <span className="spacer"/>
                        <span style={{fontSize:9, color:'var(--text-dim)'}}>{favChats.length}</span>
                      </div>
                      {favChats.length===0 && (
                        <div className="chat-empty">
                          <span className="en-only">Drop a chat here</span>
                          <span className="jp">ここへ</span>
                        </div>
                      )}
                      {favChats.map(it => (
                        <div
                          key={it.id}
                          draggable
                          onDragStart={onDragStart(it.id)}
                          onDragOver={onDragOverItem(it.id)}
                          onDrop={onDrop}
                          className={'chat-sub-item '+(activeChat===it.id?'active':'')+(dragId===it.id?' dragging':'')+(dragOver?.id===it.id?(' dz-'+dragOver.pos):'')}
                          onClick={()=>setActiveChat(it.id)}
                          title={it.title}
                        >
                          <Icon name="grip" size={10} className="grip"/>
                          <span className="gold dot-fav">★</span>
                          <span className="chat-sub-title">{it.title}</span>
                          <button className="chat-fav-btn" onClick={(e)=>{e.stopPropagation(); toggleFav(it.id);}} title="Unfavorite">★</button>
                        </div>
                      ))}
                    </div>

                    {/* All chats bucket */}
                    <div
                      className={'chat-bucket '+(dragOver?.pos==='chats'?'drop':'')}
                      onDragOver={onDragOverBucket('chats')}
                      onDrop={onDrop}
                    >
                      <div className="chat-subgroup t-mono">
                        <span className="en-only">CHATS</span>
                        <span className="jp" style={{marginLeft:6}}>対話</span>
                        <span className="spacer"/>
                        <span style={{fontSize:9, color:'var(--text-dim)'}}>{restChats.length}</span>
                      </div>
                      {restChats.map(it => (
                        <div
                          key={it.id}
                          draggable
                          onDragStart={onDragStart(it.id)}
                          onDragOver={onDragOverItem(it.id)}
                          onDrop={onDrop}
                          className={'chat-sub-item '+(activeChat===it.id?'active':'')+(dragId===it.id?' dragging':'')+(dragOver?.id===it.id?(' dz-'+dragOver.pos):'')}
                          onClick={()=>setActiveChat(it.id)}
                          title={it.title}
                        >
                          <Icon name="grip" size={10} className="grip"/>
                          <span className="dot"/>
                          <span className="chat-sub-title">{it.title}</span>
                          {it.time && <span className="t-mono chat-sub-time">{it.time}</span>}
                          <button className="chat-fav-btn fav-hover" onClick={(e)=>{e.stopPropagation(); toggleFav(it.id);}} title="Favorite">☆</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        ))}

        {/* System section removed — items live under Workspace */}
        <div className="spacer" style={{flex:1}}/>

        {/* User cluster — capturing / avatar */}
        <div className="user-cluster">
          <div className="user-row">
            <span className="capturing-pill"><span className="pulse"/><span className="en-only">CAPTURING</span><span className="jp" style={{marginLeft:4}}>記録中</span></span>
          </div>
          <div ref={userBtnRef} className="user-row user-pill" onClick={openUser}>
            <div className="avatar" style={{width:26, height:26, fontSize:11}}>K</div>
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontSize:12, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>Kazu Tano</div>
              <div className="t-mono" style={{fontSize:9, color:'var(--text-dim)'}}>LOCAL · PRO</div>
            </div>
            <Icon name={userOpen?'chevronDown':'chevronRight'} size={11} className="dim"/>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="content">
        <Screen/>
      </div>

      {/* Share modal — anchored to upload button in topbar */}
      {shareOpen && (
        <>
          <div style={{position:'fixed', inset:0, zIndex:80}} onClick={()=>setShareOpen(false)}/>
          <div className="share-modal">
            <div style={{fontSize:18, fontWeight:600, marginBottom:4}}>
              <span className="en-only">Share chat</span>
              <span className="jp" style={{marginLeft:8, fontSize:14, color:'var(--text-mute)'}}>共有</span>
            </div>
            <div style={{fontSize:13, color:'var(--text-mute)', marginBottom:18}}>Only messages up until now will be shared</div>
            <div className="share-choices">
              <div className={'share-choice '+(shareMode==='private'?'on':'')} onClick={()=>setShareMode('private')}>
                <Icon name="lock" size={18} className={shareMode==='private'?'gold':'dim'}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:14, fontWeight:500}}>
                    Private
                    <span className="jp" style={{marginLeft:8, fontSize:11, color:'var(--text-dim)'}}>非公開</span>
                  </div>
                  <div style={{fontSize:12, color:'var(--text-mute)', marginTop:2}}>Only you have access</div>
                </div>
                {shareMode==='private' && <Icon name="check" size={16} className="gold"/>}
              </div>
              <div className={'share-choice '+(shareMode==='public'?'on':'')} onClick={()=>setShareMode('public')}>
                <Icon name="globe" size={18} className={shareMode==='public'?'gold':'dim'}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:14, fontWeight:500}}>
                    Public access
                    <span className="jp" style={{marginLeft:8, fontSize:11, color:'var(--text-dim)'}}>公開</span>
                  </div>
                  <div style={{fontSize:12, color:'var(--text-mute)', marginTop:2}}>Anyone with the link can view</div>
                </div>
                {shareMode==='public' && <Icon name="check" size={16} className="gold"/>}
              </div>
            </div>
            <button
              className="btn"
              style={{width:'100%', marginTop:18, background:'var(--gold-bg, #EFE5D3)', color:'#151212', borderColor:'var(--gold-dim)', height:44, fontSize:14}}
              onClick={async () => {
                const res = await executeAction('app.create_share_link', {
                  mode: shareMode,
                  chatId: activeChat,
                  title: chats.find(c => c.id === activeChat)?.title || 'Untitled chat',
                }, { successMessage:'Share link prepared' });
                if (res.ok) setShareOpen(false);
              }}
            >
              <Icon name="link" size={14}/> Create share link
            </button>
          </div>
        </>
      )}

      {/* User floating menu — slides up above the user button, sized to sidebar */}
      {userOpen && (
        <>
          <div style={{position:'fixed', inset:0, zIndex:80}} onClick={()=>setUserOpen(false)}/>
          <div className="user-float" style={{left: userAnchor.left, bottom: userAnchor.bottom, width: userAnchor.width}}>
            <div className="user-float-head">
              <div style={{fontSize:12, color:'var(--text-dim)'}}>kazu@shogun.local</div>
            </div>
            <div className="user-float-section">
              <div className="user-float-row" onClick={()=>{setSettingsOpen('general'); setUserOpen(false);}}>
                <Icon name="settings" size={13}/><span className="en-only">Settings</span><span className="jp">設定</span>
                <span className="spacer"/><span className="kbd-mini">⌘,</span>
              </div>
              <div className="user-float-row" onClick={()=>{setSettingsOpen('subscription'); setUserOpen(false);}}>
                <Icon name="arrowUpRight" size={13}/><span className="en-only">Upgrade Plan</span><span className="jp">昇格</span>
              </div>
              <div className="user-float-row" onClick={()=>{setSettingsOpen('download'); setUserOpen(false);}}>
                <Icon name="download" size={13}/><span className="en-only">Download Mobile App</span><span className="jp">携帯</span>
              </div>
            </div>
            <div className="user-float-section" style={{borderTop:'1px solid var(--border)'}}>
              <div className="user-float-row" onClick={()=>{setSettingsOpen('feedback'); setUserOpen(false);}}>
                <Icon name="chat" size={13}/><span className="en-only">Give Feedback</span><span className="jp">意見</span>
              </div>
              <div className="user-float-row" onClick={()=>{setSettingsOpen('support'); setUserOpen(false);}}>
                <Icon name="info" size={13}/><span className="en-only">Help Center</span><span className="jp">案内</span>
              </div>
              <div className="user-float-row" onClick={()=>{setSettingsOpen('changelog'); setUserOpen(false);}}>
                <Icon name="clock" size={13}/><span className="en-only">Changelog</span><span className="jp">更新</span>
              </div>
              <div className="user-float-row gold" onClick={()=>{setSettingsOpen('referral'); setUserOpen(false);}}>
                <Icon name="gift" size={13}/><span className="en-only">Get 2 Months Free</span><span className="jp">贈</span>
              </div>
            </div>
            <div className="user-float-section" style={{borderTop:'1px solid var(--border)'}}>
              <div className="user-float-row" style={{color:'var(--text-mute)'}}>
                <Icon name="logout" size={13}/><span className="en-only">Logout</span><span className="jp">退出</span>
              </div>
            </div>
            {/* Profile chip at bottom, like reference */}
            <div className="user-float-profile">
              <div className="avatar">T</div>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontSize:12, fontWeight:500}}>Toru Tano</div>
                <div style={{fontSize:10, color:'var(--text-dim)'}}>Pro · Local</div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Settings modal — floating with semi-transparent backdrop */}
      {settingsOpen && (
        <SettingsModal
          pane={settingsOpen}
          setPane={setSettingsOpen}
          close={() => {
            setSettingsOpen(null);
            (async () => {
              const r = await executeAction('settings.load', {}, { silentError: true });
              if (r.ok && r.data?.settings?.sections) applySavedAppearance(r.data.settings.sections);
            })();
          }}
        />
      )}

      <WriteModal
        open={writeConfirm.open}
        title={writeConfirm.title}
        description={writeConfirm.description}
        actionName={writeConfirm.actionKey}
        payload={writeConfirm.payload}
        pending={writePending}
        onCancel={() => setWriteConfirm({ open:false, actionKey:null, payload:null, title:null, description:null })}
        onConfirm={async () => {
          if (!writeConfirm.actionKey) return;
          const actionKey = writeConfirm.actionKey;
          const payload = writeConfirm.payload;
          setWritePending(true);
          const res = await executeAction(actionKey, payload, { successMessage:'Action completed' });
          setWritePending(false);
          setWriteConfirm({ open:false, actionKey:null, payload:null, title:null, description:null });
          if (actionKey === 'memory.delete' && res && res.ok) {
            window.dispatchEvent(new CustomEvent('shogun-memory-index-changed'));
          }
        }}
      />

      {toast && (
        <div className={'app-toast '+toast.kind}>{toast.message}</div>
      )}

      {/* System floating menu removed */}

      {/* Tweaks */}
      <div id="tweaks-panel" className={editMode?'show':''}>
        <h6>TWEAKS · 調整 <Kamon size={12} color="var(--gold)"/></h6>
        <div className="tweak-row">
          <label>Language</label>
          <select value={tweaks.language} onChange={e=>update('language', e.target.value)}>
            <option value="en">English</option>
            <option value="jp">日本語</option>
            <option value="bi">Bilingual</option>
          </select>
        </div>
        <div className="tweak-row">
          <label>Accent density</label>
          <select value={tweaks.accentDensity} onChange={e=>update('accentDensity', e.target.value)}>
            <option value="minimal">Minimal</option>
            <option value="standard">Standard</option>
            <option value="rich">Rich</option>
          </select>
        </div>
        <div className="tweak-row">
          <label>Gold intensity</label>
          <select value={tweaks.goldIntensity} onChange={e=>update('goldIntensity', e.target.value)}>
            <option value="muted">Muted</option>
            <option value="standard">Standard</option>
            <option value="bright">Bright</option>
          </select>
        </div>
        <div className="tweak-row">
          <label>Dot-grid background</label>
          <div className={'switch '+(tweaks.dotGrid?'on':'')} onClick={()=>update('dotGrid', !tweaks.dotGrid)}/>
        </div>
      </div>

      <style>{`
        /* EN only: hide all JP flourishes */
        body[data-lang=en] .jp, body[data-lang=en] .brand-jp { display:none !important; }
        /* JP only: hide EN-marked elements, keep JP */
        body[data-lang=jp] .en-only { display:none !important; }
        body[data-gold=muted] { --gold:#A88F5F; --gold-hover:#B89C6A; }
        body[data-gold=bright] { --gold:#D9BC7F; --gold-hover:#E5C88C; }
        body[data-density=minimal] .sidebar .nav-item .nav-label { display:none; }
        body[data-density=rich] .nav-item { padding:10px 12px; }
        .lang-pill { min-width:44px; font-family:var(--font-mono); font-size:11px; letter-spacing:0.08em; padding:0 10px; }

        /* Chat sub-nav under Chat */
        .chat-subnav { margin:2px 0 8px 8px; padding-left:10px; border-left:1px solid var(--border); }
        .chat-subgroup { padding:10px 0 4px 8px; font-size:9px; display:flex; align-items:center; }
        .chat-bucket { border-radius:var(--radius-sm); padding:2px 0 6px; transition:background 120ms; }
        .chat-bucket.drop { background:color-mix(in srgb, var(--gold) 8%, transparent); outline:1px dashed var(--gold-dim); }
        .chat-empty { padding:10px 10px; font-size:11px; color:var(--text-dim); font-style:italic; }
        .chat-empty .jp { margin-left:6px; font-size:10px; }
        .chat-sub-item { position:relative; }
        .chat-sub-item .grip { opacity:0; color:var(--text-dim); cursor:grab; margin-right:-2px; transition:opacity 120ms; }
        .chat-sub-item:hover .grip { opacity:0.5; }
        .chat-sub-item.dragging { opacity:0.4; }
        .chat-sub-item .dot-fav { font-size:8px; }
        .chat-sub-item.dz-before::before, .chat-sub-item.dz-after::after {
          content:''; position:absolute; left:6px; right:6px; height:2px;
          background:var(--gold); border-radius:1px;
        }
        .chat-sub-item.dz-before::before { top:-1px; }
        .chat-sub-item.dz-after::after { bottom:-1px; }
        .chat-fav-btn {
          background:transparent; border:0; color:var(--text-dim); cursor:pointer;
          font-size:11px; padding:2px 4px; border-radius:3px; flex-shrink:0;
          transition:color 120ms, opacity 120ms;
        }
        .chat-fav-btn.fav-hover { opacity:0; }
        .chat-sub-item:hover .chat-fav-btn.fav-hover { opacity:1; }
        .chat-fav-btn:hover { color:var(--gold); background:var(--surface-2); }
        .chat-sub-item { display:flex; align-items:center; gap:8px; padding:6px 8px; margin:1px 0; border-radius:var(--radius-sm); cursor:pointer; color:var(--text-mute); font-size:12px; }
        .chat-sub-item:hover { background:var(--surface-2); color:var(--text); }
        .chat-sub-item.active { background:var(--surface-2); color:var(--text); }
        .chat-sub-item.active .dot { background:var(--gold); box-shadow:0 0 0 2px color-mix(in srgb, var(--gold) 25%, transparent); }
        .chat-sub-item .dot { width:5px; height:5px; border-radius:50%; background:var(--border-hi); flex-shrink:0; }
        .chat-sub-title { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; min-width:0; }
        .chat-sub-time { font-size:9px; color:var(--text-dim); flex-shrink:0; }

        /* Floating system menu */
        .system-float {
          position:fixed;
          width:240px;
          background:var(--surface); border:1px solid var(--border-hi);
          border-radius:var(--radius-md);
          box-shadow:0 18px 40px -8px rgba(0,0,0,0.6), 0 2px 6px rgba(0,0,0,0.3);
          padding:4px 0 4px;
          animation: sysFloatIn 140ms var(--ease-out);
        }
        @keyframes sysFloatIn {
          from { opacity:0; transform: translateX(-4px) translateY(2px); }
          to { opacity:1; transform: translateX(0) translateY(0); }
        }

        /* Topbar page actions */
        .page-actions { display:flex; align-items:center; gap:4px; padding:4px; background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-md); }
        .page-action {
          position:relative; width:30px; height:28px;
          display:flex; align-items:center; justify-content:center;
          background:transparent; border:0; color:var(--text-mute); cursor:pointer;
          border-radius:var(--radius-sm); transition:all 120ms;
        }
        .page-action:hover { background:var(--surface-2); color:var(--text); }
        .page-action.on, .page-action.active { color:var(--gold); background:var(--surface-2); }
        .page-action .tip {
          position:absolute; top:calc(100% + 8px); right:0;
          background:var(--surface); border:1px solid var(--border-hi);
          border-radius:var(--radius-sm); padding:5px 10px;
          font-size:11px; color:var(--text); white-space:nowrap;
          box-shadow:0 6px 16px rgba(0,0,0,0.4); z-index:60;
          pointer-events:none;
        }

        /* User cluster (bottom-left sidebar) */
        .user-cluster { padding:10px; border-top:1px solid var(--border); margin-top:8px; }
        .user-row { display:flex; align-items:center; gap:6px; padding:2px 0; }
        .user-row + .user-row { margin-top:8px; }
        .capturing-pill {
          display:inline-flex; align-items:center; gap:6px;
          font-family:var(--font-mono); font-size:9px; letter-spacing:0.12em;
          color:var(--text-mute); padding:3px 8px;
          border:1px solid var(--border); border-radius:999px;
          background:var(--surface);
        }
        .mini-btn {
          width:26px; height:26px; min-width:26px;
          display:flex; align-items:center; justify-content:center;
          background:var(--surface); border:1px solid var(--border);
          border-radius:var(--radius-sm); cursor:pointer;
          color:var(--text-mute); font-family:var(--font-mono); font-size:10px; letter-spacing:0.05em;
          padding:0 6px;
        }
        .mini-btn:hover { color:var(--text); border-color:var(--border-hi); background:var(--surface-2); }
        .user-pill {
          padding:8px 10px; background:var(--surface); border:1px solid var(--border);
          border-radius:var(--radius-md); cursor:pointer; transition:all 120ms;
        }
        .user-pill:hover { border-color:var(--border-hi); background:var(--surface-2); }

        /* User floating menu */
        .user-float {
          position:fixed; z-index:90;
          background:var(--surface); border:1px solid var(--border-hi);
          border-radius:var(--radius-lg);
          box-shadow:0 24px 48px -12px rgba(0,0,0,0.6), 0 2px 0 rgba(0,0,0,0.3);
          padding:4px 0;
          overflow:hidden;
          min-width:220px;
        }
        @keyframes userFloatIn {
          from { opacity:0; transform:translateY(8px) scale(0.98); }
          to { opacity:1; transform:translateY(0) scale(1); }
        }
        .user-float-head { padding:10px 12px 8px; border-bottom:1px solid var(--border); }
        .user-float-section { padding:4px 4px; }
        .user-float-row {
          display:flex; align-items:center; gap:10px;
          padding:7px 10px; border-radius:var(--radius-sm);
          color:var(--text); font-size:12.5px; cursor:pointer;
        }
        .user-float-row:hover { background:var(--surface-2); }
        .user-float-row.gold { color:var(--gold); }
        .user-float-row .jp { font-family:var(--font-jp); font-weight:300; font-size:10.5px; color:var(--text-dim); margin-left:-4px; }
        .user-float-row .kbd-mini {
          font-family:var(--font-mono); font-size:10px;
          color:var(--text-dim); letter-spacing:0.05em;
        }
        .user-float-profile {
          display:flex; align-items:center; gap:10px;
          padding:10px 12px; border-top:1px solid var(--border);
          background:var(--bg);
        }
        .user-float-profile .avatar {
          width:26px; height:26px; border-radius:50%;
          background:var(--surface-2); border:1px solid var(--border);
          display:flex; align-items:center; justify-content:center;
          font-size:11px; font-weight:500; color:var(--text);
        }
        /* Share modal */
        .share-modal {
          position:fixed; top:56px; right:16px;
          width:440px; z-index:90;
          background:var(--surface); border:1px solid var(--border-hi);
          border-radius:var(--radius-lg);
          box-shadow:0 30px 70px -12px rgba(0,0,0,0.7), 0 4px 12px rgba(0,0,0,0.4);
          padding:20px 22px;
          animation: sysFloatIn 160ms var(--ease-out);
        }
        .share-choices {
          border:1px solid var(--border); border-radius:var(--radius-md);
          overflow:hidden;
        }
        .share-choice {
          display:flex; align-items:center; gap:14px;
          padding:16px 18px; cursor:pointer;
          transition:background 120ms;
        }
        .share-choice + .share-choice { border-top:1px solid var(--border); }
        .share-choice:hover { background:var(--surface-2); }
        .share-choice.on { background:color-mix(in srgb, var(--gold) 6%, var(--surface)); }
        .app-toast {
          position:fixed; right:16px; bottom:16px; z-index:180;
          padding:10px 12px; border-radius:var(--radius-sm);
          border:1px solid var(--border-hi); background:var(--surface);
          color:var(--text); font-size:12px; box-shadow:0 10px 24px rgba(0,0,0,0.4);
        }
        .app-toast.success { border-color:color-mix(in srgb, var(--success) 40%, var(--border)); }
        .app-toast.warn { border-color:color-mix(in srgb, #d9a85a 45%, var(--border)); }
        .app-toast.error { border-color:color-mix(in srgb, #d96b5a 45%, var(--border)); }
      `}</style>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
