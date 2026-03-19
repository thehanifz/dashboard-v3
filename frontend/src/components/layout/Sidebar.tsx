import { useState, useRef } from "react";
import { useThemeStore } from "../../state/themeStore";
import { useAppStore, AppPage, AsBuiltView } from "../../state/appStore";
import { useAuthStore } from "../../state/authStore";
import { authApi } from "../../services/authApi";

type DashView = "summary" | "kanban" | "table";

interface SidebarProps {
  view: DashView;
  onViewChange: (v: DashView) => void;
  collapsed: boolean;
  onToast: (msg: string, type?: "success" | "error") => void;
}

// ── Icons ──────────────────────────────────────────────────────────────────
const IconChart    = () => <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
const IconKanban   = () => <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>;
const IconTable    = () => <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18M10 3v18M6 3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6a3 3 0 013-3z" /></svg>;
const IconNetwork  = () => <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" /></svg>;
const IconDoc      = () => <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const IconDash     = () => <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V7zm0 6a1 1 0 011-1h8a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4zm12 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>;
const SunIcon      = () => <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg>;
const MoonIcon     = () => <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>;
const DownloadIcon = () => <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;
const UploadIcon   = () => <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>;
const IconLibrary  = () => <svg className="w-[15px] h-[15px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>;
const IconGenerate = () => <svg className="w-[15px] h-[15px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;
const IconLogout   = () => <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;
const IconChevron  = ({ open }: { open: boolean }) => (
  <svg className="w-3.5 h-3.5 shrink-0 transition-transform" style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

// ── Role config ───────────────────────────────────────────────────────────────
const ROLE_LABEL: Record<string, string> = { engineer: "Engineer", ptl: "PTL", mitra: "Mitra", superuser: "Superuser" };
const ROLE_COLOR: Record<string, string> = { engineer: "#3b82f6", ptl: "#8b5cf6", mitra: "#10b981", superuser: "#f59e0b" };

// Menu yang tampil per role — tidak di-disable, tidak dirender sama sekali
const ROLE_PAGES: Record<string, AppPage[]> = {
  engineer: ["dashboard", "asbuilt", "teskom", "mitra-config", "sync"],
  ptl:      ["dashboard"],
  mitra:    ["dashboard"],
};

// ── Sidebar Button ────────────────────────────────────────────────────────────
function SidebarBtn({ onClick, title, icon, label, collapsed, active = false, indent = false, danger = false }: any) {
  return (
    <button onClick={onClick} title={collapsed ? title : undefined}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
      style={{
        background: active ? "var(--accent)" : "transparent",
        color: active ? "#fff" : danger ? "#f87171" : "var(--text-sidebar)",
        justifyContent: collapsed ? "center" : "flex-start",
        paddingLeft: indent && !collapsed ? "1.75rem" : undefined,
      }}
      onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = danger ? "rgba(248,113,113,0.1)" : "rgba(255,255,255,0.08)"; }}
      onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
    >
      {icon}
      {!collapsed && label && <span>{label}</span>}
    </button>
  );
}

function SubMenuBtn({ onClick, icon, label, active }: { onClick: () => void; icon: JSX.Element; label: string; active: boolean }) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-2.5 rounded-lg text-xs font-medium transition-all"
      style={{ padding: "7px 10px 7px 28px", background: active ? "var(--accent)" : "transparent", color: active ? "#fff" : "var(--text-sidebar)" }}
      onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)"; }}
      onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = active ? "var(--accent)" : "transparent"; }}
    >
      {icon}<span>{label}</span>
    </button>
  );
}

