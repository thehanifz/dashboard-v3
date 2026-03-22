/**
 * PTLDetailPanel.tsx
 * Panel "Detail Pekerjaan" untuk PTL — tabel + preset + tombol BAI + Teskom.
 * Data dari /records/ptl-sheet (GSheet milik PTL sendiri).
 *
 * Fitur:
 * - Tabel dengan preset kolom (simpan/load/hapus)
 * - BaiActionButton (generate-ptl endpoint)
 * - TeskomActionButton (autofill-ptl endpoint)
 * - Edit sel inline → simpan ke GSheet PTL
 * - Search + pagination
 */
import { useEffect, useState, useMemo, useCallback } from "react";
import { useThemeStore }  from "../../state/themeStore";
import { useAuthStore }   from "../../state/authStore";
import { useToast }       from "../../utils/useToast";
import Sidebar            from "../layout/Sidebar";
import Topbar             from "../layout/Topbar";
import ToastContainer     from "../ui/ToastContainer";
import api                from "../../services/api";
import baiApi             from "../../services/baiApi";
import { useAppStore }    from "../../state/appStore";

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

// ─── Preset store (localStorage) ──────────────────────────────────────────────
const PRESET_KEY = "ptl_table_presets";
type Preset = { name: string; columns: string[] };

function loadPresets(): Preset[] {
  try { return JSON.parse(localStorage.getItem(PRESET_KEY) || "[]"); } catch { return []; }
}
function savePresets(presets: Preset[]) {
  localStorage.setItem(PRESET_KEY, JSON.stringify(presets));
}

// ─── Column width ─────────────────────────────────────────────────────────────
const DEFAULT_COL_WIDTH = 160;
const PAGE_SIZE = 20;

