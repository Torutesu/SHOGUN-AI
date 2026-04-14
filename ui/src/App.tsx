import { useEffect, useState } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { SpotlightSearch } from "./components/SpotlightSearch";
import { api } from "./lib/tauri";
import { LangContext, t, type Lang } from "./lib/i18n";

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [ready, setReady] = useState(false);
  const [captureActive, setCaptureActive] = useState(true);
  const [lang, setLang] = useState<Lang>("ja");

  useEffect(() => {
    api.loadSettings().then((s) => {
      if (!s.onboarding_completed) navigate("/onboarding", { replace: true });
      setLang((s.language as Lang) || "ja");
      setReady(true);
    }).catch(() => setReady(true));
  }, [navigate]);

  // Re-read language when navigating (in case Settings changed it)
  useEffect(() => {
    api.loadSettings().then((s) => setLang((s.language as Lang) || "ja")).catch(() => {});
  }, [location.pathname]);

  if (!ready) {
    return <div className="flex items-center justify-center h-screen bg-base" />;
  }

  const nav = (to: string, label: string, icon: React.ReactNode) => (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) => `nav-item ${isActive ? "nav-item-active" : ""}`}
    >
      {icon}{label}
    </NavLink>
  );

  return (
    <LangContext.Provider value={lang}>
    <div className="flex h-screen bg-base">
      <SpotlightSearch />

      {/* Sidebar — 240px fixed */}
      <aside className="w-[240px] shrink-0 bg-surface border-r border-border flex flex-col">
        {/* macOS traffic light space */}
        <div className="h-[36px] drag-region" />

        {/* Logo */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <span className="text-gold text-lg font-semibold tracking-wide">SHOGUN</span>
            <span className="badge badge-gold text-[10px]">v0.1</span>
          </div>
        </div>

        {/* Quick search */}
        <button
          onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
          className="mx-3 mb-3 flex items-center gap-2 px-2 py-1.5 rounded-md bg-input-bg border border-border-subtle text-text-disabled text-xs hover:border-border hover:text-text-secondary transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <span className="flex-1 text-left">Search...</span>
          <kbd className="text-[10px] bg-surface-alt px-1 py-0.5 rounded">⌘K</kbd>
        </button>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-0.5" role="navigation">
          <div className="text-[10px] text-text-disabled font-medium uppercase tracking-[0.08em] px-2 pt-2 pb-1">Main</div>
          {nav("/", t("nav.dashboard", lang), <Icon d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />)}
          {nav("/chat", t("nav.ask", lang), <Icon d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />)}
          {nav("/search", t("nav.search", lang), <Icon d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />)}

          <div className="text-[10px] text-text-disabled font-medium uppercase tracking-[0.08em] px-2 pt-4 pb-1">System</div>
          {nav("/settings", t("nav.settings", lang), <Icon d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />)}
        </nav>

        {/* Footer — capture status */}
        <div className="px-4 py-3 border-t border-border">
          <button
            onClick={() => setCaptureActive(!captureActive)}
            className="flex items-center gap-2 text-xs w-full"
          >
            {captureActive
              ? <><span className="dot-pulse" /><span className="text-text-secondary">{t("dash.capturing", lang)}</span></>
              : <><span className="w-2 h-2 rounded-full bg-text-disabled" /><span className="text-text-disabled">{t("dash.paused", lang)}</span></>
            }
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
    </LangContext.Provider>
  );
}

function Icon({ d }: { d: string }) {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={d} />
    </svg>
  );
}
