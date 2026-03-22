import { useState, useEffect } from "react";
import { useThemeStore } from "../../state/themeStore";
import { useAppStore, AppPage, AsBuiltView } from "../../state/appStore";
import { useAuthStore } from "../../state/authStore";
import { syncApi } from "../../services/syncApi";

interface SidebarProps {
  collapsed: boolean;
  onToast: (msg: string, type?: "success" | "error") => void;
}

// ── Icons ──────────────────────────────────────────────────────────────────
const IconChart    = () => <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
const IconTable    = () => <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18M10 3v18M6 3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6a3 3 0 013-3z" /></svg>;
const IconNetwork  = () => <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" /></svg>;
const IconDoc      = () => <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const IconDash     = () => <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V7zm0 6a1 1 0 011-1h8a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4zm12 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>;
const IconDetail   = () => <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 14l2 2 4-4" /></svg>;
const SunIcon      = () => <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg>;
const MoonIcon     = () => <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>;
const IconLibrary  = () => <svg className="w-[15px] h-[15px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>;
const IconGenerate = () => <svg className="w-[15px] h-[15px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;
const IconChevron  = ({ open }: { open: boolean }) => (
  <svg className="w-3.5 h-3.5 shrink-0 transition-transform" style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);
const IconChevronRight = () => (
  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

// ── Role config ───────────────────────────────────────────────────────────────
const ROLE_LABEL: Record<string, string> = { engineer: "Engineer", ptl: "PTL", mitra: "Mitra", superuser: "Superuser" };
const ROLE_COLOR: Record<string, string> = { engineer: "#2563eb", ptl: "#7c3aed", mitra: "#059669", superuser: "#d97706" };

const ROLE_PAGES: Record<string, AppPage[]> = {
  engineer:  ["dashboard", "detail", "asbuilt", "teskom", "mitra-config", "sync"],
  ptl:       ["dashboard", "detail", "asbuilt", "teskom"],
  mitra:     ["dashboard"],
  superuser: [],
};

// ── Mismatch Badge ────────────────────────────────────────────────────────────
function MismatchBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="ml-auto shrink-0 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold text-white"
      style={{ background: "#ef4444", padding: "0 4px" }}>
      {count > 99 ? "99+" : count}
    </span>
  );
}

// ── Sidebar Button ────────────────────────────────────────────────────────────
function SidebarBtn({ onClick, title, icon, label, collapsed, active = false, indent = false, badge = 0 }: any) {
  return (
    <button onClick={onClick} title={collapsed ? title : undefined}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
      style={{
        background:     active ? "var(--accent)" : "transparent",
        color:          active ? "#fff" : "var(--text-sidebar)",
        justifyContent: collapsed ? "center" : "flex-start",
        paddingLeft:    indent && !collapsed ? "1.75rem" : undefined,
      }}
      onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "var(--sidebar-item-hover, rgba(255,255,255,0.08))"; }}
      onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
    >
      {icon}
      {!collapsed && label && <span className="flex-1 text-left truncate">{label}</span>}
      {!collapsed && badge > 0 && <MismatchBadge count={badge} />}
    </button>
  );
}

function SubMenuBtn({ onClick, icon, label, active }: { onClick: () => void; icon: JSX.Element; label: string; active: boolean }) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-2.5 rounded-lg text-xs font-medium transition-all"
      style={{ padding: "7px 10px 7px 28px", background: active ? "var(--accent)" : "transparent", color: active ? "#fff" : "var(--text-sidebar)" }}
      onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "var(--sidebar-item-hover, rgba(255,255,255,0.07))"; }}
      onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = active ? "var(--accent)" : "transparent"; }}
    >
      {icon}<span>{label}</span>
    </button>
  );
}

