/**
 * MitraDashboardPanel.tsx
 * Panel dashboard Mitra:
 * - Fetch role_table_config dari Engineer
 * - Tampilkan tabel sesuai visible_columns
 * - Inline edit hanya untuk editable_columns
 *
 * Dipindah dari pages/MitraDashboardPage.tsx
 */
import { useEffect, useState, useMemo } from "react";
import { useTaskStore }        from "../../state/taskStore";
import { useThemeStore }       from "../../state/themeStore";
import { useMitraConfigStore } from "../../state/mitraConfigStore";
import { useToast }            from "../../utils/useToast";
import Topbar          from "../layout/Topbar";
import Sidebar         from "../layout/Sidebar";
import ToastContainer  from "../ui/ToastContainer";

type DashView = "summary" | "kanban" | "table";
const DEFAULT_COL_WIDTH = 150;

export default function MitraDashboardPanel() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [view, setView]                         = useState<DashView>("table");
  const [search, setSearch]                     = useState("");
  const [editingCell, setEditingCell]           = useState<{ rowId: number; col: string } | null>(null);
  const [editingValue, setEditingValue]         = useState("");
  const [page, setPage]                         = useState(1);
  const PAGE_SIZE                               = 20;

  const { toasts, show: showToast } = useToast();
  const { theme }                   = useThemeStore();
  const refreshAll                  = useTaskStore((s) => s.refreshAll);
  const records                     = useTaskStore((s) => s.records) ?? [];
  const updateCell                  = useTaskStore((s) => s.updateCell);
  const isLoading                   = useTaskStore((s) => s.isLoading);

  const {
    visibleColumns,
    editableColumns,
    loaded,
    loading: configLoading,
    fetchConfig,
  } = useMitraConfigStore();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    fetchConfig();
    refreshAll().catch(() => showToast("Gagal memuat data", "error"));
  }, []);

  const filteredRecords = useMemo(() => {
    if (!search.trim()) return records;
    const q = search.toLowerCase();
    return records.filter((r) =>
      Object.values(r.data ?? {}).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [records, search]);

  const totalPage    = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const pagedRecords = filteredRecords.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const canEdit = (col: string) => editableColumns.includes(col);

  const handleCellClick = (rowId: number, col: string, val: string) => {
    if (!canEdit(col)) return;
    setEditingCell({ rowId, col });
    setEditingValue(val ?? "");
  };

  const handleCellCommit = async (rowId: number, col: string) => {
    setEditingCell(null);
    try {
      await updateCell(rowId, col, editingValue);
      showToast("Data berhasil disimpan", "success");
    } catch {
      showToast("Gagal menyimpan data", "error");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, rowId: number, col: string) => {
    if (e.key === "Enter") handleCellCommit(rowId, col);
    if (e.key === "Escape") setEditingCell(null);
  };

  const handleRefresh = async () => {
    try {
      await refreshAll();
      showToast("Data berhasil diperbarui", "success");
    } catch {
      showToast("Gagal memuat data", "error");
    }
  };

  const displayColumns = visibleColumns.length > 0
    ? visibleColumns
    : records[0] ? Object.keys(records[0].data) : [];

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-app)" }}>
      <Sidebar view={view} onViewChange={setView} collapsed={sidebarCollapsed} onToast={showToast} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar
          onRefresh={handleRefresh}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
        />

        <main className="flex-1 overflow-hidden p-4 space-y-4">

          {/* Header info */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                Dashboard Pekerjaan
              </h1>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                {records.length} pekerjaan · {editableColumns.length} kolom bisa diedit
              </p>
            </div>
            <div className="relative">
              <svg className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                style={{ color: "var(--text-muted)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Cari data..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="th-input pl-8 pr-3 py-1.5 text-xs w-48"
              />
            </div>
          </div>

          {/* Loading */}
          {(configLoading || isLoading) && (
            <div className="text-xs py-2" style={{ color: "var(--text-muted)" }}>
              Memuat data...
            </div>
          )}

          {/* Keterangan editable columns */}
          {loaded && editableColumns.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>Kolom yang bisa diedit:</span>
              {editableColumns.map((col) => (
                <span key={col} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ background: "var(--accent-soft)", color: "var(--accent)", border: "1px solid var(--accent)" }}>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  {col}
                </span>
              ))}
            </div>
          )}

          {/* Tabel */}
          {loaded && displayColumns.length > 0 && (
            <div className="rounded-2xl border overflow-auto custom-scrollbar"
              style={{ background: "var(--bg-surface)", borderColor: "var(--border)", maxHeight: "calc(100vh - 260px)" }}>
              <table className="text-xs border-collapse" style={{ tableLayout: "fixed", width: "max-content", minWidth: "100%" }}>
                <thead className="sticky top-0 z-10 th-table-head">
                  <tr>
                    {displayColumns.map((col) => (
                      <th key={col}
                        className="px-3 py-2.5 text-left font-semibold"
                        style={{
                          width: DEFAULT_COL_WIDTH,
                          minWidth: DEFAULT_COL_WIDTH,
                          borderBottom: "2px solid var(--border)",
                          color: editableColumns.includes(col) ? "var(--accent)" : "var(--text-muted)",
                        }}>
                        <div className="flex items-center gap-1.5 truncate">
                          {editableColumns.includes(col) && (
                            <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          )}
                          <span className="truncate">{col}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedRecords.map((r, rowIdx) => (
                    <tr key={r.row_id}
                      className="th-table-row"
                      style={{ background: rowIdx % 2 !== 0 ? "var(--table-row-alt)" : "var(--bg-surface)" }}>
                      {displayColumns.map((col) => {
                        const isEditing = editingCell?.rowId === r.row_id && editingCell?.col === col;
                        const editable  = canEdit(col);
                        return (
                          <td key={col}
                            className="px-3 py-2 border-r overflow-hidden"
                            style={{
                              borderColor: "var(--border)",
                              maxWidth: DEFAULT_COL_WIDTH,
                              cursor: editable ? "pointer" : "default",
                            }}
                            title={isEditing ? undefined : r.data[col]}
                            onClick={() => !isEditing && handleCellClick(r.row_id, col, r.data[col] ?? "")}
                          >
                            {isEditing ? (
                              <input
                                autoFocus
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onBlur={() => handleCellCommit(r.row_id, col)}
                                onKeyDown={(e) => handleKeyDown(e, r.row_id, col)}
                                className="w-full text-xs px-1 py-0.5 rounded border outline-none"
                                style={{
                                  background: "var(--bg-app)",
                                  color: "var(--text-primary)",
                                  borderColor: "var(--accent)",
                                  width: `${DEFAULT_COL_WIDTH - 24}px`,
                                }}
                              />
                            ) : (
                              <div
                                className="truncate w-full block"
                                style={{ maxWidth: `${DEFAULT_COL_WIDTH - 24}px` }}
                                onMouseEnter={(e) => { if (editable) (e.currentTarget as HTMLElement).style.outline = "1px dashed var(--accent)"; }}
                                onMouseLeave={(e) => { if (editable) (e.currentTarget as HTMLElement).style.outline = "none"; }}
                              >
                                {r.data[col] ?? ""}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Empty state */}
          {loaded && displayColumns.length === 0 && !configLoading && (
            <div className="rounded-2xl border p-10 text-center"
              style={{ background: "var(--bg-surface)", borderColor: "var(--border)", borderStyle: "dashed" }}>
              <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                Belum ada konfigurasi tabel
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                Hubungi Engineer untuk mengatur kolom yang tampil
              </p>
            </div>
          )}

          {/* Pagination */}
          {filteredRecords.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-3 py-2 rounded-xl shrink-0"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                <b style={{ color: "var(--text-primary)" }}>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredRecords.length)}</b> dari <b style={{ color: "var(--text-primary)" }}>{filteredRecords.length}</b>
              </span>
              <div className="flex gap-1">
                <button disabled={page === 1} onClick={() => setPage(1)} className="btn-ghost px-2 py-1 text-xs disabled:opacity-30">«</button>
                <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="btn-ghost px-2 py-1 text-xs disabled:opacity-30">‹</button>
                <span className="px-3 py-1 text-xs font-medium rounded-lg" style={{ background: "var(--accent)", color: "#fff" }}>{page}</span>
                <button disabled={page === totalPage} onClick={() => setPage((p) => p + 1)} className="btn-ghost px-2 py-1 text-xs disabled:opacity-30">›</button>
                <button disabled={page === totalPage} onClick={() => setPage(totalPage)} className="btn-ghost px-2 py-1 text-xs disabled:opacity-30">»</button>
              </div>
            </div>
          )}

        </main>
      </div>

      <ToastContainer toasts={toasts} />
    </div>
  );
}
