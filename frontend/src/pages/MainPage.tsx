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
import { useAuthStore } from "../state/authStore";
import { useAppStore }  from "../state/appStore";

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
    if (page === "mitra-config") return <MitraTableConfigPage />;
    if (page === "sync")         return <SyncDashboardPage />;
    // default: dashboard
    return <EngineerDashboardPanel />;
  }

  // Fallback — tidak seharusnya terjadi jika auth sudah benar
  return null;
}
