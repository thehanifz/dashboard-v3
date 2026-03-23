/**
 * PTLKanbanBoard.tsx
 * Kanban board PTL — fitur setara Engineer:
 * - Search, sort, filter kolom
 * - Card fields manager (pilih kolom yang tampil di kartu)
 * - Column visibility (sembunyikan status tertentu)
 * - Warna kolom & label
 * - Ukuran kolom slider
 * - Drag & drop → update status ke GSheet PTL
 * State disimpan di appearanceStore scope PTL (ptlCardFields, ptlColumnColors, dll)
 */
import { useState, useMemo, useEffect } from "react";
import { DndContext, useDroppable, useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { calcAging } from "../../utils/aging";
import { useAppearanceStore } from "../../state/appearanceStore";
import { useTaskStore }        from "../../state/taskStore";
import { getColorTheme }       from "../../utils/colorPalette";
import { useKanbanPreset } from "../../hooks/useKanbanPreset";
import ColorPicker from "../ui/ColorPicker";
import type { SheetRecord } from "../../types/record";

const STATUS_COL = "Status Pekerjaan";
const ID_PA_COL  = "ID PA";
const TGL_COL    = "TGL TERBIT PA";

const AGING_COLORS = { safe: "#10b981", warning: "#f59e0b", danger: "#f97316", critical: "#ef4444" } as const;

const THEME_HEX: Record<string, string> = {
  slate: "#64748b", gray: "#6b7280", red: "#ef4444", orange: "#f97316",
  amber: "#f59e0b", green: "#22c55e", emerald: "#10b981", teal: "#14b8a6",
  cyan: "#06b6d4", blue: "#3b82f6", indigo: "#6366f1", violet: "#8b5cf6",
  purple: "#a855f7", pink: "#ec4899", rose: "#f43f5e",
};
const COL_COLORS_DEFAULT = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316","#ec4899"];

interface Props {
  records:      SheetRecord[];
  onUpdateCell: (rowId: number, col: string, value: string) => Promise<void>;
}

// ── Kanban Card ───────────────────────────────────────────────────────────────
function PTLCard({ record, cardFields, labelColors }: {
  record: SheetRecord; cardFields: string[]; labelColors: Record<string,string>;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: record.row_id, data: { row_id: record.row_id },
  });
  const aging      = calcAging(record.data[TGL_COL]);
  const agingTier  = aging?.tier ?? "safe";
  const borderColor = AGING_COLORS[agingTier];
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : "auto",
    borderLeft: `3px solid ${borderColor}`,
  };
  const visibleFields = cardFields.filter(k => k !== ID_PA_COL && k !== STATUS_COL);
  const detailVal = record.data["Detail Progres"] ?? "";
  const detailTheme = getColorTheme(labelColors[detailVal] || "gray");

  return (
    <div ref={setNodeRef} style={style as any}
      className="task-card p-3 text-xs cursor-grab active:cursor-grabbing"
      {...listeners} {...attributes}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="font-extrabold text-sm font-mono-data leading-tight" style={{ color: "var(--text-primary)" }}>
          {record.data[ID_PA_COL] || `#${record.row_id}`}
        </span>
        {aging && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap"
            style={{ color: borderColor, border: `1px solid ${borderColor}33` }}>
            {aging.days}h
          </span>
        )}
      </div>
      {detailVal && detailVal !== "-" && (
        <div className={`text-[10px] font-semibold px-1.5 py-0.5 rounded mb-2 inline-block ${detailTheme.bg} ${detailTheme.text}`}>
          {detailVal}
        </div>
      )}
      <div className="space-y-1.5">
        {visibleFields.slice(0, 4).map(key => (
          <div key={key}>
            <label className="text-[9px] font-bold uppercase tracking-wider block" style={{ color: "var(--text-muted)" }}>
              {key}
            </label>
            <p className="text-[11px] font-medium leading-relaxed break-words mt-0.5" style={{ color: "var(--text-secondary)" }}>
              {record.data[key] || "—"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Kanban Column ─────────────────────────────────────────────────────────────
function PTLColumn({ status, records, width, colorId, cardFields, labelColors, onColorChange }: {
  status: string; records: SheetRecord[]; width: number;
  colorId: string; cardFields: string[]; labelColors: Record<string,string>;
  onColorChange: (status: string, colorId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const [showPicker, setShowPicker] = useState(false);
  const headerColor = THEME_HEX[colorId] ?? COL_COLORS_DEFAULT[0];

  const agingDays = records.map(r => calcAging(r.data[TGL_COL])?.days ?? 0);
  const avgAging  = agingDays.length ? Math.round(agingDays.reduce((a,b) => a+b, 0) / agingDays.length) : null;
  const maxAging  = agingDays.length ? Math.max(...agingDays) : 0;
  const agingColor = maxAging > 90 ? "#ef4444" : maxAging > 60 ? "#f97316" : maxAging > 30 ? "#f59e0b" : "#10b981";

  return (
    <div ref={setNodeRef}
      className="kanban-col flex flex-col shrink-0 transition-all"
      style={{
        width, minWidth: width,
        maxHeight: "calc(100vh - 180px)",
        outline: isOver ? "2px solid var(--accent)" : "none",
        outlineOffset: 2,
      }}>
      <div className="px-3 pt-3 pb-2 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button className="w-2.5 h-2.5 rounded-full shrink-0 transition-transform hover:scale-125"
              style={{ background: headerColor }}
              onClick={() => setShowPicker(v => !v)}
              title="Ubah warna kolom" />
            {showPicker && (
              <ColorPicker selectedColorId={colorId}
                onSelect={c => { onColorChange(status, c); setShowPicker(false); }}
                onClose={() => setShowPicker(false)} />
            )}
            <h3 className="font-bold text-sm truncate" style={{ color: "var(--text-primary)" }}>{status}</h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {avgAging !== null && (
              <span className="text-[10px] font-mono-data font-semibold px-1.5 py-0.5 rounded"
                style={{ color: agingColor, background: agingColor + "18" }}>⌀{avgAging}h</span>
            )}
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: "var(--bg-surface2)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
              {records.length}
            </span>
          </div>
        </div>
        {records.length > 0 && (
          <div className="mt-2 h-0.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
            <div className="h-full rounded-full"
              style={{ width: `${Math.min(100, (avgAging ?? 0) / 120 * 100)}%`, background: agingColor }} />
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-3 pt-1 space-y-2 custom-scrollbar min-h-[80px]">
        {records.map(r => (
          <PTLCard key={r.row_id} record={r} cardFields={cardFields} labelColors={labelColors} />
        ))}
        {records.length === 0 && (
          <div className="flex items-center justify-center h-20 rounded-lg border-2 border-dashed text-xs"
            style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
            Tidak ada kartu
          </div>
        )}
      </div>
    </div>
  );
}

// ── PTL Card Field Manager ────────────────────────────────────────────────────
function PTLCardFieldManager({ allKeys, cardFields, onCardFieldsChange, onClose }: {
  allKeys: string[]; cardFields: string[];
  onCardFieldsChange: (f: string[]) => void; onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40 th-overlay" onClick={onClose} />
      <div className="fixed top-20 right-4 z-50 rounded-xl shadow-2xl w-72 p-4 animate-in fade-in slide-in-from-top-4"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <div className="flex justify-between items-center mb-3 pb-2"
          style={{ borderBottom: "1px solid var(--border)" }}>
          <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Tampilan Kartu</h3>
          <button onClick={onClose} className="text-lg leading-none" style={{ color: "var(--text-muted)" }}>&times;</button>
        </div>
        <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
          Centang kolom yang ingin tampil di kartu.
        </p>
        <div className="max-h-[60vh] overflow-y-auto space-y-1 custom-scrollbar">
          {allKeys.map(key => {
            const isChecked = cardFields.includes(key);
            return (
              <label key={key}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-xs select-none"
                style={{ background: isChecked ? "var(--accent-soft)" : "transparent" }}
                onMouseEnter={e => { if (!isChecked) (e.currentTarget as HTMLElement).style.background = "var(--bg-surface2)"; }}
                onMouseLeave={e => { if (!isChecked) (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                <input type="checkbox" className="rounded shrink-0" style={{ accentColor: "var(--accent)" }}
                  checked={isChecked}
                  onChange={() => {
                    if (isChecked) {
                      if (cardFields.length <= 1) return;
                      onCardFieldsChange(cardFields.filter(f => f !== key));
                    } else {
                      onCardFieldsChange([...cardFields, key]);
                    }
                  }} />
                <span style={{ color: isChecked ? "var(--accent)" : "var(--text-secondary)", fontWeight: isChecked ? 600 : 400 }}>
                  {key}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ── PTL Column Visibility Manager ─────────────────────────────────────────────
function PTLColumnVisibilityManager({ statuses, hiddenStatuses, onToggle, onClose }: {
  statuses: string[]; hiddenStatuses: string[];
  onToggle: (s: string) => void; onClose: () => void;
}) {
  const activeCount = statuses.length - hiddenStatuses.length;
  return (
    <>
      <div className="fixed inset-0 z-40 th-overlay" onClick={onClose} />
      <div className="fixed top-20 right-4 z-50 rounded-xl shadow-2xl w-64 p-4 animate-in fade-in slide-in-from-top-4"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <div className="flex justify-between items-center mb-3 pb-2"
          style={{ borderBottom: "1px solid var(--border)" }}>
          <div>
            <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Kolom Status</h3>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>{activeCount} aktif dari {statuses.length}</p>
          </div>
          <button onClick={onClose} className="text-lg leading-none" style={{ color: "var(--text-muted)" }}>&times;</button>
        </div>
        <div className="space-y-1">
          {statuses.map(s => {
            const isVisible = !hiddenStatuses.includes(s);
            return (
              <label key={s}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-xs select-none"
                style={{ background: isVisible ? "var(--accent-soft)" : "transparent" }}>
                <input type="checkbox" className="rounded shrink-0" style={{ accentColor: "var(--accent)" }}
                  checked={isVisible} onChange={() => onToggle(s)} />
                <span style={{ color: isVisible ? "var(--accent)" : "var(--text-muted)", fontWeight: isVisible ? 600 : 400 }}>
                  {s}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ── Main Board ────────────────────────────────────────────────────────────────
export default function PTLKanbanBoard({ records, onUpdateCell }: Props) {
  const statusMaster = useTaskStore(s => s.statusMaster);
  const {
    ptlColumnColors, setPtlColumnColor,
    ptlLabelColors,
    ptlColumnWidth, setPtlColumnWidth,
  } = useAppearanceStore();

  // ── Kanban preset dari DB ─────────────────────────────────────────────────
  const { preset: dbPreset, loading: presetLoading, save: savePreset } = useKanbanPreset("kanban_ptl");

  const [hiddenStatuses, setHiddenStatuses] = useState<string[]>([]);
  const [localCardFields, setLocalCardFields] = useState<string[]>([]);  // kosong = tampilkan semua
  const [presetReady, setPresetReady] = useState(false);

  useEffect(() => {
    if (!presetLoading) {
      if (dbPreset) {
        setHiddenStatuses(dbPreset.hiddenStatuses ?? []);
        if (dbPreset.cardFields?.length) setLocalCardFields(dbPreset.cardFields);
      }
      setPresetReady(true);
    }
  }, [presetLoading, dbPreset]);

  useEffect(() => {
    if (!presetReady) return;
    const t = setTimeout(() => {
      savePreset({ cardFields: localCardFields, hiddenStatuses });
    }, 800);
    return () => clearTimeout(t);
  }, [localCardFields, hiddenStatuses, presetReady]);

  const [search,       setSearch]       = useState("");
  const [sortBy,       setSortBy]       = useState<"id_asc"|"id_desc"|"newest"|"oldest"|"aging_desc"|"aging_asc">("id_asc");
  const [showFieldMgr, setShowFieldMgr] = useState(false);
  const [showColMgr,   setShowColMgr]   = useState(false);
  const [showSlider,   setShowSlider]   = useState(false);

  const allCols = useMemo(() => records[0] ? Object.keys(records[0].data) : [], [records]);

  // Urutan kolom: ikut statusMaster.primary kalau ada, fallback ke unique dari data
  const statuses = useMemo(() => {
    if (statusMaster?.primary?.length) {
      // Filter hanya status yang ada di data, tapi urutan tetap dari statusMaster
      const inData = new Set(records.map(r => r.data[STATUS_COL]).filter(Boolean));
      return statusMaster.primary.filter(s => inData.has(s));
    }
    // Fallback: unique dari data (urutan insertion)
    const seen = new Set<string>();
    const result: string[] = [];
    records.forEach(r => {
      const s = r.data[STATUS_COL];
      if (s && !seen.has(s)) { seen.add(s); result.push(s); }
    });
    return result;
  }, [records, statusMaster]);

  // Urutan ikut statusMaster primary, fallback ke unique dari data
  const visibleStatuses = statuses.filter(s => !hiddenStatuses.includes(s));

  const processed = useMemo(() => {
    let result = [...records];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(r => Object.values(r.data).join(" ").toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      const idA = a.data[ID_PA_COL] || "";
      const idB = b.data[ID_PA_COL] || "";
      if (sortBy === "id_asc")    return idA.localeCompare(idB);
      if (sortBy === "id_desc")   return idB.localeCompare(idA);
      if (sortBy === "newest")    return b.row_id - a.row_id;
      if (sortBy === "oldest")    return a.row_id - b.row_id;
      if (sortBy === "aging_desc") {
        const tA = new Date(a.data[TGL_COL] || 0).getTime();
        const tB = new Date(b.data[TGL_COL] || 0).getTime();
        return tA - tB;
      }
      if (sortBy === "aging_asc") {
        const tA = new Date(a.data[TGL_COL] || 0).getTime();
        const tB = new Date(b.data[TGL_COL] || 0).getTime();
        return tB - tA;
      }
      return 0;
    });
    return result;
  }, [records, search, sortBy]);

  const onDragEnd = async (event: any) => {
    const { active, over } = event;
    if (!over) return;
    const rowId     = active.data.current?.row_id;
    const newStatus = over.id as string;
    if (!rowId || !newStatus) return;
    const record = records.find(r => r.row_id === rowId);
    if (!record || record.data[STATUS_COL] === newStatus) return;
    try { await onUpdateCell(rowId, STATUS_COL, newStatus); } catch {}
  };

  // cardFields — kalau kosong tampilkan semua kolom
  const effectiveCardFields = localCardFields.length > 0
    ? localCardFields.filter(f => allCols.includes(f))
    : allCols;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="px-4 py-2.5 shrink-0 flex flex-wrap items-center gap-2"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-surface)" }}>

        {/* Search */}
        <div className="relative">
          <svg className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: "var(--text-muted)" }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" placeholder="Cari..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="th-input pl-8 pr-3 py-1.5 text-xs w-44" />
        </div>

        {/* Sort */}
        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="th-select text-xs py-1.5">
          <option value="id_asc">ID ↑</option>
          <option value="id_desc">ID ↓</option>
          <option value="newest">Terbaru</option>
          <option value="oldest">Terlama</option>
          <option value="aging_desc">Aging ↓ (tertua)</option>
          <option value="aging_asc">Aging ↑ (termuda)</option>
        </select>

        <div className="h-4 w-px mx-1" style={{ background: "var(--border)" }} />

        {/* Kolom Status */}
        <button onClick={() => setShowColMgr(true)} className="btn-ghost flex items-center gap-1.5 text-xs py-1.5 px-2.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
          <span className="hidden sm:inline">Kolom</span>
        </button>

        {/* Isi Kartu */}
        <button onClick={() => setShowFieldMgr(true)} className="btn-ghost flex items-center gap-1.5 text-xs py-1.5 px-2.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
          <span className="hidden sm:inline">Kartu</span>
        </button>

        <div className="h-4 w-px mx-1" style={{ background: "var(--border)" }} />

        {/* Ukuran kolom */}
        <div className="relative">
          <button onClick={() => setShowSlider(v => !v)} className="btn-ghost flex items-center gap-1.5 text-xs py-1.5 px-2.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            <span className="font-mono-data">{ptlColumnWidth}px</span>
          </button>
          {showSlider && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowSlider(false)} />
              <div className="absolute top-full left-0 mt-1.5 z-20 rounded-xl p-4 w-56 th-modal">
                <div className="flex justify-between mb-2 text-[10px]" style={{ color: "var(--text-muted)" }}>
                  <span>Ramping (220)</span><span>Lebar (500)</span>
                </div>
                <input type="range" min="220" max="500" step="10" value={ptlColumnWidth}
                  onChange={e => setPtlColumnWidth(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: "var(--accent)" }} />
              </div>
            </>
          )}
        </div>

        {/* Stats */}
        <div className="ml-auto text-[11px]" style={{ color: "var(--text-muted)" }}>
          {processed.length} / {records.length} kartu
        </div>
      </div>

      {/* Board */}
      <DndContext onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto overflow-y-hidden flex-1 p-4 custom-scrollbar">
          {visibleStatuses.map((status, idx) => (
            <PTLColumn
              key={status}
              status={status}
              records={processed.filter(r => r.data[STATUS_COL] === status)}
              width={ptlColumnWidth}
              colorId={ptlColumnColors[status] || Object.keys(THEME_HEX)[idx % Object.keys(THEME_HEX).length]}
              cardFields={effectiveCardFields}
              labelColors={ptlLabelColors}
              onColorChange={setPtlColumnColor}
            />
          ))}
        </div>
      </DndContext>

      {/* Modals */}
      {showFieldMgr && (
        <PTLCardFieldManager
          allKeys={allCols}
          cardFields={effectiveCardFields}
          onCardFieldsChange={setLocalCardFields}
          onClose={() => setShowFieldMgr(false)}
        />
      )}
      {showColMgr && (
        <PTLColumnVisibilityManager
          statuses={statuses}
          hiddenStatuses={hiddenStatuses}
          onToggle={(s) => setHiddenStatuses(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
          onClose={() => setShowColMgr(false)}
        />
      )}
    </div>
  );
}