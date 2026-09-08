import { useAuthStore } from "../../state/authStore";
import { useAppStore } from "../../state/appStore";
import Theme from "./Theme";
import DashboardSettings from "./DashboardSettings";

export default function SettingsPanel() {
  const { user } = useAuthStore();
  const { setPage } = useAppStore();
  const canConfigure = user?.role === "engineer" || user?.role === "superuser";

  return <div className="min-h-full" style={{ background: "var(--bg-app)" }}>
    <div className="w-full max-w-5xl mx-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-8 space-y-4 sm:space-y-5">
      <div><p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Preferences</p><h1 className="text-xl sm:text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Pengaturan</h1><p className="text-xs sm:text-sm mt-1" style={{ color: "var(--text-muted)" }}>Kelola akun, tampilan, dan konfigurasi dashboard dari satu panel.</p></div>
      <Theme />
      <section className="rounded-3xl border p-4 sm:p-5" style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
        <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>👤</div><div className="min-w-0 flex-1"><h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Profil & Keamanan</h2><p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Informasi akun, Google Sheet PTL, password, dan sesi.</p></div><button onClick={() => setPage("profile")} className="shrink-0 rounded-xl px-3.5 py-2.5 text-xs font-bold" style={{ background: "var(--accent)", color: "#fff" }}>Buka Profil</button></div>
      </section>
      {canConfigure && <DashboardSettings />}
    </div>
  </div>;
}

