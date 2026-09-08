import { useState } from "react";
import { useAuthStore } from "../../state/authStore";
import { useAppStore } from "../../state/appStore";
import { syncApi } from "../../services/syncApi";
import Theme from "./Theme";
import DashboardSettings from "./DashboardSettings";

const IconTable = () => <span aria-hidden="true">▦</span>;
const IconSync = () => <span aria-hidden="true">↻</span>;
const IconDashboard = () => <span aria-hidden="true">⚙</span>;
const IconChevron = ({ open }: { open: boolean }) => (
  <svg className="w-4 h-4 shrink-0 transition-transform" style={{ transform: open ? "rotate(90deg)" : undefined }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
  </svg>
);

export default function SettingsPanel() {
  const { user } = useAuthStore();
  const { setPage } = useAppStore();
  const canConfigure = user?.role === "engineer" || user?.role === "superuser";
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [syncCount, setSyncCount] = useState<number | null>(null);

  const refreshSyncCount = async () => {
    if (syncCount !== null) return;
    try {
      const items = await syncApi.getMismatches();
      setSyncCount(items.filter((m: any) => m.mismatch_type === "missing_in_engineer").length);
    } catch {
      setSyncCount(0);
    }
  };

  return (
    <div className="min-h-full" style={{ background: "var(--bg-app)" }}>
      <div className="w-full max-w-5xl mx-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-8 space-y-4 sm:space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Preferences</p>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Pengaturan</h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: "var(--text-muted)" }}>Kelola akun, tampilan, dan menu aplikasi dari satu panel.</p>
        </div>

        <Theme />

        <section className="rounded-3xl border p-4 sm:p-5" style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>👤</div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Profil & Keamanan</h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Informasi akun, Google Sheet PTL, password, dan sesi.</p>
            </div>
            <button onClick={() => setPage("profile")} className="shrink-0 rounded-xl px-3.5 py-2.5 text-xs font-bold" style={{ background: "var(--accent)", color: "#fff" }}>Buka Profil</button>
          </div>
        </section>

        {canConfigure && (
          <section className="rounded-3xl border overflow-hidden" style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
            <div className="px-4 pt-4 sm:px-5 sm:pt-5">
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Menu Lainnya</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Fitur khusus Engineer dan Superuser dipindahkan ke sini agar sidebar tetap ringkas.</p>
            </div>

            <div className="p-3 sm:p-4 space-y-2">
              <button onClick={() => setPage("mitra-config")} className="w-full flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-left" style={{ background: "var(--bg-surface2)", borderColor: "var(--border)", color: "var(--text-primary)" }}>
                <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}><IconTable /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Pengaturan Tabel Mitra</span><span className="block text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Konfigurasi kolom dan tampilan data Mitra.</span></span>
                <IconChevron open={false} />
              </button>

              <button onClick={() => { refreshSyncCount(); setPage("sync"); }} className="w-full flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-left" style={{ background: "var(--bg-surface2)", borderColor: "var(--border)", color: "var(--text-primary)" }}>
                <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}><IconSync /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Sync Dashboard</span><span className="block text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Periksa dan sinkronkan perbedaan data dashboard.</span></span>
                {syncCount !== null && syncCount > 0 && <span className="min-w-5 h-5 px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center" style={{ background: "#ef4444" }}>{syncCount > 99 ? "99+" : syncCount}</span>}
                <IconChevron open={false} />
              </button>

              <button onClick={() => setDashboardOpen(v => !v)} className="w-full flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-left" style={{ background: dashboardOpen ? "var(--accent-soft)" : "var(--bg-surface2)", borderColor: dashboardOpen ? "var(--accent)" : "var(--border)", color: "var(--text-primary)" }}>
                <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}><IconDashboard /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Pengaturan Dashboard</span><span className="block text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Threshold Aging, nama aplikasi, dan kolom GSheet.</span></span>
                <IconChevron open={dashboardOpen} />
              </button>

              {dashboardOpen && <div className="pt-1"><DashboardSettings /></div>}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
