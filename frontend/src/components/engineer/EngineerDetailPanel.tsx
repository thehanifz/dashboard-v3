/**
 * EngineerDetailPanel.tsx
 * Panel "Detail Pekerjaan" untuk Engineer.
 * DynamicTable selalu dirender agar TableToolbar tetap tampil.
 * Saat view=kanban, DynamicTable hanya render toolbar (toolbarOnly=true),
 * KanbanBoard dirender di bawahnya dalam flex layout.
 */
import { useCallback, useState } from "react";
import { useTaskStore }  from "../../state/taskStore";
import { useThemeStore } from "../../state/themeStore";
import { useToast }      from "../../utils/useToast";
import KanbanBoard       from "../kanban/KanbanBoard";
import DynamicTable      from "../table/DynamicTable";
import Sidebar           from "../layout/Sidebar";
import Topbar            from "../layout/Topbar";
import ToastContainer    from "../ui/ToastContainer";

type DetailView = "kanban" | "table";

export default function EngineerDetailPanel() {
  const [view, setView]                         = useState<DetailView>("table");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { toasts, show: showToast }             = useToast();

  const refreshAll = useTaskStore((s) => s.refreshAll);

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

        <main className="flex-1 overflow-hidden flex flex-col">
          {view === "table" ? (
            /* Tabel — DynamicTable full dengan toolbar + body */
            <div className="flex-1 overflow-hidden">
              <DynamicTable view={view} onViewChange={setView} />
            </div>
          ) : (
            /* Kanban — toolbar dari DynamicTable (toolbarOnly) + KanbanBoard */
            <div className="flex-1 overflow-hidden flex flex-col">
              <DynamicTable view={view} onViewChange={setView} toolbarOnly />
              <div className="flex-1 overflow-hidden">
                <KanbanBoard />
              </div>
            </div>
          )}
        </main>
      </div>

      <ToastContainer toasts={toasts} />
    </div>
  );
}
