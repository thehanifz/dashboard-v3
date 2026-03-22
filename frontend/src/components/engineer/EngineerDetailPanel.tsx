/**
 * EngineerDetailPanel.tsx
 * Panel "Detail Pekerjaan" untuk Engineer — kanban + tabel + preset.
 * Dipindah dari EngineerDashboardPanel (sebelumnya ada di DashboardPage).
 */
import { useCallback, useState } from "react";
import { useTaskStore }      from "../../state/taskStore";
import { useThemeStore }     from "../../state/themeStore";
import { useToast }          from "../../utils/useToast";
import KanbanBoard           from "../kanban/KanbanBoard";
import DynamicTable          from "../table/DynamicTable";
import Sidebar               from "../layout/Sidebar";
import Topbar                from "../layout/Topbar";
import ToastContainer        from "../ui/ToastContainer";

type DetailView = "kanban" | "table";

export default function EngineerDetailPanel() {
  const [view, setView]                         = useState<DetailView>("table");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { toasts, show: showToast }             = useToast();

  const refreshAll = useTaskStore((s) => s.refreshAll);
  const theme      = useThemeStore((s) => s.theme);

  const handleRefresh = useCallback(async () => {
    try {
      await refreshAll();
      showToast("Data berhasil diperbarui", "success");
    } catch {
      showToast("Gagal memuat data dari server", "error");
    }
  }, [refreshAll, showToast]);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-app)" }}>
      <Sidebar collapsed={sidebarCollapsed} onToast={showToast} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar
          onRefresh={handleRefresh}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
        />

        {/* Sub-view switcher */}
        <div className="flex items-center gap-1 px-4 pt-3 pb-0 shrink-0">
          {(["table", "kanban"] as DetailView[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: view === v ? "var(--accent)" : "var(--bg-surface)",
                color:      view === v ? "#fff" : "var(--text-secondary)",
                border:     view === v ? "none" : "1px solid var(--border)",
              }}
            >
              {v === "table" ? "Tabel" : "Kanban"}
            </button>
          ))}
        </div>

        <main className="flex-1 overflow-hidden pb-16 md:pb-0">
          {view === "kanban" && <div className="h-full overflow-hidden"><KanbanBoard /></div>}
          {view === "table"  && <div className="h-full p-4 overflow-hidden"><DynamicTable /></div>}
        </main>
      </div>

      <ToastContainer toasts={toasts} />
    </div>
  );
}
