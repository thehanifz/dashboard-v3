/**
 * PTLDashboardPanel.tsx
 * Panel utama dashboard PTL — baca dari GSheet milik PTL sendiri.
 * Edit sel → tulis ke GSheet PTL (bukan Engineer).
 * Sync engine yang akan push ke GSheet Engineer.
 *
 * Dipindah dari pages/PTLDashboardPage.tsx
 */
import { useEffect, useState, useMemo } from "react";
import { useThemeStore }  from "../../state/themeStore";
import { useAuthStore }   from "../../state/authStore";
import { useAppStore }    from "../../state/appStore";
import { useToast }       from "../../utils/useToast";
import Topbar             from "../layout/Topbar";
import Sidebar            from "../layout/Sidebar";
import ToastContainer     from "../ui/ToastContainer";
import api                from "../../services/api";

type DashView = "summary" | "kanban" | "table";
const DEFAULT_COL_WIDTH = 160;
const PAGE_SIZE = 20;

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
  const [view, setView]                         = useState<DashView>("table");
  const [search, setSearch]                     = useState("");
  const [page, setPage]                         = useState(1);
  const [sheetData, setSheetData]               = useState<PTLSheetData | null>(null);
  const [loading, setLoading]                   = useState(true);
  const [editingCell, setEditingCell]           = useState<{ rowId: number; col: string } | null>(null);
  const [editingValue, setEditingValue]         = useState("");
  const [saving, setSaving]                     = useState(false);

  const { theme }               = useThemeStore();
  const { user }                = useAuthStore();
  const { setPage: setAppPage } = useAppStore();
  const { toasts, show: showToast } = useToast();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const fetchSheet = async () => {
    try {
      setLoading(true);
      const res = await api.get<PTLSheetData>("/records/ptl-sheet");
      setSheetData(res.data);
    } catch {
      showToast("Gagal memuat data GSheet", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSheet(); }, []);

  const records = sheetData?.records ?? [];
  const columns = sheetData?.columns ?? [];

  const filteredRecords = useMemo(() => {
    if (!search.trim()) return records;
    const q = search.toLowerCase();
    return records.filter((r) =>
      Object.values(r.data ?? {}).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [records, search]);

  const totalPage    = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const pagedRecords = filteredRecords.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleCellClick = (rowId: number, col: string, val: string) => {
    setEditingCell({ rowId, col });
    setEditingValue(val ?? "");
  };

  const handleCellCommit = async (rowId: number, col: string) => {
    setEditingCell(null);
    setSaving(true);
    try {
      await api.post(`/records/ptl-sheet/${rowId}/cells`, {
        updates: { [col]: editingValue },
      });
      setSheetData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          records: prev.records.map((r) =>
            r.row_id === rowId
              ? { ...r, data: { ...r.data, [col]: editingValue } }
              : r
          ),
        };
      });
      showToast("Tersimpan", "success");
    } catch (err: any) {
      showToast(err?.response?.data?.detail ?? "Gagal menyimpan", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, rowId: number, col: string) => {
    if (e.key === "Enter")  handleCellCommit(rowId, col);
    if (e.key === "Escape") setEditingCell(null);
  };

  const handleRefresh = async () => {
    await fetchSheet();
    showToast("Data diperbarui", "success");
  };

  // ── No GSheet state ──────────────────────────────────────────────────────
  if (!loading && sheetData?.no_gsheet) {
    return (
      <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-app)" }}>
        <Sidebar view={view} onViewChange={setView} collapsed={sidebarCollapsed} onToast={showToast} />
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
      <Sidebar view={view} onViewChange={setView} collapsed={sidebarCollapsed} onToast={showToast} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar onRefresh={handleRefresh} sidebarCollapsed={sidebarCollapsed} onToggleSidebar={() => setSidebarCollapsed(v => !v)} />

        <main className="flex-1 overflow-hidden p-4 space-y-4">

          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                Dashboard PA
              </h1>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                {records.length} record · dari GSheet milik {user?.nama_lengkap}
                {saving && <span className="ml-2 text-amber-500">Menyimpan...</span>}
              </p>
            </div>
            <div className="relative">
              <svg className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                style={{ color: "var(--text-muted)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" placeholder="Cari data..." value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="th-input pl-8 pr-3 py-1.5 text-xs w-48" />
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="text-xs py-4" style={{ color: "var(--text-muted)" }}>Memuat data GSheet...</div>
          )}

          {/* Tabel */}
          {!loading && columns.length > 0 && (
            <div className="rounded-2xl border overflow-auto custom-scrollbar"
              style={{ background: "var(--bg-surface)", borderColor: "var(--border)", maxHeight: "calc(100vh - 240px)" }}>
              <table className="text-xs border-collapse" style={{ tableLayout: "fixed", width: "max-content", minWidth: "100%" }}>
                <thead className="sticky top-0 z-10 th-table-head">
                  <tr>
                    {columns.map((col) => (
                      <th key={col}
                        className="px-3 py-2.5 text-left font-semibold"
                        style={{ width: DEFAULT_COL_WIDTH, minWidth: DEFAULT_COL_WIDTH, borderBottom: "2px solid var(--border)" }}>
                        <span className="truncate block">{col}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedRecords.map((r, rowIdx) => (
                    <tr key={r.row_id} className="th-table-row"
                      style={{ background: rowIdx % 2 !== 0 ? "var(--table-row-alt)" : "var(--bg-surface)" }}>
                      {columns.map((col) => {
                        const isEditing = editingCell?.rowId === r.row_id && editingCell?.col === col;
                        const editable = col !== "ID PA";
                        return (
                          <td key={col}
                            className="px-3 py-2 border-r overflow-hidden"
                            style={{ borderColor: "var(--border)", maxWidth: DEFAULT_COL_WIDTH, cursor: editable ? "pointer" : "default" }}
                            title={isEditing ? undefined : r.data[col]}
                            onClick={() => !isEditing && editable && handleCellClick(r.row_id, col, r.data[col] ?? "")}
                          >
                            {isEditing ? (
                              <input autoFocus value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onBlur={() => handleCellCommit(r.row_id, col)}
                                onKeyDown={(e) => handleKeyDown(e, r.row_id, col)}
                                className="w-full text-xs px-1 py-0.5 rounded border outline-none"
                                style={{ background: "var(--bg-app)", color: "var(--text-primary)", borderColor: "var(--accent)", width: `${DEFAULT_COL_WIDTH - 24}px` }}
                              />
                            ) : (
                              <div className="truncate w-full block"
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

          {/* Empty */}
          {!loading && columns.length === 0 && (
            <div className="rounded-2xl border p-10 text-center"
              style={{ background: "var(--bg-surface)", borderColor: "var(--border)", borderStyle: "dashed" }}>
              <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>GSheet kosong atau tidak ada data</p>
            </div>
          )}

          {/* Pagination */}
          {filteredRecords.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-3 py-2 rounded-xl shrink-0"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                <b style={{ color: "var(--text-primary)" }}>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredRecords.length)}</b>
                {" "}dari <b style={{ color: "var(--text-primary)" }}>{filteredRecords.length}</b>
              </span>
              <div className="flex gap-1">
                <button disabled={page === 1} onClick={() => setPage(1)} className="btn-ghost px-2 py-1 text-xs disabled:opacity-30">«</button>
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-ghost px-2 py-1 text-xs disabled:opacity-30">‹</button>
                <span className="px-3 py-1 text-xs font-medium rounded-lg" style={{ background: "var(--accent)", color: "#fff" }}>{page}</span>
                <button disabled={page === totalPage} onClick={() => setPage(p => p + 1)} className="btn-ghost px-2 py-1 text-xs disabled:opacity-30">›</button>
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
