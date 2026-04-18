import { useEffect, useState, useRef } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { Icon, Kamon } from "./components/Icon";
import { SpotlightSearch } from "./components/SpotlightSearch";
import { SettingsModal } from "./components/SettingsModal";
import { api } from "./lib/tauri";
import { LangContext, type Lang } from "./lib/i18n";

type NavItem = { id: string; label: string; jp: string; icon: string; section: "main" | "workspace" | "system"; star?: boolean; count?: string };

const NAV: NavItem[] = [
  { id: "home",         label: "Home",         jp: "起動", icon: "dashboard", section: "main" },
  { id: "memory",       label: "Memory",       jp: "記憶", icon: "memory",    section: "main", star: true },
  { id: "chat",         label: "Chat",         jp: "対話", icon: "chat",      section: "main" },
  { id: "agents",       label: "Agents",       jp: "家臣", icon: "agents",    section: "main", star: true },
  { id: "work",         label: "Work",         jp: "任務", icon: "work",      section: "workspace" },
  { id: "meetings",     label: "Meetings",     jp: "会議", icon: "calendar",  section: "workspace" },
  { id: "capture",      label: "Capture",      jp: "捕捉", icon: "capture",   section: "system" },
  { id: "integrations", label: "Integrations", jp: "接続", icon: "plug",      section: "system" },
  { id: "settings",     label: "Settings",     jp: "設定", icon: "settings",  section: "system" },
];