// ── Main Sidebar ──────────────────────────────────────────────────────────────
export default function Sidebar({ view, onViewChange, collapsed, onToast }: SidebarProps) {
  const { theme, toggleTheme, exportConfig, importConfig } = useThemeStore();
  const { currentPage, setPage, asbuiltView, setAsBuiltView } = useAppStore();
  const { user, clearAuth } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDark = theme === "dark";

  const [asbuiltOpen, setAsbuiltOpen] = useState(currentPage === "asbuilt");
  const [loggingOut, setLoggingOut]   = useState(false);

  const role      = user?.role ?? "engineer";
  const roleLabel = ROLE_LABEL[role] ?? role;
  const roleColor = ROLE_COLOR[role] ?? "#3b82f6";
  const allowedPages = ROLE_PAGES[role] ?? ["dashboard"];

  const handleLogout = async () => {
    setLoggingOut(true);
    try { await authApi.logout(); } catch {}
    clearAuth();
    window.location.href = "/";
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { const msg = await importConfig(file); onToast(msg, "success"); }
    catch (err: any) { onToast(err || "Gagal import config", "error"); }
    finally { e.target.value = ""; }
  };

  const DASH_VIEWS: { id: DashView; label: string; icon: JSX.Element }[] = [
    { id: "summary", label: "Summary", icon: <IconChart /> },
    { id: "kanban",  label: "Kanban",  icon: <IconKanban /> },
    { id: "table",   label: "Tabel",   icon: <IconTable /> },
  ];

  const ALL_PAGES: { id: AppPage; label: string; icon: JSX.Element }[] = [
    { id: "dashboard", label: "Dashboard PA", icon: <IconDash /> },
    { id: "asbuilt",   label: "As-Built",     icon: <IconNetwork /> },
    { id: "teskom",    label: "Teskom",        icon: <IconDoc /> },
    { id: "mitra-config", label: "Pengaturan Tabel Mitra", icon: <IconTable /> },
    { id: "sync",         label: "Sync Dashboard",          icon: <IconChart /> },
  ];

  const visiblePages = ALL_PAGES.filter(p => allowedPages.includes(p.id));

  const ASBUILT_VIEWS: { id: AsBuiltView; label: string; icon: JSX.Element }[] = [
    { id: "library",  label: "Library",  icon: <IconLibrary /> },
    { id: "generate", label: "Generate", icon: <IconGenerate /> },
  ];

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex flex-col h-full shrink-0 transition-all duration-200 sidebar-bg"
        style={{ width: collapsed ? 60 : 220, borderRight: "1px solid var(--border)" }}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-4 shrink-0" style={{ height: 56, borderBottom: "1px solid var(--border)" }}>
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 shadow-sm">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-white text-xs font-bold leading-tight truncate">Dashboard v3</p>
              <p className="text-[11px] leading-tight truncate" style={{ color: "var(--text-sidebar)" }}>PA PLN Icon+</p>
            </div>
          )}
        </div>

        {/* User info */}
        {!collapsed && user && (
          <div className="px-3 py-2.5 mx-2 mt-2 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white" style={{ background: roleColor }}>
                {user.nama_lengkap.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>{user.nama_lengkap}</p>
                <p className="text-[10px] font-medium" style={{ color: roleColor }}>{roleLabel}</p>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto custom-scrollbar">
          {!collapsed && <p className="text-[10px] font-semibold uppercase tracking-widest px-2 mb-1" style={{ color: "var(--text-sidebar)" }}>Aplikasi</p>}

          {visiblePages.map((p) => (
            <div key={p.id}>
              {p.id === "asbuilt" ? (
                <div>
                  <button onClick={() => { setPage("asbuilt"); if (!collapsed) setAsbuiltOpen(v => !v); }}
                    title={collapsed ? "As-Built" : undefined}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
                    style={{ background: currentPage === "asbuilt" ? "var(--accent)" : "transparent", color: currentPage === "asbuilt" ? "#fff" : "var(--text-sidebar)", justifyContent: collapsed ? "center" : "flex-start" }}
                    onMouseEnter={(e) => { if (currentPage !== "asbuilt") (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)"; }}
                    onMouseLeave={(e) => { if (currentPage !== "asbuilt") (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    <IconNetwork />
                    {!collapsed && (<><span className="flex-1 text-left">As-Built</span><IconChevron open={asbuiltOpen} /></>)}
                  </button>
                  {!collapsed && asbuiltOpen && currentPage === "asbuilt" && (
                    <div className="mt-0.5 space-y-0.5">
                      {ASBUILT_VIEWS.map(v => <SubMenuBtn key={v.id} onClick={() => setAsBuiltView(v.id)} icon={v.icon} label={v.label} active={asbuiltView === v.id} />)}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <SidebarBtn onClick={() => setPage(p.id)} icon={p.icon} label={p.label} title={p.label} collapsed={collapsed} active={currentPage === p.id} />
                  {p.id === "dashboard" && currentPage === "dashboard" && !collapsed && (
                    <div className="mt-0.5 space-y-0.5">
                      {DASH_VIEWS.map(v => <SidebarBtn key={v.id} onClick={() => onViewChange(v.id)} icon={v.icon} label={v.label} title={v.label} collapsed={collapsed} active={view === v.id} indent={true} />)}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="shrink-0 px-2 pb-4 pt-3 space-y-0.5" style={{ borderTop: "1px solid var(--border)" }}>
          {!collapsed && <p className="text-[10px] font-semibold uppercase tracking-widest px-2 mb-2" style={{ color: "var(--text-sidebar)" }}>Pengaturan</p>}
          <SidebarBtn onClick={toggleTheme} icon={isDark ? <SunIcon /> : <MoonIcon />} label={isDark ? "Light Mode" : "Dark Mode"} title="Toggle Tema" collapsed={collapsed} />
          <SidebarBtn onClick={exportConfig} icon={<DownloadIcon />} label="Export Config" title="Export Config" collapsed={collapsed} />
          <SidebarBtn onClick={() => fileInputRef.current?.click()} icon={<UploadIcon />} label="Import Config" title="Import Config" collapsed={collapsed} />
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
          <SidebarBtn onClick={handleLogout} icon={<IconLogout />} label={loggingOut ? "Keluar..." : "Logout"} title="Logout" collapsed={collapsed} danger={true} />
          {!collapsed && <p className="text-[10px] px-3 pt-2" style={{ color: "var(--text-muted)" }}>v3.1 · 2026</p>}
        </div>
      </aside>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bottom-nav flex items-center justify-around px-1 py-1" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {visiblePages.map(p => {
          const isActive = currentPage === p.id;
          return (
            <button key={p.id} onClick={() => setPage(p.id)}
              className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all"
              style={{ color: isActive ? "var(--accent)" : "var(--text-muted)", background: isActive ? "var(--accent-soft)" : "transparent" }}
            >
              {p.icon}
              <span className="text-[10px] font-semibold">{p.label}</span>
            </button>
          );
        })}
        <button onClick={toggleTheme} className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all" style={{ color: "var(--text-muted)" }}>
          {isDark ? <SunIcon /> : <MoonIcon />}
          <span className="text-[10px] font-semibold">Tema</span>
        </button>
        <button onClick={handleLogout} className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all" style={{ color: "#f87171" }}>
          <IconLogout />
          <span className="text-[10px] font-semibold">Logout</span>
        </button>
      </nav>
    </>
  );
}