/**
 * SuperuserPanel.tsx
 * Panel utama Superuser — layout dengan sidebar, topbar, dan konten per menu.
 *
 * Menu:
 *   - "users"   → UserManagementPanel
 *   - "profile" → ProfilePage (shared, dipanggil via appStore)
 *
 * Dipindah dari pages/SuperuserPage.tsx.
 * SuperuserPage.tsx menjadi re-export ke file ini.
 */
import { useEffect, useState } from "react";
import { useAuthStore }   from "../../state/authStore";
import { useThemeStore }  from "../../state/themeStore";
import { useAppStore }    from "../../state/appStore";
import UserManagementPanel from "./UserManagementPanel";
import ProfilePage         from "../../pages/ProfilePage";

type Menu = "users" | "profile";

const SunIcon  = () => (
  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
  </svg>
);
const MoonIcon = () => (
  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
);

export default function SuperuserPanel() {
  const { user }               = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { currentPage }        = useAppStore();
  const isDark                 = theme === "dark";

  // Sync appStore "profile" page ke activeMenu
  const [activeMenu, setActiveMenu] = useState<Menu>(
    currentPage === "profile" ? "profile" : "users"
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Ikuti perubahan currentPage dari luar (misal klik profil di topbar)
  useEffect(() => {
    if (currentPage === "profile") setActiveMenu("profile");
  }, [currentPage]);

  // ── Nav item ──────────────────────────────────────────────────────────────
  const NavItem = ({ menuKey, label }: { menuKey: Menu; label: string }) => {
    const isActive = activeMenu === menuKey;
    return (
      <button
        onClick={() => { setActiveMenu(menuKey); setMobileOpen(false); }}
        className="w-full flex items-center px-4 py-2.5 rounded-xl text-sm font-medium transition-all text-left"
        style={{
          background: isActive ? "var(--accent)" : "transparent",
          color:      isActive ? "#fff" : "var(--text-secondary)",
        }}
        onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; }}
        onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      >
        {label}
      </button>
    );
  };

  // ── Sidebar ───────────────────────────────────────────────────────────────
  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Dashboard v3</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Superuser Panel</p>
          </div>
        </div>
      </div>

      {/* User card */}
      <div className="mx-3 mt-3 mb-1 rounded-xl px-3 py-2.5"
        style={{ background: "var(--sidebar-user-bg, var(--bg-surface2))", border: "1px solid var(--sidebar-user-border, var(--border))" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white shadow-sm"
            style={{ background: "#d97706" }}>
            {(user?.nama_lengkap ?? "S").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>
              {user?.nama_lengkap ?? "Super Admin"}
            </p>
            <span className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
              style={{ background: "#d9770618", color: "#d97706" }}>
              Superuser
            </span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-widest px-2 pb-1.5"
          style={{ color: "var(--text-muted)" }}>
          Menu
        </p>
        <NavItem menuKey="users"   label="User Management" />
        <NavItem menuKey="profile" label="Profil" />
      </nav>

      {/* Footer */}
      <div style={{ borderTop: "1px solid var(--border)" }} className="px-2 py-3">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
          style={{ color: "var(--text-secondary)", background: "transparent" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          {isDark ? <SunIcon /> : <MoonIcon />}
          <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
        </button>
        <p className="text-[10px] px-4 pt-1" style={{ color: "var(--text-muted)" }}>v3.2 · 2026</p>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-app)" }}>

      {/* Sidebar Desktop */}
      <aside
        className="hidden lg:flex flex-col w-64 shrink-0 sidebar-bg"
        style={{ borderRight: "1px solid var(--sidebar-border, var(--border))", boxShadow: "var(--sidebar-shadow, none)" }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 sidebar-bg shadow-xl">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Topbar */}
        <header
          className="flex items-center justify-between px-4 lg:px-6 shrink-0"
          style={{ height: 56, background: "var(--topbar-bg)", borderBottom: "1px solid var(--topbar-border)" }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden px-3 py-2 rounded-lg text-sm"
              style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
            >
              Menu
            </button>
            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {activeMenu === "users" ? "User Management" : "Profil"}
            </span>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
              {user?.nama_lengkap ?? "Super Admin"}
            </p>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              @{user?.username}
            </p>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          {activeMenu === "users"   && <UserManagementPanel />}
          {activeMenu === "profile" && <ProfilePage />}
        </main>
      </div>
    </div>
  );
}