const ROUTES: Record<string, string> = {
  home: "/",
  memory: "/timeline",
  chat: "/chat",
  agents: "/pipes",
  work: "/work",
  meetings: "/meetings",
  capture: "/capture",
  integrations: "/integrations",
  settings: "/settings",
};

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [ready, setReady] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  const [systemOpen, setSystemOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState<string | null>(null);
  const [favorited, setFavorited] = useState(false);
  const [captureActive, setCaptureActive] = useState(true);
  const [stats, setStats] = useState<{ total_pages?: number }>({});
  const [chatHistory, setChatHistory] = useState<Array<{ id: string; title: string; updated_at: string }>>([]);
  const sysBtnRef = useRef<HTMLDivElement>(null);
  const userBtnRef = useRef<HTMLDivElement>(null);
  const [sysAnchor, setSysAnchor] = useState({ left: 0, bottom: 0 });
  const [userAnchor, setUserAnchor] = useState({ left: 0, bottom: 0, width: 220 });

  useEffect(() => {
    api.loadSettings().then((s) => {
      if (!s.onboarding_completed) navigate("/onboarding", { replace: true });
      setLang((s.language as Lang) || "en");
      setReady(true);
    }).catch(() => setReady(true));
    api.getBrainStats().then(setStats).catch(() => {});
    api.getCaptureStatus().then((s) => setCaptureActive(s.active)).catch(() => {});
    api.listConversations().then((c) => setChatHistory(c.slice(0, 8))).catch(() => {});
  }, [navigate]);

  useEffect(() => {
    api.loadSettings().then((s) => setLang((s.language as Lang) || "en")).catch(() => {});
  }, [location.pathname]);

  // Global shortcut: Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSpotlightOpen((p) => !p); }
      if (e.key === "Escape") setSpotlightOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Apply language attribute
  useEffect(() => {
    document.body.setAttribute("data-lang", lang);
  }, [lang]);

  const getActiveId = () => {
    const path = location.pathname;
    if (path === "/") return "home";
    if (path.startsWith("/timeline")) return "memory";
    if (path.startsWith("/chat")) return "chat";
    if (path.startsWith("/pipes")) return "agents";
    if (path.startsWith("/search")) return "work";
    if (path.startsWith("/integrations")) return "integrations";
    if (path.startsWith("/settings")) return "settings";
    return "home";
  };
  const activeId = getActiveId();

  const openSystem = () => {
    const r = sysBtnRef.current?.getBoundingClientRect();
    if (r) setSysAnchor({ left: r.right + 8, bottom: window.innerHeight - r.bottom });
    setSystemOpen((v) => !v);
  };

  const openUser = () => {
    const r = userBtnRef.current?.getBoundingClientRect();
    if (r) setUserAnchor({ left: r.left, bottom: window.innerHeight - r.top + 8, width: r.width });
    setUserOpen((v) => !v);
  };

  if (!ready) return <div style={{ height: "100vh", background: "var(--bg)" }} />;

  const sections: { id: "main" | "workspace"; label: string; jp: string }[] = [
    { id: "main",      label: "Core",      jp: "核" },
    { id: "workspace", label: "Workspace", jp: "作業" },
  ];
  const systemItems = NAV.filter((n) => n.section === "system");
  const count = (id: string): string | undefined => {
    if (id === "memory" && stats.total_pages) return stats.total_pages.toLocaleString();
    if (id === "integrations") return "8/20";
    return undefined;
  };

  return (
    <LangContext.Provider value={lang}>
      <div className="app" data-screen-label={activeId}>
        <SpotlightSearch open={spotlightOpen} onClose={() => setSpotlightOpen(false)} />

        {/* Topbar */}
        <div className="topbar">
          <NavLink to="/" className="brand" style={{ textDecoration: "none", color: "inherit" }}>
            <Kamon size={24} color="var(--text)" />
            <div>
              <div className="brand-title en-only">SHOGUN</div>
              <div className="brand-jp jp">将軍</div>
            </div>
          </NavLink>
          <button className="cmdk" onClick={() => setSpotlightOpen(true)}>
            <Icon name="search" size={14} />
            <span>Ask your memory or run a command…</span>
            <span className="kbd">⌘K</span>
          </button>
          <div className="right">
            <div className="page-actions">
              <button className="page-action" title="Open in Hummingbird">
                <Icon name="popout" size={15} />
              </button>
              <button className={"page-action" + (favorited ? " on" : "")} title="Favorite" onClick={() => setFavorited((v) => !v)}>
                <Icon name="star" size={15} />
              </button>
              <button className="page-action" title="Share">
                <Icon name="upload" size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="sidebar">
          {sections.map((sec) => (
            <div key={sec.id}>
              <div className="section-label">
                <span className="en-only">{sec.label}</span>
                <span className="en-only"> · </span>
                <span className="jp">{sec.jp}</span>
              </div>
              {NAV.filter((n) => n.section === sec.id).map((n) => (
                <div key={n.id}>
                  <div
                    className={"nav-item " + (activeId === n.id ? "active" : "")}
                    onClick={() => navigate(ROUTES[n.id] || "/")}
                  >
                    <Icon name={n.icon} size={16} />
                    <span className="nav-label en-only">{n.label}</span>
                    {n.star && <span className="gold" style={{ fontSize: 8, marginLeft: -4 }}>★</span>}
                    <span className="jp">{n.jp}</span>
                    {count(n.id) && <span className="count">{count(n.id)}</span>}
                  </div>
                  {n.id === "chat" && activeId === "chat" && (
                    <div className="chat-subnav">
                      <button
                        className="btn btn-sm btn-secondary"
                        style={{ width: "calc(100% - 14px)", margin: "6px 7px 10px", justifyContent: "flex-start" }}
                        onClick={() => navigate("/chat")}
                      >
                        <Icon name="plus" size={12} />New conversation
                      </button>
                      {chatHistory.length > 0 && (
                        <>
                          <div className="chat-subgroup t-mono">
                            <span className="en-only">RECENT</span>
                            <span className="jp" style={{ marginLeft: 6 }}>最近</span>
                          </div>
                          {chatHistory.map((c) => (
                            <div key={c.id} className="chat-sub-item" title={c.title}>
                              <span className="dot" />
                              <span className="chat-sub-title">{c.title}</span>
                              <span className="t-mono chat-sub-time">
                                {new Date(c.updated_at).toTimeString().slice(0, 5)}
                              </span>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}

          {/* System button */}
          <div style={{ marginTop: 12 }}>
            <div
              ref={sysBtnRef}
              className={"nav-item " + (systemItems.some((s) => s.id === activeId) ? "active" : "")}
              onClick={openSystem}
            >
              <Icon name="settings" size={16} />
              <span className="nav-label en-only">System</span>
              <span className="jp">系統</span>
              <span className="count">
                <Icon name={systemOpen ? "chevronDown" : "chevronRight"} size={10} />
              </span>
            </div>
          </div>
          <div style={{ flex: 1 }} />

          {/* User cluster */}
          <div className="user-cluster">
            <div className="user-row">
              <span
                className="capturing-pill"
                style={{ cursor: "pointer" }}
                onClick={async () => {
                  try {
                    if (captureActive) {
                      await api.pauseCapture();
                      setCaptureActive(false);
                    } else {
                      await api.resumeCapture();
                      setCaptureActive(true);
                    }
                  } catch {}
                }}
              >
                {captureActive ? (
                  <>
                    <span className="pulse" />
                    <span className="en-only">CAPTURING</span>
                    <span className="jp" style={{ marginLeft: 4 }}>記録中</span>
                  </>
                ) : (
                  <>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--text-dim)" }} />
                    <span className="en-only" style={{ color: "var(--text-dim)" }}>PAUSED</span>
                    <span className="jp" style={{ marginLeft: 4, color: "var(--text-dim)" }}>停止中</span>
                  </>
                )}
              </span>
            </div>
            <div ref={userBtnRef} className="user-row user-pill" onClick={openUser}>
              <div className="avatar" style={{ width: 26, height: 26, fontSize: 11 }}>K</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  Kazu Tano
                </div>
                <div className="t-mono" style={{ fontSize: 9, color: "var(--text-dim)" }}>LOCAL · PRO</div>
              </div>
              <Icon name={userOpen ? "chevronDown" : "chevronRight"} size={11} className="dim" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="content">
          <Outlet />
        </div>

        {/* System floating menu */}
        {systemOpen && (
          <>
            <div style={{ position: "fixed", inset: 0, zIndex: 80 }} onClick={() => setSystemOpen(false)} />
            <div className="system-float" style={{ left: sysAnchor.left, bottom: sysAnchor.bottom, zIndex: 90 }}>
              <div className="t-mono" style={{ padding: "12px 14px 8px", color: "var(--text-dim)", borderBottom: "1px solid var(--border)", marginBottom: 4 }}>
                <span className="en-only">SYSTEM</span>
                <span className="en-only" style={{ margin: "0 6px" }}>·</span>
                <span className="jp">系統</span>
              </div>
              {systemItems.map((n) => (
                <div
                  key={n.id}
                  className={"nav-item " + (activeId === n.id ? "active" : "")}
                  onClick={() => { navigate(ROUTES[n.id] || "/"); setSystemOpen(false); }}
                  style={{ margin: "0 6px" }}
                >
                  <Icon name={n.icon} size={16} />
                  <span className="nav-label en-only">{n.label}</span>
                  <span className="jp">{n.jp}</span>
                </div>
              ))}
              <div style={{ borderTop: "1px solid var(--border)", padding: "10px 14px", display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                <Kamon size={12} color="var(--gold)" />
                <span className="t-mono" style={{ fontSize: 10, color: "var(--text-dim)" }}>v0.4.1 · LOCAL</span>
              </div>
            </div>
          </>
        )}

        {/* User floating menu */}
        {userOpen && (
          <>
            <div style={{ position: "fixed", inset: 0, zIndex: 80 }} onClick={() => setUserOpen(false)} />
            <div className="user-float" style={{ left: userAnchor.left, bottom: userAnchor.bottom, width: userAnchor.width, zIndex: 90 }}>
              <div className="user-float-head">
                <div style={{ fontSize: 12, color: "var(--text-dim)" }}>kazu@shogun.local</div>
              </div>
              <div className="user-float-section">
                <div className="user-float-row" onClick={() => { setSettingsOpen("general"); setUserOpen(false); }}>
                  <Icon name="settings" size={13} /><span className="en-only">Settings</span><span className="jp">設定</span>
                  <span style={{ flex: 1 }} />
                  <span className="kbd-mini">⌘,</span>
                </div>
                <div className="user-float-row" onClick={() => { navigate("/integrations"); setUserOpen(false); }}>
                  <Icon name="plug" size={13} /><span className="en-only">Integrations</span><span className="jp">接続</span>
                </div>
                <div className="user-float-row" onClick={async () => {
                  try { await api.exportBrain(); } catch {}
                  setUserOpen(false);
                }}>
                  <Icon name="download" size={13} /><span className="en-only">Export Data</span><span className="jp">書出</span>
                </div>
              </div>
              <div className="user-float-section" style={{ borderTop: "1px solid var(--border)" }}>
                <div className="user-float-row gold" onClick={() => { navigate("/chat"); setUserOpen(false); }}>
                  <Icon name="chat" size={13} /><span className="en-only">Ask Memory</span><span className="jp">対話</span>
                </div>
              </div>
              <div className="user-float-section" style={{ borderTop: "1px solid var(--border)" }}>
                <div className="user-float-row" style={{ color: "var(--text-mute)" }} onClick={() => {
                  navigate("/onboarding");
                  setUserOpen(false);
                }}>
                  <Icon name="logout" size={13} /><span className="en-only">Reset Onboarding</span><span className="jp">再設定</span>
                </div>
              </div>
              <div className="user-float-profile">
                <div className="avatar">T</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>Toru Tano</div>
                  <div style={{ fontSize: 10, color: "var(--text-dim)" }}>Pro · Local</div>
                </div>
              </div>
            </div>
          </>
        )}

        {settingsOpen && (
          <SettingsModal pane={settingsOpen} setPane={setSettingsOpen as (p: string) => void} close={() => setSettingsOpen(null)} />
        )}

        <style>{`
          body[data-lang=en] .jp, body[data-lang=en] .brand-jp { display:none !important; }
          body[data-lang=ja] .en-only { display:none !important; }

          .system-float {
            position:fixed; width:240px;
            background:var(--surface); border:1px solid var(--border-hi);
            border-radius:var(--radius-md);
            box-shadow:0 18px 40px -8px rgba(0,0,0,0.6), 0 2px 6px rgba(0,0,0,0.3);
            padding:4px 0;
            animation: sysFloatIn 140ms var(--ease-out);
          }
          @keyframes sysFloatIn {
            from { opacity:0; transform: translateX(-4px) translateY(2px); }
            to { opacity:1; transform: translateX(0) translateY(0); }
          }

          .user-float {
            position:fixed;
            background:var(--surface); border:1px solid var(--border-hi);
            border-radius:var(--radius-lg);
            box-shadow:0 24px 48px -12px rgba(0,0,0,0.6);
            padding:4px 0; overflow:hidden; min-width:220px;
          }
          .user-float-head { padding:10px 12px 8px; border-bottom:1px solid var(--border); }
          .user-float-section { padding:4px; }
          .user-float-row {
            display:flex; align-items:center; gap:10px;
            padding:7px 10px; border-radius:var(--radius-sm);
            color:var(--text); font-size:12.5px; cursor:pointer;
          }
          .user-float-row:hover { background:var(--surface-2); }
          .user-float-row.gold { color:var(--gold); }
          .user-float-row .jp { font-family:var(--font-jp); font-weight:300; font-size:10.5px; color:var(--text-dim); margin-left:-4px; }
          .user-float-row .kbd-mini { font-family:var(--font-mono); font-size:10px; color:var(--text-dim); }
          .user-float-profile {
            display:flex; align-items:center; gap:10px;
            padding:10px 12px; border-top:1px solid var(--border); background:var(--bg);
          }
          .user-float-profile .avatar {
            width:26px; height:26px; border-radius:50%;
            background:var(--surface-2); border:1px solid var(--border);
            display:flex; align-items:center; justify-content:center;
            font-size:11px; font-weight:500; color:var(--text);
          }
        `}</style>
      </div>
    </LangContext.Provider>
  );
}