// ─── BaiActionButton (PTL variant) ────────────────────────────────────────────
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
      const blob  = await baiApi.generateBaiPtl(rowId, tanggal);
      const url   = URL.createObjectURL(blob);
      const a     = document.createElement("a");
      a.href      = url;
      a.download  = `BAI_${idPa.replace(/\//g, "-")}.docx`;
      a.click();
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
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "var(--accent-soft)" }}>
                <svg className="w-5 h-5" style={{ color: "var(--accent)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Generate BAI</h3>
                <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{namaPerusahaan || idPa}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="ml-auto shrink-0 p-1 rounded-lg transition-colors"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-surface2)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-3 py-2.5 rounded-lg mb-4 text-xs" style={{ background: "var(--bg-surface2)", border: "1px solid var(--border)" }}>
              <span style={{ color: "var(--text-muted)" }}>No. PA: </span>
              <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{idPa}</span>
            </div>
            <div className="mb-5">
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Tanggal BAI
                <span className="ml-1.5 font-normal" style={{ color: "var(--text-muted)" }}>(opsional — default hari ini)</span>
              </label>
              <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm border transition-colors"
                style={{ background: "var(--bg-surface2)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none" }}
                onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowModal(false)} disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{ background: "var(--bg-surface2)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                Batal
              </button>
              <button onClick={handleGenerate} disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity"
                style={{ background: "var(--accent)", opacity: loading ? 0.7 : 1 }}>
                {loading ? (<><span className="spinner" /> Membuat...</>) : (
                  <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> Ya, Generate</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── TeskomActionButton (PTL — same behavior, autofill uses ptl endpoint) ─────
function PtlTeskomButton({ idPa }: { idPa: string }) {
  const setPage           = useAppStore((s) => s.setPage);
  const setTeskomAutofill = useAppStore((s) => s.setTeskomAutofill);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!idPa) return;
    setTeskomAutofill(idPa);
    setPage("teskom");
  };

  return (
    <button onClick={handleClick} title={`Buka Teskom — ${idPa}`}
      className="flex items-center justify-center w-6 h-6 rounded-md transition-all"
      style={{ color: "var(--text-muted)" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--accent-soft)"; (e.currentTarget as HTMLElement).style.color = "var(--accent)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    </button>
  );
}

// ─── Preset Modal ─────────────────────────────────────────────────────────────
function PresetModal({ allCols, onClose, onLoad }: {
  allCols: string[];
  onClose: () => void;
  onLoad: (cols: string[]) => void;
}) {
  const [presets, setPresets]     = useState<Preset[]>(loadPresets());
  const [newName, setNewName]     = useState("");
  const [selected, setSelected]  = useState<string[]>(allCols);
  const [activeTab, setActiveTab] = useState<"manage" | "create">("manage");

  const toggleCol = (col: string) => {
    setSelected(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);
  };

  const handleSave = () => {
    if (!newName.trim() || selected.length === 0) return;
    const updated = [...presets.filter(p => p.name !== newName.trim()), { name: newName.trim(), columns: selected }];
    savePresets(updated);
    setPresets(updated);
    setNewName("");
  };

  const handleDelete = (name: string) => {
    const updated = presets.filter(p => p.name !== name);
    savePresets(updated);
    setPresets(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}>
          <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Preset Kolom</h3>
          <button onClick={onClose} className="p-1 rounded-lg" style={{ color: "var(--text-muted)" }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-surface2)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-3 shrink-0">
          {(["manage", "create"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{ background: activeTab === tab ? "var(--accent)" : "var(--bg-surface2)", color: activeTab === tab ? "#fff" : "var(--text-secondary)" }}>
              {tab === "manage" ? "Kelola Preset" : "Buat Preset"}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 custom-scrollbar">
          {activeTab === "manage" ? (
            <>
              {presets.length === 0 && (
                <p className="text-xs text-center py-6" style={{ color: "var(--text-muted)" }}>Belum ada preset tersimpan.</p>
              )}
              <div className="space-y-2">
                {presets.map(p => (
                  <div key={p.name} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                    style={{ background: "var(--bg-surface2)", border: "1px solid var(--border)" }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>{p.name}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{p.columns.length} kolom</p>
                    </div>
                    <button onClick={() => { onLoad(p.columns); onClose(); }}
                      className="px-3 py-1 rounded-lg text-xs font-semibold text-white shrink-0"
                      style={{ background: "var(--accent)" }}>Pakai</button>
                    <button onClick={() => handleDelete(p.name)}
                      className="p-1.5 rounded-lg text-xs shrink-0 transition-colors"
                      style={{ color: "var(--text-muted)" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#ef4444"; (e.currentTarget as HTMLElement).style.background = "#ef444422"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="mb-4">
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Nama Preset</label>
                <input value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder="mis. Preset Utama"
                  className="w-full px-3 py-2 rounded-lg text-sm border"
                  style={{ background: "var(--bg-surface2)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none" }}
                  onFocus={e => e.target.style.borderColor = "var(--accent)"}
                  onBlur={e => e.target.style.borderColor = "var(--border)"}
                />
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
                <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                  {allCols.map(col => (
                    <label key={col} className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer"
                      style={{ background: selected.includes(col) ? "var(--accent-soft)" : "transparent" }}
                      onMouseEnter={e => { if (!selected.includes(col)) (e.currentTarget as HTMLElement).style.background = "var(--bg-surface2)"; }}
                      onMouseLeave={e => { if (!selected.includes(col)) (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                      <input type="checkbox" checked={selected.includes(col)} onChange={() => toggleCol(col)} className="rounded" />
                      <span className="text-xs truncate" style={{ color: "var(--text-primary)" }}>{col}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button onClick={handleSave} disabled={!newName.trim() || selected.length === 0}
                className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity"
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
  const [sheetData, setSheetData]   = useState<PTLSheetData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [page, setPage]             = useState(1);
  const [editingCell, setEditingCell] = useState<{ rowId: number; col: string } | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [saving, setSaving]         = useState(false);
  const [showPreset, setShowPreset] = useState(false);
  const [visibleCols, setVisibleCols] = useState<string[] | null>(null); // null = semua kolom

  const { theme }             = useThemeStore();
  const { user }              = useAuthStore();
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

  const allColumns    = sheetData?.columns ?? [];
  const records       = sheetData?.records ?? [];
  const displayCols   = visibleCols ?? allColumns;

  const filteredRecords = useMemo(() => {
    if (!search.trim()) return records;
    const q = search.toLowerCase();
    return records.filter(r => Object.values(r.data ?? {}).some(v => String(v).toLowerCase().includes(q)));
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
      await api.post(`/records/ptl-sheet/${rowId}/cells`, { updates: { [col]: editingValue } });
      setSheetData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          records: prev.records.map(r =>
            r.row_id === rowId ? { ...r, data: { ...r.data, [col]: editingValue } } : r
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

  const handleRefresh = async () => {
    await fetchSheet();
    showToast("Data diperbarui", "success");
  };

  // Kolom ID PA — cari nama fleksibel
  const idPaCol = allColumns.find(c => c === "ID PA" || c === "No PA" || c.toUpperCase().includes("ID PA")) ?? "ID PA";
  const namaCol = allColumns.find(c => c.toLowerCase().includes("nama") || c.toLowerCase().includes("perusahaan")) ?? "";

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-app)" }}>
      <Sidebar collapsed={sidebarCollapsed} onToast={showToast} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar
          onRefresh={handleRefresh}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(v => !v)}
        />

        <main className="flex-1 overflow-hidden p-4 flex flex-col gap-3 pb-16 md:pb-4">

          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-2 shrink-0">
            <div>
              <h1 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Detail Pekerjaan</h1>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                {records.length} record · GSheet {user?.nama_lengkap}
                {saving && <span className="ml-2 text-amber-500">Menyimpan...</span>}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Preset button */}
              <button onClick={() => setShowPreset(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                Preset Kolom
                {visibleCols && <span className="ml-1 px-1.5 py-0.5 rounded-md text-white text-[10px]" style={{ background: "var(--accent)" }}>{visibleCols.length}</span>}
              </button>
              {visibleCols && (
                <button onClick={() => setVisibleCols(null)}
                  className="px-2 py-1.5 rounded-xl text-xs font-semibold transition-all"
                  style={{ background: "var(--bg-surface2)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                  Reset
                </button>
              )}
              {/* Search */}
              <div className="relative">
                <svg className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  style={{ color: "var(--text-muted)" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input type="text" placeholder="Cari..." value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="th-input pl-8 pr-3 py-1.5 text-xs w-44" />
              </div>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="text-xs py-4" style={{ color: "var(--text-muted)" }}>Memuat data GSheet...</div>
          )}

          {/* Tabel */}
          {!loading && displayCols.length > 0 && (
            <div className="rounded-2xl border overflow-auto custom-scrollbar flex-1"
              style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
              <table className="text-xs border-collapse" style={{ tableLayout: "fixed", width: "max-content", minWidth: "100%" }}>
                <thead className="sticky top-0 z-10 th-table-head">
                  <tr>
                    {/* Aksi */}
                    <th className="px-3 py-2.5 text-left font-semibold"
                      style={{ width: 72, minWidth: 72, borderBottom: "2px solid var(--border)" }}>
                      <span className="truncate block">Aksi</span>
                    </th>
                    {displayCols.map(col => (
                      <th key={col} className="px-3 py-2.5 text-left font-semibold"
                        style={{ width: DEFAULT_COL_WIDTH, minWidth: DEFAULT_COL_WIDTH, borderBottom: "2px solid var(--border)" }}>
                        <span className="truncate block">{col}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedRecords.map((r, rowIdx) => {
                    const idPaVal = r.data[idPaCol] ?? "";
                    const namaVal = namaCol ? (r.data[namaCol] ?? "") : "";
                    return (
                      <tr key={r.row_id} className="th-table-row"
                        style={{ background: rowIdx % 2 !== 0 ? "var(--table-row-alt)" : "var(--bg-surface)" }}>
                        {/* Aksi: BAI + Teskom */}
                        <td className="px-2 py-2 border-r" style={{ borderColor: "var(--border)" }}>
                          <div className="flex items-center gap-0.5">
                            <PtlBaiButton rowId={r.row_id} idPa={idPaVal} namaPerusahaan={namaVal} onToast={showToast} />
                            <PtlTeskomButton idPa={idPaVal} />
                          </div>
                        </td>
                        {displayCols.map(col => {
                          const isEditing = editingCell?.rowId === r.row_id && editingCell?.col === col;
                          const editable  = col !== idPaCol;
                          return (
                            <td key={col} className="px-3 py-2 border-r overflow-hidden"
                              style={{ borderColor: "var(--border)", maxWidth: DEFAULT_COL_WIDTH, cursor: editable ? "pointer" : "default" }}
                              title={isEditing ? undefined : r.data[col]}
                              onClick={() => !isEditing && editable && handleCellClick(r.row_id, col, r.data[col] ?? "")}
                            >
                              {isEditing ? (
                                <input autoFocus value={editingValue}
                                  onChange={e => setEditingValue(e.target.value)}
                                  onBlur={() => handleCellCommit(r.row_id, col)}
                                  onKeyDown={e => {
                                    if (e.key === "Enter") handleCellCommit(r.row_id, col);
                                    if (e.key === "Escape") setEditingCell(null);
                                  }}
                                  className="w-full text-xs px-1 py-0.5 rounded border outline-none"
                                  style={{ background: "var(--bg-app)", color: "var(--text-primary)", borderColor: "var(--accent)", width: `${DEFAULT_COL_WIDTH - 24}px` }}
                                />
                              ) : (
                                <div className="truncate w-full block"
                                  style={{ maxWidth: `${DEFAULT_COL_WIDTH - 24}px` }}
                                  onMouseEnter={e => { if (editable) (e.currentTarget as HTMLElement).style.outline = "1px dashed var(--accent)"; }}
                                  onMouseLeave={e => { if (editable) (e.currentTarget as HTMLElement).style.outline = "none"; }}
                                >
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
            </div>
          )}

          {/* Empty */}
          {!loading && displayCols.length === 0 && (
            <div className="rounded-2xl border p-10 text-center flex-1"
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

      {showPreset && (
        <PresetModal
          allCols={allColumns}
          onClose={() => setShowPreset(false)}
          onLoad={(cols) => { setVisibleCols(cols); setPage(1); }}
        />
      )}
    </div>
  );
}
