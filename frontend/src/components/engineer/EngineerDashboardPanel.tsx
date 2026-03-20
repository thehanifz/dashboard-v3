/**
 * EngineerDashboardPanel.tsx
 * Panel dashboard Engineer — summary, kanban, dan tabel data utama.
 *
 * Dipindah dari pages/DashboardPage.tsx
 */
import { useEffect, useCallback, useState } from "react";
import { useTaskStore }      from "../../state/taskStore";
import { useThemeStore }     from "../../state/themeStore";
import { useToast }          from "../../utils/useToast";
import KanbanBoard           from "../kanban/KanbanBoard";
import DynamicTable          from "../table/DynamicTable";
import SummaryDashboard      from "../dashboard/SummaryDashboard";
import Sidebar               from "../layout/Sidebar";
import Topbar                from "../layout/Topbar";
import ToastContainer        from "../ui/ToastContainer";

type View = "summary" | "kanban" | "table";

export default function EngineerDashboardPanel() {
  const [view, setView]                         = useState<View>("summary");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { toasts, show: showToast }             = useToast();

  const refreshAll = useTaskStore((s) => s.refreshAll);
  const theme      = useThemeStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const handleRefresh = useCallback(async () => {
    try {
      await refreshAll();
      showToast("Data berhasil diperbarui", "success");
    } catch {
      showToast("Gagal memuat data dari server", "error");
    }
  }, [refreshAll, showToast]);

  useEffect(() => { handleRefresh(); }, []);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-app)" }}>
      <Sidebar
        view={view}
        onViewChange={setView}
        collapsed={sidebarCollapsed}
        onToast={showToast}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar
          onRefresh={handleRefresh}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
        />

        <main className="flex-1 overflow-hidden pb-16 md:pb-0">
          {view === "summary" && <SummaryDashboard />}
          {view === "kanban"  && <div className="h-full overflow-hidden"><KanbanBoard /></div>}
          {view === "table"   && <div className="h-full p-4 overflow-hidden"><DynamicTable /></div>}
        </main>
      </div>

      <ToastContainer toasts={toasts} />
    </div>
  );
}
