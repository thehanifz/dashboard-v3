/**
 * App.tsx
 * Route guard: cek login sebelum render halaman utama.
 * Kalau belum login → tampilkan LoginPage.
 *
 * PERUBAHAN dari versi sebelumnya:
 * - Import useAuthStore + LoginPage
 * - Wrap seluruh app dalam AuthGuard
 * - Tambah route /login
 * - Semua route existing tidak berubah
 */
import { useEffect, useState } from "react";
import { useAuthStore }   from "./state/authStore";
import { authApi }        from "./services/authApi";
import LoginPage          from "./pages/LoginPage";

// ── Import existing pages (tidak diubah) ─────────────────────────────────────
import { useAppStore }    from "./state/appStore";
import DashboardPage      from "./pages/DashboardPage";
import AsBuiltPage        from "./pages/AsBuiltPage";
import TeskomPage         from "./pages/TeskomPage";
import Sidebar            from "./components/layout/Sidebar";
import Topbar             from "./components/layout/Topbar";
import ToastContainer     from "./components/ui/ToastContainer";

// ── Auth Guard ────────────────────────────────────────────────────────────────
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, setAuth, clearAuth } = useAuthStore();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Saat app dimuat: coba ambil user dari /me (memanfaatkan httpOnly refresh cookie)
    // Kalau access token sudah ada di store, skip
    if (isLoggedIn()) {
      setChecking(false);
      return;
    }

    authApi.me()
      .then((user) => {
        // Kalau /me berhasil tanpa access token berarti ada sisa session
        // Refresh dulu untuk dapat access token baru
        authApi.refresh().then((res) => {
          setAuth(
            { username: user.username, nama_lengkap: user.nama_lengkap, role: user.role },
            res.access_token
          );
        }).catch(() => {
          clearAuth();
        });
      })
      .catch(() => {
        clearAuth();
      })
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-gray-400 text-sm">Memuat...</div>
      </div>
    );
  }

  if (!isLoggedIn()) {
    return <LoginPage />;
  }

  return <>{children}</>;
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const { currentPage: page } = useAppStore();

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-gray-950 text-white">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-auto">
            {page === "dashboard" && <DashboardPage />}
            {page === "asbuilt"   && <AsBuiltPage />}
            {page === "teskom"    && <TeskomPage />}
          </main>
        </div>
        <ToastContainer />
      </div>
    </AuthGuard>
  );
}