// ── Main Sidebar ──────────────────────────────────────────────────────────────
export default function Sidebar({ collapsed, onToast }: SidebarProps) {
  const { theme, toggleTheme } = useThemeStore();
  const { currentPage, setPage, asbuiltView, setAsBuiltView } = useAppStore();
  const { user } = useAuthStore();
  const isDark = theme === "dark";

  const [asbuiltOpen, setAsbuiltOpen]     = useState(currentPage === "asbuilt");
  const [mismatchCount, setMismatchCount] = useState(0);

  const role       = user?.role ?? "engineer";
  const roleLabel  = ROLE_LABEL[role] ?? role;
  const roleColor  = ROLE_COLOR[role] ?? "#2563eb";
  const allowedPages = ROLE_PAGES[role] ?? [];
  const sectionColor = isDark ? "var(--text-sidebar)" : "#94a3b8";

  // Fetch mismatch count untuk Engineer — poll tiap 5 menit
  useEffect(() => {
    if (role !== "engineer") return;
    const fetchCount = async () => {
      try {
        const items = await syncApi.getMismatches();
        setMismatchCount(items.filter((m: any) => m.mismatch_type === "missing_in_engineer").length);
      } catch { /* silent */ }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [role]);

  const ALL_PAGES: { id: AppPage; label: string; icon: JSX.Element; badge?: number }[] = [
    { id: "dashboard",    label: "Dashboard",              icon: <IconDash /> },
    { id: "detail",       label: "Detail Pekerjaan",       icon: <IconDetail /> },
    { id: "asbuilt",      label: "As-Built",               icon: <IconNetwork /> },
    { id: "teskom",       label: "Teskom",                 icon: <IconDoc /> },
    { id: "mitra-config", label: "Pengaturan Tabel Mitra", icon: <IconTable /> },
    { id: "sync",         label: "Sync Dashboard",         icon: <IconChart />, badge: mismatchCount },
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
        style={{ width: collapsed ? 60 : 220 }}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-4 shrink-0"
          style={{ height: 56, borderBottom: "1px solid var(--sidebar-border, var(--border))" }}>
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 shadow-sm">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-xs font-bold leading-tight truncate" style={{ color: "var(--text-primary)" }}>Dashboard v3</p>
              <p className="text-[11px] leading-tight truncate" style={{ color: sectionColor }}>PA PLN Icon+</p>
            </div>
          )}
        </div>

        {/* User card — klik → ke ProfilePage */}
        {user && (
          <button
            onClick={() => setPage("profile")}
            className="mx-3 mt-3 mb-1 rounded-xl px-3 py-2.5 transition-all text-left w-auto"
            style={{
              background:  currentPage === "profile"
                ? "var(--accent-soft, rgba(37,99,235,0.08))"
                : "var(--sidebar-user-bg, rgba(255,255,255,0.05))",
              border:      `1px solid ${currentPage === "profile" ? "var(--accent)" : "var(--sidebar-user-border, var(--border))"}`,
              cursor:      "pointer",
            }}
            title={collapsed ? `${user.nama_lengkap} — Profil` : undefined}
          >
            {collapsed ? (
              <div className="flex justify-center">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: roleColor }}>
                  {user.nama_lengkap.charAt(0).toUpperCase()}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white shadow-sm"
                  style={{ background: roleColor }}>
                  {user.nama_lengkap.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate leading-tight" style={{ color: "var(--text-primary)" }}>
                    {user.nama_lengkap}
                  </p>
                  <span className="inline-block mt-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                    style={{ background: `${roleColor}18`, color: roleColor }}>
                    {roleLabel}
                  </span>
                </div>
                <IconChevronRight />
              </div>
            )}
          </button>
        )}

        {/* Nav */}
        <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto custom-scrollbar">
          {!collapsed && visiblePages.length > 0 && (
            <p className="text-[10px] font-semibold uppercase tracking-widest px-2 pt-1 pb-1.5" style={{ color: sectionColor }}>
              Aplikasi
            </p>
          )}

          {visiblePages.map((p) => (
            <div key={p.id}>
              {p.id === "asbuilt" ? (
                <div>
                  <button onClick={() => { setPage("asbuilt"); if (!collapsed) setAsbuiltOpen(v => !v); }}
                    title={collapsed ? "As-Built" : undefined}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={{ background: currentPage === "asbuilt" ? "var(--accent)" : "transparent", color: currentPage === "asbuilt" ? "#fff" : "var(--text-sidebar)", justifyContent: collapsed ? "center" : "flex-start" }}
                    onMouseEnter={(e) => { if (currentPage !== "asbuilt") (e.currentTarget as HTMLElement).style.background = "var(--sidebar-item-hover, rgba(255,255,255,0.08))"; }}
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
                <SidebarBtn
                  onClick={() => setPage(p.id)}
                  icon={p.icon}
                  label={p.label}
                  title={p.label}
                  collapsed={collapsed}
                  active={currentPage === p.id}
                  badge={p.badge ?? 0}
                />
              )}
            </div>
          ))}
        </nav>

        {/* Footer — toggle theme + versi */}
        <div style={{ height: 1, background: "var(--sidebar-border, var(--border))", margin: "0 12px" }} />
        <div className="shrink-0 px-2 py-3">
          <button onClick={toggleTheme}
            title={collapsed ? "Toggle Tema" : undefined}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ background: "transparent", color: "var(--text-sidebar)", justifyContent: collapsed ? "center" : "flex-start" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--sidebar-item-hover, rgba(255,255,255,0.08))"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            {isDark ? <SunIcon /> : <MoonIcon />}
            {!collapsed && <span>{isDark ? "Light Mode" : "Dark Mode"}</span>}
          </button>
          {!collapsed && <p className="text-[10px] px-3 pt-1" style={{ color: sectionColor }}>v3.2 · 2026</p>}
        </div>
      </aside>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bottom-nav flex items-center justify-around px-1 py-1"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {visiblePages.map(p => {
          const isActive = currentPage === p.id;
          return (
            <button key={p.id} onClick={() => setPage(p.id)}
              className="relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all"
              style={{ color: isActive ? "var(--accent)" : "var(--text-muted)", background: isActive ? "var(--accent-soft)" : "transparent" }}
            >
              {p.icon}
              {p.badge && p.badge > 0 && (
                <span className="absolute top-1 right-1 min-w-[14px] h-[14px] rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                  style={{ background: "#ef4444", padding: "0 2px" }}>
                  {p.badge > 99 ? "99+" : p.badge}
                </span>
              )}
              <span className="text-[10px] font-semibold">{p.label}</span>
            </button>
          );
        })}
        {/* Profil di mobile */}
        <button onClick={() => setPage("profile")}
          className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all"
          style={{ color: currentPage === "profile" ? "var(--accent)" : "var(--text-muted)", background: currentPage === "profile" ? "var(--accent-soft)" : "transparent" }}
        >
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
            style={{ background: ROLE_COLOR[role] ?? "#2563eb" }}>
            {user?.nama_lengkap?.charAt(0).toUpperCase() ?? "?"}
          </div>
          <span className="text-[10px] font-semibold">Profil</span>
        </button>
        <button onClick={toggleTheme} className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl" style={{ color: "var(--text-muted)" }}>
          {isDark ? <SunIcon /> : <MoonIcon />}
          <span className="text-[10px] font-semibold">Tema</span>
        </button>
      </nav>
    </>
  );
}
