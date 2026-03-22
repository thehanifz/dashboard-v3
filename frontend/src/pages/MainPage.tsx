/**
 * MainPage.tsx
 * Entry point tunggal setelah login berhasil.
 * Render panel yang tepat berdasarkan role + page state dari appStore.
 *
 * Struktur render:
 *   superuser → SuperuserPanel (self-contained)
 *   ptl       → PTLDashboardPanel | PTLDetailPanel | AsBuiltPage | TeskomPage
 *   mitra     → MitraDashboardPanel
 *   engineer  → EngineerDashboardPanel | EngineerDetailPanel |
 *               AsBuiltPage | TeskomPage | MitraTableConfigPage | SyncDashboardPage
 *
 * Halaman profile ditangani di App.tsx (shared semua role).
 */
import { useState } from "react";
import { useAuthStore } from "../state/authStore";
import { useAppStore }  from "../state/appStore";
import { useToast }     from "../utils/useToast";

// Layout
import Sidebar        from "../components/layout/Sidebar";
import Topbar         from "../components/layout/Topbar";
import ToastContainer from "../components/ui/ToastContainer";

// Role panels
import PTLDashboardPanel      from "../components/ptl/PTLDashboardPanel";
import PTLDetailPanel         from "../components/ptl/PTLDetailPanel";
import MitraDashboardPanel    from "../components/mitra/MitraDashboardPanel";
import EngineerDashboardPanel from "../components/engineer/EngineerDashboardPanel";
import EngineerDetailPanel    from "../components/engineer/EngineerDetailPanel";

// Pages khusus engineer + ptl
import AsBuiltPage          from "./AsBuiltPage";
import TeskomPage           from "./TeskomPage";
import MitraTableConfigPage from "./MitraTableConfigPage";
import SyncDashboardPage    from "./SyncDashboardPage";

// Panel superuser
import SuperuserPanel from "../components/superuser/SuperuserPanel";

/**
 * LayoutShell — wrapper Sidebar+Topbar untuk page bare (tanpa layout sendiri).
 * Dipakai untuk MitraTableConfigPage dan SyncDashboardPage.
 */
function LayoutShell({ children, onRefresh }: { children: React.ReactNode; onRefresh?: () => void }) {
  const [collapsed, setCollapsed] = useState(false);
  const { toasts, show: showToast } = useToast();

  return (
    <div className="flex h-full overflow-hidden" style={{ background: "var(--bg-app)" }}>
      <Sidebar collapsed={collapsed} onToast={showToast} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar
          onRefresh={onRefresh}
          sidebarCollapsed={collapsed}
          onToggleSidebar={() => setCollapsed(v => !v)}
        />
        <main className="flex-1 overflow-auto pb-16 md:pb-0">
          {children}
        </main>
      </div>
      <ToastContainer toasts={toasts} />
    </div>
  );
}

export default function MainPage() {
  const { user }    = useAuthStore();
  const { currentPage: page } = useAppStore();

  // ── Superuser ──────────────────────────────────────────────────────────────
  if (user?.role === "superuser") {
    return <SuperuserPanel />;
  }

  // ── PTL ───────────────────────────────────────────────────────────────────
  if (user?.role === "ptl") {
    if (page === "detail")  return <PTLDetailPanel />;
    if (page === "asbuilt") return <AsBuiltPage />;
    if (page === "teskom")  return <TeskomPage />;
    // default: dashboard
    return <PTLDashboardPanel />;
  }

  // ── Mitra ─────────────────────────────────────────────────────────────────
  if (user?.role === "mitra") {
    return <MitraDashboardPanel />;
  }

  // ── Engineer ──────────────────────────────────────────────────────────────
  if (user?.role === "engineer") {
    if (page === "detail")       return <EngineerDetailPanel />;
    if (page === "asbuilt")      return <AsBuiltPage />;
    if (page === "teskom")       return <TeskomPage />;
    if (page === "mitra-config") return <LayoutShell><MitraTableConfigPage /></LayoutShell>;
    if (page === "sync")         return <LayoutShell><SyncDashboardPage /></LayoutShell>;
    // default: dashboard
    return <EngineerDashboardPanel />;
  }

  // Fallback — tidak seharusnya terjadi jika auth sudah benar
  return null;
}
