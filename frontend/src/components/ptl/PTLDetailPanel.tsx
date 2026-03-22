/**
 * PTLDetailPanel.tsx
 * Panel "Detail Pekerjaan" untuk PTL — setara dengan Engineer.
 * Fitur:
 * - Tab Kanban + Tabel
 * - Kanban: kolom dari Status Pekerjaan, drag → update GSheet PTL
 * - Tabel: preset kolom (Zustand), filter, resize, drag reorder
 * - Edit sel inline → simpan ke GSheet PTL
 * - Search + pagination
 * - Tombol BAI + Teskom
 */
import { useEffect, useState, useMemo, useCallback } from "react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { useThemeStore }      from "../../state/themeStore";
import { useAuthStore }       from "../../state/authStore";
import { useToast }           from "../../utils/useToast";
import { usePTLPresetStore }  from "../../state/ptlPresetStore";
import Sidebar                from "../layout/Sidebar";
import Topbar                 from "../layout/Topbar";
import ToastContainer         from "../ui/ToastContainer";
import PTLKanbanBoard         from "./PTLKanbanBoard";
import { TableHeaderCell }    from "../table/TableHeaderCell";
import PTLColumnFilter        from "./PTLColumnFilter";
import api                    from "../../services/api";
import baiApi                 from "../../services/baiApi";
import { useAppStore }        from "../../state/appStore";

// ─── Types ────────────────────────────────────────────────────────────────────
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

type DetailView = "kanban" | "table";
const DEFAULT_COL_WIDTH = 160;
const MIN_COL_WIDTH     = 60;
const PAGE_SIZE         = 20;

