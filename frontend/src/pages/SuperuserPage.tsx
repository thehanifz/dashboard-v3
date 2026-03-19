/**
 * pages/SuperuserPage.tsx
 * Placeholder untuk superuser — Phase 3 akan diisi User Management penuh.
 */
import { useAuthStore } from "../state/authStore";
import { authApi } from "../services/authApi";
import { useState } from "react";

export default function SuperuserPage() {
  const { user, clearAuth } = useAuthStore();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try { await authApi.logout(); } catch {}
    clearAuth();
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 gap-6">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-sm w-full text-center">
        <div className="w-14 h-14 rounded-full bg-amber-500 flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-white">
          {user?.nama_lengkap?.charAt(0).toUpperCase() ?? "S"}
        </div>
        <h1 className="text-white font-bold text-lg mb-1">{user?.nama_lengkap}</h1>
        <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 mb-4">
          Superuser
        </span>
        <p className="text-gray-400 text-sm mb-6">
          Halaman User Management akan tersedia di Phase 3.
        </p>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full py-2.5 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-500 disabled:bg-red-900 text-white transition-colors"
        >
          {loggingOut ? "Keluar..." : "Logout"}
        </button>
      </div>
    </div>
  );
}