/**
 * PTLDashboardPanel.tsx
 * Panel dashboard PTL — hanya menampilkan PTLSummaryDashboard (chart/statistik).
 * Detail tabel & aksi dipindah ke PTLDetailPanel.tsx (page: "detail").
 */
import { useEffect, useState, useCallback } from "react";
import { useThemeStore }     from "../../state/themeStore";
import { useAuthStore }      from "../../state/authStore";
import { useAppStore }       from "../../state/appStore";
import { useToast }          from "../../utils/useToast";
import Topbar                from "../layout/Topbar";
import Sidebar               from "../layout/Sidebar";
import ToastContainer        from "../ui/ToastContainer";
import PTLSummaryDashboard   from "./PTLSummaryDashboard";
import api                   from "../../services/api";

interface SheetRecord {
  id:     string;
  row_id: number;
  data:   Record<string, string>;
}

interface PTLSheetData {
  no_gsheet: boolean;
  columns:   string[];
  records:   SheetRecord[];
}

export default function PTLDashboardPanel() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sheetData, setSheetData]               = useState<PTLSheetData | null>(null);
  const [loading, setLoading]                   = useState(true);

  const { theme }             = useThemeStore();
  const { user }              = useAuthStore();
  const { setPage: setAppPage } = useAppStore();
  const { toasts, show: showToast } = useToast();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const fetchSheet = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<PTLSheetData>("/records/ptl-sheet");
      setSheetData(res.data);
    } catch {
      showToast("Gagal memuat data GSheet", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchSheet(); }, []);

  const handleRefresh = async () => {
    await fetchSheet();
    showToast("Data diperbarui", "success");
  };

  // ── No GSheet state ──────────────────────────────────────────────────────────
  if (!loading && sheetData?.no_gsheet) {
    return (
      <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-app)" }}>
        <Sidebar collapsed={sidebarCollapsed} onToast={showToast} />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Topbar onRefresh={handleRefresh} sidebarCollapsed={sidebarCollapsed} onToggleSidebar={() => setSidebarCollapsed(v => !v)} />
          <main className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-sm">
              <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                style={{ background: "var(--accent-soft)" }}>
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}
                  style={{ color: "var(--accent)" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-base font-bold mb-2" style={{ color: "var(--text-primary)" }}>
                GSheet belum dikonfigurasi
              </h2>
              <p className="text-sm mb-5" style={{ color: "var(--text-secondary)" }}>
                Isi URL GSheet dan nama sheet di halaman Profil untuk mulai menggunakan dashboard ini.
              </p>
              <button onClick={() => setAppPage("profile")}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: "var(--accent)" }}>
                Buka Profil
              </button>
            </div>
          </main>
        </div>
        <ToastContainer toasts={toasts} />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-app)" }}>
      <Sidebar collapsed={sidebarCollapsed} onToast={showToast} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar
          onRefresh={handleRefresh}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(v => !v)}
        />

        <main className="flex-1 overflow-hidden pb-16 md:pb-0">
          <PTLSummaryDashboard
            records={sheetData?.records ?? []}
            loading={loading}
          />
        </main>
      </div>

      <ToastContainer toasts={toasts} />
    </div>
  );
}
