/**
 * PTLDetailPanel.tsx
 * Panel "Detail Pekerjaan" untuk PTL — setara dengan Engineer.
 * Preset kolom sekarang disimpan di DB via usePresets("ptl").
 * activePresetId tetap di localStorage (useActivePresetStore).
 */
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { useThemeStore }     from "../../state/themeStore";
import { useAuthStore }      from "../../state/authStore";
import { useToast }          from "../../utils/useToast";
import { usePresets }        from "../../hooks/usePresets";
import { useAppearanceStore } from "../../state/appearanceStore";
import Sidebar               from "../layout/Sidebar";
import Topbar                from "../layout/Topbar";
import ToastContainer        from "../ui/ToastContainer";
import PTLKanbanBoard        from "./PTLKanbanBoard";
import PTLColumnFilter       from "./PTLColumnFilter";
import PresetEditorModal     from "../preset/PresetEditorModal";
import EditableColumnsModal  from "../table/EditableColumnsModal";
import { TableHeaderCell }   from "../table/TableHeaderCell";
import api                   from "../../services/api";
import baiApi                from "../../services/baiApi";
import { useAppStore }       from "../../state/appStore";

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
interface StatusMaster {
  primary:       string[];
  mapping:       Record<string, string[]>;
  status_column: string;
  detail_column: string;
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
  const [tanggal, setTanggal] = useState(today);
  const [loading, setLoading] = useState(false);

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
        try { onToast(JSON.parse(text).detail || "Gagal generate BAI", "error"); }
        catch { onToast("Gagal generate BAI", "error"); }
      } else {
        onToast(err?.response?.data?.detail || "Gagal generate BAI", "error");
      }
    } finally { setLoading(false); }
  };

  return (
    <>
      <button onClick={e => { e.stopPropagation(); setShowModal(true); }}
        title={`Generate BAI — ${idPa}`}
        className="flex items-center justify-center w-6 h-6 rounded-md transition-all"
        style={{ color: "var(--text-muted)" }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--accent-soft)"; (e.currentTarget as HTMLElement).style.color = "var(--accent)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}>
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
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
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
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
              <input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm border"
                style={{ background: "var(--bg-surface2)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none" }}
                onFocus={e => e.target.style.borderColor = "var(--accent)"}
                onBlur={e => e.target.style.borderColor = "var(--border)"} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowModal(false)} disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: "var(--bg-surface2)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                Batal
              </button>
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
  const setNavPage        = useAppStore(s => s.setPage);
  const setTeskomAutofill = useAppStore(s => s.setTeskomAutofill);
  return (
    <button onClick={e => { e.stopPropagation(); if (!idPa) return; setTeskomAutofill(idPa); setNavPage("teskom"); }}
      title={`Buka Teskom — ${idPa}`}
      className="flex items-center justify-center w-6 h-6 rounded-md transition-all"
      style={{ color: "var(--text-muted)" }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--accent-soft)"; (e.currentTarget as HTMLElement).style.color = "var(--accent)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}>
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    </button>
  );
}

