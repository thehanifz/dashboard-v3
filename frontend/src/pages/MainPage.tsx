/**
 * MainPage.tsx
 * Entry point tunggal setelah login berhasil.
 * Render panel yang tepat berdasarkan role + page state dari appStore.
 *
 * Struktur render:
 *   superuser → SuperuserPage (self-contained, punya layout sendiri)
 *   ptl       → PTLDashboardPanel
 *   mitra     → MitraDashboardPanel
 *   engineer  → EngineerDashboardPanel | AsBuiltPage | TeskomPage |
 *               MitraTableConfigPage | SyncDashboardPage
 *
 * Halaman profile ditangani di App.tsx (shared semua role).
 */
import { useAuthStore } from "../state/authStore";
import { useAppStore }  from "../state/appStore";

// Role panels
import PTLDashboardPanel      from "../components/ptl/PTLDashboardPanel";
import MitraDashboardPanel    from "../components/mitra/MitraDashboardPanel";
import EngineerDashboardPanel from "../components/engineer/EngineerDashboardPanel";

// Pages khusus engineer
import AsBuiltPage          from "./AsBuiltPage";
import TeskomPage           from "./TeskomPage";
import MitraTableConfigPage from "./MitraTableConfigPage";
import SyncDashboardPage    from "./SyncDashboardPage";

// Page superuser (self-contained)
import SuperuserPage from "./SuperuserPage";

export default function MainPage() {
  const { user }    = useAuthStore();
  const { currentPage: page } = useAppStore();

  // ── Superuser ──────────────────────────────────────────────────────────────
  if (user?.role === "superuser") {
    return <SuperuserPage />;
  }

  // ── PTL ───────────────────────────────────────────────────────────────────
  if (user?.role === "ptl") {
    return <PTLDashboardPanel />;
  }

  // ── Mitra ─────────────────────────────────────────────────────────────────
  if (user?.role === "mitra") {
    return <MitraDashboardPanel />;
  }

  // ── Engineer ──────────────────────────────────────────────────────────────
  if (user?.role === "engineer") {
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