// ─── BAI Button ───────────────────────────────────────────────────────────────
function PtlBaiButton({ rowId, idPa, namaPerusahaan, onToast }: {
  rowId: number; idPa: string; namaPerusahaan: string;
  onToast: (msg: string, type?: "success" | "error") => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const today = new Date().toISOString().split("T")[0];
  const [tanggal, setTanggal]     = useState(today);
  const [loading, setLoading]     = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const blob = await baiApi.generateBaiPtl(rowId, tanggal);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url; a.download = `BAI_${idPa.replace(/\//g, "-")}.docx`; a.click();
      URL.revokeObjectURL(url);
      onToast(`BAI ${idPa} berhasil digenerate!`, "success");
      setShowModal(false);
    } catch (err: any) {
      if (err?.response?.data instanceof Blob) {
        const text = await err.response.data.text();
        try { onToast(JSON.parse(text).detail || "Gagal generate BAI", "error"); } catch { onToast("Gagal generate BAI", "error"); }
      } else {
        onToast(err?.response?.data?.detail || "Gagal generate BAI", "error");
      }
    } finally { setLoading(false); }
  };

  return (
    <>
      <button onClick={(e) => { e.stopPropagation(); setShowModal(true); }}
        title={`Generate BAI — ${idPa}`}
        className="flex items-center justify-center w-6 h-6 rounded-md transition-all"
        style={{ color: "var(--text-muted)" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--accent-soft)"; (e.currentTarget as HTMLElement).style.color = "var(--accent)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </button>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--accent-soft)" }}>
                <svg className="w-5 h-5" style={{ color: "var(--accent)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Generate BAI</h3>
                <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{namaPerusahaan || idPa}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="ml-auto shrink-0 p-1 rounded-lg"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-surface2)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-3 py-2.5 rounded-lg mb-4 text-xs" style={{ background: "var(--bg-surface2)", border: "1px solid var(--border)" }}>
              <span style={{ color: "var(--text-muted)" }}>No. PA: </span>
              <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{idPa}</span>
            </div>
            <div className="mb-5">
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Tanggal BAI <span className="font-normal" style={{ color: "var(--text-muted)" }}>(default hari ini)</span>
              </label>
              <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm border"
                style={{ background: "var(--bg-surface2)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none" }}
                onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowModal(false)} disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: "var(--bg-surface2)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>Batal</button>
              <button onClick={handleGenerate} disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
                style={{ background: "var(--accent)", opacity: loading ? 0.7 : 1 }}>
                {loading ? <><span className="spinner" /> Membuat...</> : <>Ya, Generate</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Teskom Button ────────────────────────────────────────────────────────────
function PtlTeskomButton({ idPa }: { idPa: string }) {
  const setPage           = useAppStore(s => s.setPage);
  const setTeskomAutofill = useAppStore(s => s.setTeskomAutofill);
  return (
    <button onClick={(e) => { e.stopPropagation(); if (!idPa) return; setTeskomAutofill(idPa); setPage("teskom"); }}
      title={`Buka Teskom — ${idPa}`}
      className="flex items-center justify-center w-6 h-6 rounded-md transition-all"
      style={{ color: "var(--text-muted)" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--accent-soft)"; (e.currentTarget as HTMLElement).style.color = "var(--accent)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}>
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    </button>
  );
}

// ─── Preset Editor Modal ──────────────────────────────────────────────────────
function PTLPresetModal({ allCols, records, onClose }: {
  allCols: string[]; records: SheetRecord[]; onClose: () => void;
}) {
  const { presets, addPreset, deletePreset, setActivePreset, updatePresetColumns, renamePreset } = usePTLPresetStore();
  const [tab, setTab]         = useState<"manage" | "create">("manage");
  const [newName, setNewName] = useState("");
  const [selected, setSelected] = useState<string[]>(allCols);

  const toggleCol = (col: string) =>
    setSelected(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);

  const handleSave = () => {
    if (!newName.trim() || selected.length === 0) return;
    addPreset(newName.trim(), selected);
    setNewName("");
    setTab("manage");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
        <div className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}>
          <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Preset Kolom</h3>
          <button onClick={onClose} className="p-1 rounded-lg" style={{ color: "var(--text-muted)" }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-surface2)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex gap-1 px-5 pt-3 shrink-0">
          {(["manage", "create"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{ background: tab === t ? "var(--accent)" : "var(--bg-surface2)", color: tab === t ? "#fff" : "var(--text-secondary)" }}>
              {t === "manage" ? "Kelola Preset" : "Buat Preset"}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 custom-scrollbar">
          {tab === "manage" ? (
            <div className="space-y-2">
              {presets.length === 0 && (
                <p className="text-xs text-center py-6" style={{ color: "var(--text-muted)" }}>Belum ada preset.</p>
              )}
              {presets.map(p => (
                <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{ background: "var(--bg-surface2)", border: "1px solid var(--border)" }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>{p.name}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{p.columns.length} kolom</p>
                  </div>
                  <button onClick={() => { setActivePreset(p.id); onClose(); }}
                    className="px-3 py-1 rounded-lg text-xs font-semibold text-white shrink-0"
                    style={{ background: "var(--accent)" }}>Pakai</button>
                  <button onClick={() => deletePreset(p.id)}
                    className="p-1.5 rounded-lg shrink-0 transition-colors"
                    style={{ color: "var(--text-muted)" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#ef4444"; (e.currentTarget as HTMLElement).style.background = "#ef444422"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="mb-4">
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Nama Preset</label>
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="mis. Preset Utama"
                  className="w-full px-3 py-2 rounded-lg text-sm border"
                  style={{ background: "var(--bg-surface2)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none" }}
                  onFocus={e => e.target.style.borderColor = "var(--accent)"}
                  onBlur={e => e.target.style.borderColor = "var(--border)"} />
              </div>
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                    Pilih Kolom ({selected.length}/{allCols.length})
                  </label>
                  <div className="flex gap-1.5">
                    <button onClick={() => setSelected([...allCols])}
                      className="text-[10px] px-2 py-0.5 rounded" style={{ color: "var(--accent)", background: "var(--accent-soft)" }}>Semua</button>
                    <button onClick={() => setSelected([])}
                      className="text-[10px] px-2 py-0.5 rounded" style={{ color: "var(--text-muted)", background: "var(--bg-surface2)" }}>Hapus</button>
                  </div>
                </div>
                <div className="space-y-1 max-h-52 overflow-y-auto custom-scrollbar">
                  {allCols.map(col => (
                    <label key={col} className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer"
                      style={{ background: selected.includes(col) ? "var(--accent-soft)" : "transparent" }}>
                      <input type="checkbox" checked={selected.includes(col)} onChange={() => toggleCol(col)} className="rounded" />
                      <span className="text-xs truncate" style={{ color: "var(--text-primary)" }}>{col}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button onClick={handleSave} disabled={!newName.trim() || selected.length === 0}
                className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: "var(--accent)", opacity: !newName.trim() || selected.length === 0 ? 0.5 : 1 }}>
                Simpan Preset
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────
export default function PTLDetailPanel() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [view, setView]                         = useState<DetailView>("table");
  const [sheetData, setSheetData]               = useState<PTLSheetData | null>(null);
  const [loading, setLoading]                   = useState(true);
  const [search, setSearch]                     = useState("");
  const [tablePage, setTablePage]               = useState(1);
  const [editingCell, setEditingCell]           = useState<{ rowId: number; col: string } | null>(null);
  const [editingValue, setEditingValue]         = useState("");
  const [saving, setSaving]                     = useState(false);
  const [showPreset, setShowPreset]             = useState(false);
  const [activeFilters, setActiveFilters]       = useState<Record<string, string[]>>({});
  const [activeFilterCol, setActiveFilterCol]   = useState<string | null>(null);
  const [filterPos, setFilterPos]               = useState({ top: 0, left: 0 });
  const [presetDropdownOpen, setPresetDropdown] = useState(false);

  const { theme }             = useThemeStore();
  const { user }              = useAuthStore();
  const { toasts, show: showToast } = useToast();

  const {
    presets, activePresetId, setActivePreset, addPreset, reorderColumns, updatePreset,
  } = usePTLPresetStore();
  const activePreset = presets.find(p => p.id === activePresetId);

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

  const allColumns  = sheetData?.columns ?? [];
  const records     = sheetData?.records ?? [];
  const columns     = activePreset?.columns ?? allColumns;
  const widths      = activePreset?.widths ?? {};
  const idPaCol     = allColumns.find(c => c === "ID PA") ?? "ID PA";
  const namaCol     = allColumns.find(c => c.toLowerCase().includes("perusahaan")) ?? "";

  // Update cell → GSheet PTL
  const handleUpdateCell = useCallback(async (rowId: number, col: string, value: string) => {
    setSaving(true);
    try {
      await api.post(`/records/ptl-sheet/${rowId}/cells`, { updates: { [col]: value } });
      setSheetData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          records: prev.records.map(r =>
            r.row_id === rowId ? { ...r, data: { ...r.data, [col]: value } } : r
          ),
        };
      });
      showToast("Tersimpan", "success");
    } catch (err: any) {
      showToast(err?.response?.data?.detail ?? "Gagal menyimpan", "error");
    } finally {
      setSaving(false);
    }
  }, [showToast]);

  const handleCellClick = (rowId: number, col: string, val: string) => {
    setEditingCell({ rowId, col });
    setEditingValue(val ?? "");
  };

  const handleCellCommit = async (rowId: number, col: string) => {
    setEditingCell(null);
    await handleUpdateCell(rowId, col, editingValue);
  };

  const handleRefresh = async () => { await fetchSheet(); showToast("Data diperbarui", "success"); };

  // Filter + search
  const filteredRecords = useMemo(() => {
    let result = [...records];
    if (Object.keys(activeFilters).length > 0) {
      result = result.filter(r =>
        Object.entries(activeFilters).every(([key, vals]) => vals.includes(String(r.data[key] || "")))
      );
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(r => Object.values(r.data ?? {}).some(v => String(v).toLowerCase().includes(q)));
    }
    return result;
  }, [records, search, activeFilters]);

  const totalPage    = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const pagedRecords = filteredRecords.slice((tablePage - 1) * PAGE_SIZE, tablePage * PAGE_SIZE);
  const filterCount  = Object.keys(activeFilters).length;

  // Toggle filter
  const toggleFilter = (key: string, val: string) => {
    setActiveFilters(prev => {
      const cur = prev[key] || [];
      const next = cur.includes(val) ? cur.filter(v => v !== val) : [...cur, val];
      const updated = { ...prev };
      if (next.length === 0) delete updated[key]; else updated[key] = next;
      return updated;
    });
  };

  // Drag reorder kolom (tabel)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (activePresetId && over && active.id !== over.id) {
      const oi = columns.indexOf(active.id as string);
      const ni = columns.indexOf(over.id as string);
      reorderColumns(activePresetId, arrayMove(columns, oi, ni));
    }
  };

  // Resize kolom
  const draggingRef = { current: null as any };
  const onColResize = (e: React.MouseEvent, col: string) => {
    e.preventDefault(); e.stopPropagation();
    const startX = e.clientX;
    const startW = widths[col] ?? DEFAULT_COL_WIDTH;
    const ghost  = document.createElement("div");
    Object.assign(ghost.style, { position: "fixed", top: "0", bottom: "0", width: "2px", background: "#2563eb", zIndex: "99999", left: `${e.clientX}px`, pointerEvents: "none" });
    document.body.appendChild(ghost);
    const onMove = (ev: MouseEvent) => { ghost.style.left = `${ev.clientX}px`; };
    const onUp   = (ev: MouseEvent) => {
      document.body.removeChild(ghost);
      const newW = Math.max(MIN_COL_WIDTH, startW + (ev.clientX - startX));
      if (activePresetId) updatePreset(activePresetId, { widths: { ...widths, [col]: newW } });
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const onColAutoFit = (e: React.MouseEvent, col: string) => {
    e.stopPropagation();
    if (!activePresetId) return;
    const canvas = document.createElement("canvas");
    const ctx    = canvas.getContext("2d")!;
    ctx.font     = "bold 12px sans-serif";
    let max      = ctx.measureText(col).width + 40;
    ctx.font     = "12px sans-serif";
    records.forEach(r => { const w = ctx.measureText(String(r.data[col] || "")).width; if (w > max) max = w; });
    updatePreset(activePresetId, { widths: { ...widths, [col]: Math.min(600, max + 24) } });
  };

  const handleOpenFilter = (e: React.MouseEvent, col: string) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setFilterPos({ top: rect.bottom + 5, left: rect.left });
    setActiveFilterCol(prev => prev === col ? null : col);
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-app)" }}>
      <Sidebar collapsed={sidebarCollapsed} onToast={showToast} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar onRefresh={handleRefresh} sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(v => !v)} />

        <main className="flex-1 overflow-hidden flex flex-col">

          {/* Header + Tab */}
          <div className="px-4 pt-3 pb-0 shrink-0 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h1 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Detail Pekerjaan</h1>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                {records.length} record · {user?.nama_lengkap}
                {saving && <span className="ml-2 text-amber-500">Menyimpan...</span>}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {(["table", "kanban"] as DetailView[]).map(v => (
                <button key={v} onClick={() => setView(v)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: view === v ? "var(--accent)" : "var(--bg-surface)",
                    color: view === v ? "#fff" : "var(--text-secondary)",
                    border: view === v ? "none" : "1px solid var(--border)",
                  }}>
                  {v === "table" ? "Tabel" : "Kanban"}
                </button>
              ))}
            </div>
          </div>

          {/* ── KANBAN VIEW ── */}
          {view === "kanban" && (
            <div className="flex-1 overflow-hidden">
              {loading ? (
                <div className="p-6 text-xs" style={{ color: "var(--text-muted)" }}>Memuat data...</div>
              ) : (
                <PTLKanbanBoard records={records} onUpdateCell={handleUpdateCell} />
              )}
            </div>
          )}

          {/* ── TABLE VIEW ── */}
          {view === "table" && (
            <div className="flex-1 overflow-hidden flex flex-col p-4 gap-3">

              {/* Toolbar tabel */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {/* Search */}
                <div className="relative">
                  <svg className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: "var(--text-muted)" }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input type="text" placeholder="Cari data..." value={search}
                    onChange={e => { setSearch(e.target.value); setTablePage(1); }}
                    className="th-input pl-8 pr-3 py-1.5 text-xs w-48" />
                </div>

                {/* Filter badge */}
                {filterCount > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs px-2.5 py-1.5 rounded-lg font-medium flex items-center gap-1.5"
                      style={{ background: "var(--accent-soft)", color: "var(--accent)", border: "1px solid var(--accent)" }}>
                      {filterCount} filter aktif
                    </span>
                    <button onClick={() => setActiveFilters({})}
                      className="text-xs px-2 py-1.5 rounded-lg"
                      style={{ color: "var(--text-muted)", background: "var(--bg-surface2)", border: "1px solid var(--border)" }}>
                      Reset
                    </button>
                  </div>
                )}

                <div className="ml-auto text-[11px]" style={{ color: "var(--text-muted)" }}>
                  {filteredRecords.length} / {records.length} baris
                </div>
              </div>

              {/* Preset dropdown */}
              <div className="flex items-center gap-2 shrink-0 relative">
                <div className="relative">
                  <button onClick={() => setPresetDropdown(v => !v)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border"
                    style={{ background: "var(--bg-surface)", color: "var(--text-primary)", borderColor: "var(--border)", minWidth: "180px", justifyContent: "space-between" }}>
                    <span className="truncate max-w-[150px]">{activePreset ? activePreset.name : "Pilih Preset"}</span>
                    <svg className={`w-4 h-4 transition-transform ${presetDropdownOpen ? "rotate-180" : ""}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {presetDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setPresetDropdown(false)} />
                      <div className="absolute top-full left-0 mt-1 w-full rounded-lg shadow-xl border z-20 overflow-hidden"
                        style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
                        <div className="max-h-48 overflow-y-auto custom-scrollbar py-1">
                          {presets.map(p => (
                            <button key={p.id} onClick={() => { setActivePreset(p.id); setPresetDropdown(false); }}
                              className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2">
                              {p.id === activePresetId && (
                                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20" style={{ color: "var(--accent)" }}>
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                              <span className={p.id === activePresetId ? "font-semibold" : ""} style={{ color: "var(--text-primary)" }}>{p.name}</span>
                            </button>
                          ))}
                        </div>
                        <div className="border-t py-1" style={{ borderColor: "var(--border)" }}>
                          <button onClick={() => { setPresetDropdown(false); setShowPreset(true); }}
                            className="w-full text-left px-3 py-2 text-xs flex items-center gap-2"
                            style={{ color: "var(--text-secondary)" }}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            Kelola Preset
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Tabel */}
              {!activePreset ? (
                <div className="flex-1 flex flex-col items-center justify-center rounded-2xl"
                  style={{ background: "var(--bg-surface)", border: "2px dashed var(--border)" }}>
                  <p className="text-sm font-medium mb-3" style={{ color: "var(--text-secondary)" }}>Belum ada preset kolom</p>
                  <button onClick={() => setShowPreset(true)}
                    className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
                    style={{ background: "var(--accent)" }}>+ Buat Preset</button>
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-auto rounded-2xl custom-scrollbar" style={{ border: "1px solid var(--border)" }}>
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <table className="text-xs border-collapse" style={{ tableLayout: "fixed", width: "max-content" }}>
                        <thead className="sticky top-0 z-10 th-table-head">
                          <tr>
                            <th className="sticky left-0 z-20 th-table-head"
                              style={{ width: 72, minWidth: 72, padding: "10px 8px", borderBottom: "2px solid var(--border)", textAlign: "center" }}>
                              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Aksi</span>
                            </th>
                            <SortableContext items={columns} strategy={horizontalListSortingStrategy}>
                              {columns.map(col => (
                                <TableHeaderCell key={col} column={col}
                                  width={widths[col] ?? DEFAULT_COL_WIDTH}
                                  minWidth={MIN_COL_WIDTH}
                                  onResize={onColResize}
                                  onAutoFit={onColAutoFit}
                                  onFilter={handleOpenFilter}
                                  isFiltered={(activeFilters[col]?.length ?? 0) > 0}
                                />
                              ))}
                            </SortableContext>
                          </tr>
                        </thead>
                        <tbody>
                          {pagedRecords.map((r, rowIdx) => {
                            const idPaVal = r.data[idPaCol] ?? "";
                            const namaVal = namaCol ? (r.data[namaCol] ?? "") : "";
                            return (
                              <tr key={r.row_id} className="th-table-row"
                                style={{ background: rowIdx % 2 !== 0 ? "var(--table-row-alt)" : "var(--bg-surface)" }}>
                                <td className="sticky left-0 z-10 border-r"
                                  style={{ width: 72, minWidth: 72, padding: "4px 8px", textAlign: "center", borderColor: "var(--border)", background: rowIdx % 2 !== 0 ? "var(--table-row-alt)" : "var(--bg-surface)" }}>
                                  <div className="flex items-center justify-center gap-0.5">
                                    <PtlBaiButton rowId={r.row_id} idPa={idPaVal} namaPerusahaan={namaVal} onToast={showToast} />
                                    <PtlTeskomButton idPa={idPaVal} />
                                  </div>
                                </td>
                                {columns.map(col => {
                                  const colWidth  = widths[col] ?? DEFAULT_COL_WIDTH;
                                  const isEditing = editingCell?.rowId === r.row_id && editingCell?.col === col;
                                  const editable  = col !== idPaCol;
                                  return (
                                    <td key={col} className="px-3 py-2 border-r overflow-hidden"
                                      style={{ borderColor: "var(--border)", maxWidth: colWidth, cursor: editable ? "pointer" : "default" }}
                                      title={isEditing ? undefined : r.data[col]}
                                      onClick={() => !isEditing && editable && handleCellClick(r.row_id, col, r.data[col] ?? "")}>
                                      {isEditing ? (
                                        <input autoFocus value={editingValue}
                                          onChange={e => setEditingValue(e.target.value)}
                                          onBlur={() => handleCellCommit(r.row_id, col)}
                                          onKeyDown={e => {
                                            if (e.key === "Enter") handleCellCommit(r.row_id, col);
                                            if (e.key === "Escape") setEditingCell(null);
                                          }}
                                          className="w-full text-xs px-1 py-0.5 rounded border outline-none"
                                          style={{ background: "var(--bg-app)", color: "var(--text-primary)", borderColor: "var(--accent)", width: `${colWidth - 24}px` }}
                                        />
                                      ) : (
                                        <div className="truncate w-full block" style={{ maxWidth: `${colWidth - 24}px` }}
                                          onMouseEnter={e => { if (editable) (e.currentTarget as HTMLElement).style.outline = "1px dashed var(--accent)"; }}
                                          onMouseLeave={e => { if (editable) (e.currentTarget as HTMLElement).style.outline = "none"; }}>
                                          {r.data[col] ?? ""}
                                        </div>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </DndContext>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between px-3 py-2 rounded-xl shrink-0"
                    style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      <b style={{ color: "var(--text-primary)" }}>{(tablePage - 1) * PAGE_SIZE + 1}–{Math.min(tablePage * PAGE_SIZE, filteredRecords.length)}</b>
                      {" "}dari <b style={{ color: "var(--text-primary)" }}>{filteredRecords.length}</b>
                    </span>
                    <div className="flex gap-1">
                      <button disabled={tablePage === 1} onClick={() => setTablePage(1)} className="btn-ghost px-2 py-1 text-xs disabled:opacity-30">«</button>
                      <button disabled={tablePage === 1} onClick={() => setTablePage(p => p - 1)} className="btn-ghost px-2 py-1 text-xs disabled:opacity-30">‹</button>
                      <span className="px-3 py-1 text-xs font-medium rounded-lg" style={{ background: "var(--accent)", color: "#fff" }}>{tablePage}</span>
                      <button disabled={tablePage === totalPage} onClick={() => setTablePage(p => p + 1)} className="btn-ghost px-2 py-1 text-xs disabled:opacity-30">›</button>
                      <button disabled={tablePage === totalPage} onClick={() => setTablePage(totalPage)} className="btn-ghost px-2 py-1 text-xs disabled:opacity-30">»</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </main>
      </div>

      <ToastContainer toasts={toasts} />

      {/* Column filter popup */}
      {activeFilterCol && (
        <PTLColumnFilter
          column={activeFilterCol}
          records={records}
          activeFilters={activeFilters}
          onToggle={toggleFilter}
          onClose={() => setActiveFilterCol(null)}
          position={filterPos}
        />
      )}

      {/* Preset modal */}
      {showPreset && (
        <PTLPresetModal allCols={allColumns} records={records} onClose={() => setShowPreset(false)} />
      )}
    </div>
  );
}