// ─── Preset Create Modal ──────────────────────────────────────────────────────
function PTLPresetCreateModal({ allCols, onCreate, onClose }: {
  allCols: string[];
  onCreate: (name: string, columns: string[]) => Promise<void>;
  onClose: () => void;
}) {
  const [name,     setName]     = useState("");
  const [selected, setSelected] = useState<string[]>(allCols);
  const [saving,   setSaving]   = useState(false);

  const toggleCol = (col: string) =>
    setSelected(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);

  const handleSave = async () => {
    if (!name.trim() || selected.length === 0) return;
    setSaving(true);
    try { await onCreate(name.trim(), selected); onClose(); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden flex flex-col"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", maxHeight: "85vh" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}>
          <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Buat Preset Baru</h3>
          <button onClick={onClose} className="p-1 rounded-lg" style={{ color: "var(--text-muted)" }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-surface2)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 custom-scrollbar space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Nama Preset</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="mis. Preset Utama"
              className="w-full px-3 py-2 rounded-lg text-sm border"
              style={{ background: "var(--bg-surface2)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none" }}
              onFocus={e => e.target.style.borderColor = "var(--accent)"}
              onBlur={e => e.target.style.borderColor = "var(--border)"} />
          </div>
          <div>
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
            <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
              {allCols.map(col => (
                <label key={col} className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer"
                  style={{ background: selected.includes(col) ? "var(--accent-soft)" : "transparent" }}>
                  <input type="checkbox" checked={selected.includes(col)} onChange={() => toggleCol(col)}
                    className="rounded" style={{ accentColor: "var(--accent)" }} />
                  <span className="text-xs truncate" style={{ color: "var(--text-primary)" }}>{col}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 shrink-0" style={{ borderTop: "1px solid var(--border)" }}>
          <button onClick={onClose} disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: "var(--bg-surface2)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
            Batal
          </button>
          <button onClick={handleSave} disabled={saving || !name.trim() || selected.length === 0}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
            style={{ background: "var(--accent)", opacity: saving || !name.trim() || selected.length === 0 ? 0.5 : 1 }}>
            {saving && <span className="spinner w-3 h-3" />}
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PTL Editable Cell ────────────────────────────────────────────────────────
function PTLEditableCell({ value, colW, onCommit }: {
  value:    string;
  colW:     number;
  onCommit: (val: string) => void;
}) {
  const [localVal, setLocalVal] = useState(value);
  const [editing,  setEditing]  = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync dari luar (saat optimistic update selesai)
  useEffect(() => { setLocalVal(value); }, [value]);

  const commit = () => {
    setEditing(false);
    if (localVal !== value) onCommit(localVal);
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={localVal}
      onChange={e => setLocalVal(e.target.value)}
      onFocus={() => setEditing(true)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === "Enter")  { inputRef.current?.blur(); }
        if (e.key === "Escape") { setLocalVal(value); setEditing(false); inputRef.current?.blur(); }
      }}
      readOnly={!editing}
      style={{
        width: "100%",
        padding: "4px 8px",
        fontSize: 12,
        borderRadius: 6,
        outline: "none",
        background:  editing ? "var(--input-bg, var(--bg-surface2))" : "var(--bg-surface2)",
        color:       "var(--text-primary)",
        border:      editing ? "1px solid var(--accent)" : "1px solid transparent",
        cursor:      editing ? "text" : "pointer",
        boxShadow:   editing ? "0 0 0 2px color-mix(in srgb, var(--accent) 15%, transparent)" : "none",
        transition:  "border-color 0.15s, background 0.15s",
        maxWidth:    `${colW - 8}px`,
      }}
      onMouseEnter={e => { if (!editing) (e.currentTarget as HTMLElement).style.borderColor = "var(--border-strong, var(--border))"; }}
      onMouseLeave={e => { if (!editing) (e.currentTarget as HTMLElement).style.borderColor = "transparent"; }}
    />
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────
export default function PTLDetailPanel() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [view, setView]                         = useState<DetailView>("table");
  const [sheetData, setSheetData]               = useState<PTLSheetData | null>(null);
  const [localRecords, setLocalRecords]         = useState<SheetRecord[]>([]);
  const [statusMaster, setStatusMaster]         = useState<StatusMaster | null>(null);
  const [loading, setLoading]                   = useState(true);
  const [search, setSearch]                     = useState("");
  const [tablePage, setTablePage]               = useState(1);
  const [saving, setSaving]                     = useState(false);
  const [activeFilters, setActiveFilters]       = useState<Record<string, string[]>>({});
  const [activeFilterCol, setActiveFilterCol]   = useState<string | null>(null);
  const [filterPos, setFilterPos]               = useState({ top: 0, left: 0 });
  const [presetDropdownOpen, setPresetDropdown] = useState(false);
  const [showCreatePreset, setShowCreatePreset] = useState(false);
  const [editingPresetId, setEditingPresetId]   = useState<number | null>(null);
  const [showEditableColumns, setShowEditableColumns] = useState(false);

  const { theme }                   = useThemeStore();
  const { user }                    = useAuthStore();
  const { toasts, show: showToast } = useToast();

  const { ptlEditableColumns, loadPtlEditableColumnsFromDB } = useAppearanceStore();

  // ── Preset dari DB ──
  const {
    presets,
    activePreset,
    activePresetId,
    setActivePresetId,
    createPreset,
    updatePreset,
    loading: presetLoading,
    refetch: refetchPresets,
  } = usePresets("ptl");

  const columns = activePreset?.columns ?? [];
  const widths  = activePreset?.widths  ?? {};

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const fetchSheet = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<PTLSheetData>("/records/ptl-sheet");
      setSheetData(res.data);
      setLocalRecords(res.data.records ?? []);
    } catch {
      showToast("Gagal memuat data GSheet", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const fetchStatusMaster = useCallback(async () => {
    try {
      const res = await api.get<StatusMaster>("/status");
      setStatusMaster(res.data);
    } catch {
      // status master optional — tidak error kalau gagal
    }
  }, []);

  useEffect(() => { fetchSheet(); }, []);
  useEffect(() => { fetchStatusMaster(); }, []);
  useEffect(() => { loadPtlEditableColumnsFromDB(); }, []);

  const allColumns = sheetData?.columns ?? [];
  const records    = localRecords;
  const idPaCol    = allColumns.find(c => c === "ID PA") ?? "ID PA";
  const namaCol    = allColumns.find(c => c.toLowerCase().includes("perusahaan")) ?? "";

  const statusCol = statusMaster?.status_column ?? "Status Pekerjaan";
  const detailCol = statusMaster?.detail_column ?? "Detail Progres";

  // ── Optimistic update cell ─────────────────────────────────────────────────
  const handleUpdateCell = useCallback(async (rowId: number, col: string, value: string) => {
    // 1. Update local state dulu (optimistic)
    setLocalRecords(prev =>
      prev.map(r => r.row_id === rowId ? { ...r, data: { ...r.data, [col]: value } } : r)
    );
    // 2. Kirim ke backend background
    setSaving(true);
    try {
      await api.post(`/records/ptl-sheet/${rowId}/cells`, { updates: { [col]: value } });
      // Backend mungkin auto-update Status PA & Kategori PA — refresh untuk sync
      if (col === statusCol) {
        const res = await api.get<PTLSheetData>("/records/ptl-sheet");
        setSheetData(res.data);
        setLocalRecords(res.data.records ?? []);
      }
    } catch (err: any) {
      // Rollback optimistic update
      setLocalRecords(prev =>
        prev.map(r => r.row_id === rowId ? { ...r, data: { ...r.data, [col]: sheetData?.records.find(s => s.row_id === rowId)?.data[col] ?? value } } : r)
      );
      showToast(err?.response?.data?.detail ?? "Gagal menyimpan", "error");
    } finally {
      setSaving(false);
    }
  }, [showToast, statusCol, sheetData]);

  // ── Update status (pakai endpoint status khusus untuk Engineer-style dropdown) ─
  const handleUpdateStatus = useCallback(async (rowId: number, status: string, detail?: string) => {
    // Optimistic update dulu
    setLocalRecords(prev =>
      prev.map(r => {
        if (r.row_id !== rowId) return r;
        return {
          ...r,
          data: {
            ...r.data,
            [statusCol]: status,
            ...(detail !== undefined ? { [detailCol]: detail } : {}),
          },
        };
      })
    );
    setSaving(true);
    try {
      await api.post(`/records/ptl-sheet/${rowId}/cells`, {
        updates: {
          [statusCol]: status,
          ...(detail !== undefined ? { [detailCol]: detail } : {}),
        },
      });
      // Refresh untuk dapat Status PA & Kategori PA yang auto-update
      const res = await api.get<PTLSheetData>("/records/ptl-sheet");
      setSheetData(res.data);
      setLocalRecords(res.data.records ?? []);
    } catch (err: any) {
      showToast(err?.response?.data?.detail ?? "Gagal menyimpan status", "error");
      // Rollback
      const res = await api.get<PTLSheetData>("/records/ptl-sheet");
      setSheetData(res.data);
      setLocalRecords(res.data.records ?? []);
    } finally {
      setSaving(false);
    }
  }, [statusCol, detailCol, showToast]);

  const handleRefresh = async () => {
    await fetchSheet();
    await fetchStatusMaster();
    showToast("Data diperbarui", "success");
  };

  // ── Filter + search ──
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

  const toggleFilter = (key: string, val: string) => {
    setActiveFilters(prev => {
      const cur  = prev[key] || [];
      const next = cur.includes(val) ? cur.filter(v => v !== val) : [...cur, val];
      const upd  = { ...prev };
      if (next.length === 0) delete upd[key]; else upd[key] = next;
      return upd;
    });
  };

  // ── Drag reorder kolom ──
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (activePreset && over && active.id !== over.id) {
      const oi      = columns.indexOf(active.id as string);
      const ni      = columns.indexOf(over.id as string);
      const newCols = arrayMove(columns, oi, ni);
      updatePreset(activePreset.id, { columns: newCols });
    }
  };

  // ── Resize kolom ──
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
      if (activePreset) updatePreset(activePreset.id, { widths: { ...widths, [col]: newW } });
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const onColAutoFit = (e: React.MouseEvent, col: string) => {
    e.stopPropagation();
    if (!activePreset) return;
    const canvas = document.createElement("canvas");
    const ctx    = canvas.getContext("2d")!;
    ctx.font     = "bold 12px sans-serif";
    let max      = ctx.measureText(col).width + 40;
    ctx.font     = "12px sans-serif";
    records.forEach(r => { const w = ctx.measureText(String(r.data[col] || "")).width; if (w > max) max = w; });
    updatePreset(activePreset.id, { widths: { ...widths, [col]: Math.min(600, max + 24) } });
  };

  const handleOpenFilter = (e: React.MouseEvent, col: string) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setFilterPos({ top: rect.bottom + 5, left: rect.left });
    setActiveFilterCol(prev => prev === col ? null : col);
  };

  // ── Create preset ──
  const handleCreatePreset = async (name: string, cols: string[]) => {
    try {
      await createPreset({ name, columns: cols });
      showToast("Preset berhasil dibuat", "success");
    } catch {
      showToast("Gagal membuat preset", "error");
    }
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-app)" }}>
      <Sidebar collapsed={sidebarCollapsed} onToast={showToast} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar onRefresh={handleRefresh} sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(v => !v)} />

        <main className="flex-1 overflow-hidden flex flex-col">

          {/* ── PAGE HEADER ─────────────────────────────────────────── */}
          <div className="px-5 pt-4 pb-3 shrink-0 flex items-center justify-between gap-4"
            style={{ borderBottom: "1px solid var(--border)" }}>

            {/* Kiri: icon + judul + meta */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "var(--accent-soft)" }}>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  style={{ color: "var(--accent)", width: 18, height: 18 }}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
                  Detail Pekerjaan
                </h1>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                    {records.length} record
                  </span>
                  <span className="w-1 h-1 rounded-full shrink-0" style={{ background: "var(--border)" }} />
                  <span className="text-[11px] font-medium truncate" style={{ color: "var(--text-secondary)" }}>
                    {user?.nama_lengkap}
                  </span>
                  {saving && (
                    <span className="text-[11px] font-medium flex items-center gap-1" style={{ color: "var(--accent)" }}>
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block" style={{ background: "var(--accent)" }} />
                      Menyimpan...
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Kanan: tab view switcher pill */}
            <div className="flex items-center shrink-0 p-0.5 rounded-xl"
              style={{ background: "var(--bg-surface2)", border: "1px solid var(--border)" }}>
              {([
                ["table",  "Tabel",  "M3 10h18M3 6h18M3 14h18M3 18h18"],
                ["kanban", "Kanban", "M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7"],
              ] as [DetailView, string, string][]).map(([v, label, path]) => (
                <button key={v} onClick={() => setView(v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: view === v ? "var(--accent)" : "transparent",
                    color:      view === v ? "#fff" : "var(--text-muted)",
                    boxShadow:  view === v ? "0 1px 4px rgba(0,0,0,0.15)" : "none",
                  }}>
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    style={{ width: 13, height: 13 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
                  </svg>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* ── KANBAN VIEW ── */}
          {view === "kanban" && (
            <div className="flex-1 overflow-hidden">
              {loading
                ? <div className="p-6 text-xs" style={{ color: "var(--text-muted)" }}>Memuat data...</div>
                : <PTLKanbanBoard records={records} onUpdateCell={handleUpdateCell} />
              }
            </div>
          )}

          {/* ── TABLE VIEW ── */}
          {view === "table" && (
            <div className="flex-1 overflow-hidden flex flex-col px-4 pt-3 pb-4 gap-2.5">

              {/* ── TOOLBAR ── */}
              <div className="flex items-center gap-2 shrink-0 flex-wrap">

                {/* Search */}
                <div className="relative">
                  <svg className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    style={{ color: "var(--text-muted)" }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input type="text" placeholder="Cari data..." value={search}
                    onChange={e => { setSearch(e.target.value); setTablePage(1); }}
                    className="th-input pl-8 pr-3 py-1.5 text-xs w-44" />
                </div>

                {/* Preset selector inline */}
                <div className="relative">
                  <div className="flex items-center rounded-lg overflow-hidden"
                    style={{ border: "1px solid var(--border)", background: "var(--bg-surface)" }}>
                    <button onClick={() => setPresetDropdown(v => !v)}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium transition-colors"
                      style={{ color: "var(--text-primary)", minWidth: 148 }}>
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                        style={{ color: "var(--accent)", width: 14, height: 14, flexShrink: 0 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h8" />
                      </svg>
                      <span className="truncate max-w-[108px]">
                        {presetLoading ? "Memuat..." : activePreset ? activePreset.name : "Pilih Preset"}
                      </span>
                      <svg className={`shrink-0 ml-auto transition-transform ${presetDropdownOpen ? "rotate-180" : ""}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                        style={{ color: "var(--text-muted)", width: 13, height: 13 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {activePreset && (
                      <>
                        <div className="w-px h-5 shrink-0" style={{ background: "var(--border)" }} />
                        <button onClick={() => setEditingPresetId(activePreset.id)}
                          className="px-2 py-1.5 transition-colors shrink-0"
                          title="Edit preset aktif"
                          style={{ color: "var(--text-muted)" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--accent)"; (e.currentTarget as HTMLElement).style.background = "var(--accent-soft)"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                            style={{ width: 13, height: 13 }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>

                  {presetDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setPresetDropdown(false)} />
                      <div className="absolute top-full left-0 mt-1.5 rounded-xl shadow-2xl border z-20 overflow-hidden"
                        style={{ background: "var(--bg-surface)", borderColor: "var(--border)", minWidth: 220 }}>
                        <div className="px-3 pt-2.5 pb-1">
                          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                            Preset Tersimpan
                          </p>
                        </div>
                        <div className="max-h-52 overflow-y-auto custom-scrollbar pb-1">
                          {presets.length === 0 && (
                            <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>Belum ada preset</p>
                          )}
                          {presets.map(p => (
                            <div key={p.id} className="flex items-center gap-1 px-2 py-0.5">
                              <button onClick={() => { setActivePresetId(p.id); setPresetDropdown(false); }}
                                className="flex-1 text-left px-2 py-1.5 text-xs flex items-center gap-2 rounded-lg transition-colors"
                                style={{ background: p.id === activePresetId ? "var(--accent-soft)" : "transparent" }}
                                onMouseEnter={e => { if (p.id !== activePresetId) (e.currentTarget as HTMLElement).style.background = "var(--bg-surface2)"; }}
                                onMouseLeave={e => { if (p.id !== activePresetId) (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                                {p.id === activePresetId ? (
                                  <svg fill="currentColor" viewBox="0 0 20 20"
                                    style={{ color: "var(--accent)", width: 12, height: 12, flexShrink: 0 }}>
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                ) : (
                                  <span style={{ width: 12, height: 12, flexShrink: 0, display: "inline-block" }} />
                                )}
                                <span className={p.id === activePresetId ? "font-semibold" : ""}
                                  style={{ color: p.id === activePresetId ? "var(--accent)" : "var(--text-primary)" }}>
                                  {p.name}
                                </span>
                              </button>
                              <button onClick={() => { setEditingPresetId(p.id); setPresetDropdown(false); }}
                                className="p-1.5 rounded-lg shrink-0 transition-colors"
                                style={{ color: "var(--text-muted)" }}
                                title="Edit preset"
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--accent-soft)"; (e.currentTarget as HTMLElement).style.color = "var(--accent)"; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}>
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                                  style={{ width: 11, height: 11 }}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="border-t mx-2 my-1" style={{ borderColor: "var(--border)" }} />
                        <div className="px-2 pb-2">
                          <button onClick={() => { setPresetDropdown(false); setShowCreatePreset(true); }}
                            className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 rounded-lg transition-colors font-medium"
                            style={{ color: "var(--accent)" }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--accent-soft)"}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                              style={{ width: 13, height: 13 }}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            Buat Preset Baru
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Filter badge */}
                {filterCount > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs px-2.5 py-1.5 rounded-lg font-medium flex items-center gap-1.5"
                      style={{ background: "var(--accent-soft)", color: "var(--accent)", border: "1px solid var(--accent)" }}>
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                        style={{ width: 11, height: 11 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4-2A1 1 0 018 17v-3.586L3.293 6.707A1 1 0 013 6V4z" />
                      </svg>
                      {filterCount} filter
                    </span>
                    <button onClick={() => setActiveFilters({})}
                      className="text-xs px-2 py-1.5 rounded-lg transition-colors"
                      style={{ color: "var(--text-muted)", background: "var(--bg-surface2)", border: "1px solid var(--border)" }}>
                      Reset
                    </button>
                  </div>
                )}

                {/* Kolom Editable */}
                <button onClick={() => setShowEditableColumns(true)}
                  className="btn-ghost flex items-center gap-1.5 text-xs py-1.5 px-2.5 rounded-lg"
                  title="Atur kolom yang dapat diedit">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    style={{ width: 13, height: 13 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  <span className="hidden sm:inline">Kolom Editable</span>
                </button>

                {/* Stats */}
                <div className="ml-auto">
                  <span className="text-[11px] font-medium tabular-nums px-2.5 py-1 rounded-lg"
                    style={{ background: "var(--bg-surface2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                    {filteredRecords.length} / {records.length} baris
                  </span>
                </div>
              </div>

              {/* Tabel / empty state */}
              {!activePreset ? (
                <div className="flex-1 flex flex-col items-center justify-center rounded-2xl"
                  style={{ background: "var(--bg-surface)", border: "2px dashed var(--border)" }}>
                  <p className="text-sm font-medium mb-3" style={{ color: "var(--text-secondary)" }}>
                    {presetLoading ? "Memuat preset..." : "Belum ada preset kolom"}
                  </p>
                  {!presetLoading && (
                    <button onClick={() => setShowCreatePreset(true)}
                      className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
                      style={{ background: "var(--accent)" }}>
                      + Buat Preset
                    </button>
                  )}
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
                                  const colW         = widths[col] ?? DEFAULT_COL_WIDTH;
                                  const isStatusCol  = col === statusCol;
                                  const isDetailCol  = col === detailCol;
                                  const isEditable   = ptlEditableColumns.includes(col) && !isStatusCol && !isDetailCol;
                                  const currentVal   = r.data[col] ?? "";

                                  return (
                                    <td key={col} className="border-r overflow-hidden"
                                      style={{ borderColor: "var(--border)", maxWidth: colW, padding: "2px 4px" }}
                                      title={currentVal}>

                                      {/* Dropdown Status Pekerjaan */}
                                      {isStatusCol && statusMaster && (
                                        <select value={currentVal}
                                          onChange={e => handleUpdateStatus(r.row_id, e.target.value, undefined)}
                                          className="text-xs border rounded px-1 py-0.5 w-full"
                                          style={{ background: "var(--bg-surface2)", color: "var(--text-primary)", borderColor: "var(--border)" }}>
                                          {(statusMaster.primary ?? []).map(s => (
                                            <option key={s} value={s}>{s}</option>
                                          ))}
                                        </select>
                                      )}

                                      {/* Dropdown Detail Progres */}
                                      {isDetailCol && statusMaster && (
                                        <select value={currentVal}
                                          onChange={e => handleUpdateStatus(r.row_id, r.data[statusCol] ?? "", e.target.value)}
                                          className="text-xs border rounded px-1 py-0.5 w-full"
                                          style={{ background: "var(--bg-surface2)", color: "var(--text-primary)", borderColor: "var(--border)" }}>
                                          <option value="-">-</option>
                                          {(statusMaster.mapping?.[r.data[statusCol]] ?? []).map(o => (
                                            <option key={o} value={o}>{o}</option>
                                          ))}
                                        </select>
                                      )}

                                      {/* Inline edit optimistic untuk kolom editable */}
                                      {isEditable && !isStatusCol && !isDetailCol && (
                                        <PTLEditableCell
                                          value={currentVal}
                                          colW={colW}
                                          onCommit={val => handleUpdateCell(r.row_id, col, val)}
                                        />
                                      )}

                                      {/* Plain text untuk kolom tidak editable */}
                                      {!isStatusCol && !isDetailCol && !isEditable && (
                                        <div className="truncate px-2 py-1 text-xs"
                                          style={{ color: "var(--text-secondary)", maxWidth: `${colW - 8}px` }}>
                                          {currentVal || "—"}
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
                      <b style={{ color: "var(--text-primary)" }}>
                        {(tablePage - 1) * PAGE_SIZE + 1}–{Math.min(tablePage * PAGE_SIZE, filteredRecords.length)}
                      </b>{" "}dari <b style={{ color: "var(--text-primary)" }}>{filteredRecords.length}</b>
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

      {/* Buat preset baru */}
      {showCreatePreset && (
        <PTLPresetCreateModal
          allCols={allColumns}
          onCreate={handleCreatePreset}
          onClose={() => setShowCreatePreset(false)}
        />
      )}

      {/* Edit preset PTL */}
      {editingPresetId !== null && (
        <PresetEditorModal
          presetId={editingPresetId}
          scope="ptl"
          allCols={allColumns}
          onSaved={refetchPresets}
          onClose={() => setEditingPresetId(null)}
        />
      )}

      {/* Kolom Editable Modal */}
      {showEditableColumns && (
        <EditableColumnsModal
          scope="ptl"
          allCols={columns}
          onClose={() => setShowEditableColumns(false)}
        />
      )}
    </div>
  );
}