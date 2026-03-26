/**
 * PTLKanbanBoard.tsx
 * Kanban board PTL — UI/UX identik dengan Engineer KanbanBoard:
 * - Column style: full color header, cards area bg tint
 * - Card style: borderLeft = columnColor, no field limit, aging badge selalu tampil
 * - Search, sort, filter, kolom visibility, card fields, warna label, ukuran
 * - Drag & drop → update status ke GSheet PTL
 * State disimpan di appearanceStore scope PTL
 */
import { useState, useMemo, useEffect, useRef } from "react";
import { DndContext, useDroppable, useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { calcAging } from "../../utils/aging";
import { useAppearanceStore } from "../../state/appearanceStore";
import { useTaskStore }        from "../../state/taskStore";
import { getColorTheme }       from "../../utils/colorPalette";
import { useKanbanPreset }     from "../../hooks/useKanbanPreset";
import ColorPicker             from "../ui/ColorPicker";
import type { SheetRecord }    from "../../types/record";

import PTLCardFieldManager         from "./PTLCardFieldManager";
import PTLColumnVisibilityManager  from "./PTLColumnVisibilityManager";
import PTLFilterManager            from "./PTLFilterManager";
import PTLGlobalLabelManager       from "./PTLGlobalLabelManager";

const STATUS_COL = "Status Pekerjaan";
const ID_PA_COL  = "ID PA";
const TGL_COL    = "TGL TERBIT PA";
const DETAIL_COL = "Detail Progres";

const AGING_COLORS: Record<string, string> = {
  safe: "#10b981", warning: "#f59e0b", danger: "#f97316", critical: "#ef4444",
};

// Identik dengan THEME_HEX di KanbanColumn Engineer (lengkap)
const THEME_HEX: Record<string, string> = {
  slate:   "#64748b", gray:    "#6b7280", zinc:    "#71717a",
  neutral: "#737373", stone:   "#78716c", red:     "#ef4444",
  orange:  "#f97316", amber:   "#f59e0b", yellow:  "#eab308",
  lime:    "#84cc16", green:   "#22c55e", emerald: "#10b981",
  teal:    "#14b8a6", cyan:    "#06b6d4", sky:     "#0ea5e9",
  blue:    "#3b82f6", indigo:  "#6366f1", violet:  "#8b5cf6",
  purple:  "#a855f7", fuchsia: "#d946ef", pink:    "#ec4899",
  rose:    "#f43f5e",
};

interface Props {
  records:      SheetRecord[];
  onUpdateCell: (rowId: number, col: string, value: string) => Promise<void>;
}

// ── PTL Card — identik TaskCard Engineer ─────────────────────────────────────
function PTLCard({ record, columnColor, cardFields, labelColors }: {
  record: SheetRecord;
  columnColor: string;
  cardFields: string[];
  labelColors: Record<string, string>;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: record.row_id,
    data: { row_id: record.row_id },
  });

  const aging      = calcAging(record.data[TGL_COL]);
  const agingTier  = aging?.tier ?? "safe";
  const agingColor = AGING_COLORS[agingTier];

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : "auto",
    // borderLeft ikut warna kolom (identik Engineer TaskCard)
    borderLeft: `3px solid ${columnColor}`,
  };

  // Fields: kosong = tampilkan semua (identik Engineer)
  const allKeys     = Object.keys(record.data);
  const visibleKeys = cardFields.length > 0
    ? allKeys.filter(k => cardFields.includes(k))
    : allKeys;
  const finalKeys   = visibleKeys.length > 0 ? visibleKeys : allKeys;

  return (
    <div
      ref={setNodeRef}
      style={style as any}
      className="task-card p-3 text-xs cursor-grab active:cursor-grabbing"
      {...listeners}
      {...attributes}
    >
      {/* Header: ID + aging badge (selalu tampil, — jika tidak ada) */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="font-extrabold text-sm font-mono-data leading-tight" style={{ color: "var(--text-primary)" }}>
          {record.data[ID_PA_COL] || `#${record.row_id}`}
        </span>
        <span
          className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap"
          style={{
            color:      aging ? agingColor : "var(--text-muted)",
            background: aging ? agingColor + "18" : "var(--bg-surface2)",
            border:     `1px solid ${aging ? agingColor + "33" : "var(--border)"}`,
          }}
        >
          {aging ? `${aging.days}h` : "—"}
        </span>
      </div>

      {/* Fields — identik Engineer: render semua finalKeys kecuali ID PA */}
      <div className="space-y-2">
        {finalKeys.filter(k => k !== ID_PA_COL).map(key => {
          const value = record.data[key] ?? "";

          // Detail Progres → tampilkan sebagai label berwarna (read-only di PTL)
          if (key === DETAIL_COL) {
            const detailVal = value || "-";
            if (detailVal === "-") return null;
            const theme = getColorTheme(labelColors[detailVal] || "gray");
            return (
              <div key={key}>
                <label className="text-[9px] font-bold uppercase tracking-wider mb-1 block" style={{ color: "var(--text-muted)" }}>
                  Progres
                </label>
                <div className={`text-[10px] font-semibold px-1.5 py-0.5 rounded inline-block ${theme.bg} ${theme.text}`}>
                  {detailVal}
                </div>
              </div>
            );
          }

          // Status kolom — skip di body (sudah di header kolom)
          if (key === STATUS_COL) return null;

          return (
            <div key={key}>
              <label className="text-[9px] font-bold uppercase tracking-wider block" style={{ color: "var(--text-muted)" }}>
                {key}
              </label>
              <p className="text-[11px] font-medium leading-relaxed break-words whitespace-pre-wrap mt-0.5" style={{ color: "var(--text-secondary)" }}>
                {value || "—"}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── PTL Column — identik KanbanColumn Engineer ────────────────────────────────
function PTLColumn({ status, records, columnColor, cardFields, labelColors, onColorChange }: {
  status:       string;
  records:      SheetRecord[];
  columnColor:  string;
  cardFields:   string[];
  labelColors:  Record<string, string>;
  onColorChange:(status: string, colorId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const [showPicker, setShowPicker] = useState(false);

  // Resolve colorId dari THEME_HEX untuk ColorPicker
  const themeId = Object.entries(THEME_HEX).find(([, hex]) => hex === columnColor)?.[0] ?? "gray";

  return (
    <div
      ref={setNodeRef}
      className="kanban-col flex flex-col shrink-0 transition-all"
      style={{
        width:      "var(--ptl-col-width, 300px)",
        minWidth:   "var(--ptl-col-width, 300px)",
        maxHeight:  "calc(100vh - 140px)",
        outline:    isOver ? `2px solid ${columnColor}` : "none",
        outlineOffset: 2,
        borderRadius: 16,
        border: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Column Header — full color identik Engineer */}
      <div
        className="px-3 py-3 shrink-0 flex items-center justify-between gap-2 relative"
        style={{
          background:   columnColor,
          borderRadius: "14px 14px 0 0",
          overflow:     "visible",
          zIndex:       1,
        }}
      >
        <h3 className="font-bold text-sm truncate text-white">{status}</h3>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: "rgba(255,255,255,0.25)", color: "#fff" }}
          >
            {records.length}
          </span>
          <div className="relative">
            <button
              onClick={() => setShowPicker(!showPicker)}
              className="p-1 rounded-md transition-colors"
              style={{ color: "rgba(255,255,255,0.75)" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.2)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
              title="Ubah Warna"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-1.757l4.9-4.9a2 2 0 000-2.828L13.485 5.1a2 2 0 00-2.828 0L10 5.757v8.486zM16 18H9.071l6-6H16a2 2 0 012 2v2a2 2 0 01-2 2z" />
              </svg>
            </button>
            {showPicker && (
              <ColorPicker
                selectedColorId={themeId}
                onSelect={id => { onColorChange(status, id); setShowPicker(false); }}
                onClose={() => setShowPicker(false)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Cards area — bg tint identik Engineer */}
      <div
        className="flex-1 overflow-y-auto px-2 pb-3 pt-2 space-y-2 custom-scrollbar min-h-[80px]"
        style={{
          background:   columnColor + "12",
          borderRadius: "0 0 14px 14px",
        }}
      >
        {records.map(r => (
          <PTLCard
            key={r.row_id}
            record={r}
            columnColor={columnColor}
            cardFields={cardFields}
            labelColors={labelColors}
          />
        ))}
        {records.length === 0 && (
          <div
            className="flex items-center justify-center h-20 rounded-lg border-2 border-dashed text-xs"
            style={{ borderColor: columnColor + "40", color: columnColor + "80" }}
          >
            Tidak ada kartu
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Board ────────────────────────────────────────────────────────────────
export default function PTLKanbanBoard({ records, onUpdateCell }: Props) {
  const statusMaster = useTaskStore(s => s.statusMaster);
  const {
    ptlColumnColors, setPtlColumnColor,
    ptlLabelColors,
    ptlColumnWidth,  setPtlColumnWidth,
    ptlActiveFilters,
  } = useAppearanceStore();

  const { preset: dbPreset, loading: presetLoading, save: savePreset } = useKanbanPreset("kanban_ptl");

  const [hiddenStatuses,  setHiddenStatuses]  = useState<string[]>([]);
  const [localCardFields, setLocalCardFields] = useState<string[]>([]);
  const [presetReady,     setPresetReady]     = useState(false);

  // Phase 1: skip auto-save pada render pertama setelah load
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (!presetLoading) {
      if (dbPreset) {
        setHiddenStatuses(dbPreset.hiddenStatuses ?? []);
        if (dbPreset.cardFields?.length) setLocalCardFields(dbPreset.cardFields);
      }
      setPresetReady(true);
      setTimeout(() => { isFirstLoad.current = false; }, 0);
    }
  }, [presetLoading, dbPreset]);

  // presetReady dihapus dari deps — cegah race condition
  useEffect(() => {
    if (!presetReady) return;
    if (isFirstLoad.current) return;
    const t = setTimeout(() => {
      savePreset({ cardFields: localCardFields, hiddenStatuses });
    }, 800);
    return () => clearTimeout(t);
  }, [localCardFields, hiddenStatuses]); // eslint-disable-line react-hooks/exhaustive-deps

  const [search,       setSearch]       = useState("");
  const [sortBy,       setSortBy]       = useState<"id_asc"|"id_desc"|"newest"|"oldest"|"aging_desc"|"aging_asc">("id_asc");
  const [showFieldMgr, setShowFieldMgr] = useState(false);
  const [showColMgr,   setShowColMgr]   = useState(false);
  const [showSlider,   setShowSlider]   = useState(false);
  const [showFilter,   setShowFilter]   = useState(false);
  const [showLabelMgr, setShowLabelMgr] = useState(false);

  // Urutan status: ikut statusMaster.primary (identik Engineer), fallback ke order insertion
  const statuses = useMemo(() => {
    if (statusMaster?.primary?.length) {
      const inData = new Set(records.map(r => r.data[STATUS_COL]).filter(Boolean));
      // Filter: hanya status yang ada di data PTL, tapi URUTAN tetap dari statusMaster
      return statusMaster.primary.filter(s => inData.has(s));
    }
    const seen = new Set<string>();
    const result: string[] = [];
    records.forEach(r => {
      const s = r.data[STATUS_COL];
      if (s && !seen.has(s)) { seen.add(s); result.push(s); }
    });
    return result;
  }, [records, statusMaster]);

  const visibleStatuses = useMemo(
    () => statuses.filter(s => !hiddenStatuses.includes(s)),
    [statuses, hiddenStatuses]
  );

  const ptlActiveFilterCount = Object.keys(ptlActiveFilters).length;

  const processed = useMemo(() => {
    let result = [...records];
    if (ptlActiveFilterCount > 0) {
      result = result.filter(r =>
        Object.entries(ptlActiveFilters).every(([key, vals]) => vals.includes(String(r.data[key] || "")))
      );
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(r => Object.values(r.data).join(" ").toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      const idA = a.data[ID_PA_COL] || "";
      const idB = b.data[ID_PA_COL] || "";
      if (sortBy === "id_asc")     return idA.localeCompare(idB);
      if (sortBy === "id_desc")    return idB.localeCompare(idA);
      if (sortBy === "newest")     return b.row_id - a.row_id;
      if (sortBy === "oldest")     return a.row_id - b.row_id;
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
  }, [records, search, sortBy, ptlActiveFilters, ptlActiveFilterCount]);

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

  // Resolve columnColor dari THEME_HEX (identik Engineer)
  const resolveColumnColor = (status: string, idx: number): string => {
    const colorId = ptlColumnColors[status];
    if (colorId && THEME_HEX[colorId]) return THEME_HEX[colorId];
    // Default: cycle melalui theme colors
    const defaultKeys = Object.keys(THEME_HEX);
    return THEME_HEX[defaultKeys[idx % defaultKeys.length]];
  };

  const handleColorChange = (status: string, colorId: string) => {
    setPtlColumnColor(status, colorId);
  };

  return (
    // CSS variable untuk column width agar bisa dipakai di PTLColumn
    <div className="flex flex-col h-full" style={{ "--ptl-col-width": `${ptlColumnWidth}px` } as any}>

      {/* Toolbar — urutan: Search → Sort → | → Filter → Kolom → Kartu → Warna → | → Ukuran → Stats */}
      <div className="px-4 py-2.5 shrink-0 flex flex-wrap items-center gap-2"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-surface)" }}>

        {/* Search */}
        <div className="relative">
          <svg className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            style={{ color: "var(--text-muted)" }}>
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

        {/* Filter */}
        <button onClick={() => setShowFilter(true)}
          className="btn-ghost flex items-center gap-1.5 text-xs py-1.5 px-2.5"
          style={ptlActiveFilterCount > 0 ? { background: "var(--accent-soft)", borderColor: "var(--accent)", color: "var(--accent)" } : {}}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="hidden sm:inline">Filter</span>
          {ptlActiveFilterCount > 0 && (
            <span className="font-bold text-[10px] px-1.5 py-0.5 rounded-full text-white"
              style={{ background: "var(--accent)" }}>{ptlActiveFilterCount}</span>
          )}
        </button>

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

        {/* Warna Label */}
        <button onClick={() => setShowLabelMgr(true)} className="btn-ghost flex items-center gap-1.5 text-xs py-1.5 px-2.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
          <span className="hidden sm:inline">Warna</span>
        </button>

        <div className="h-4 w-px mx-1" style={{ background: "var(--border)" }} />

        {/* Ukuran Kolom */}
        <div className="relative">
          <button onClick={() => setShowSlider(v => !v)} className="btn-ghost flex items-center gap-1.5 text-xs py-1.5 px-2.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            <span className="hidden sm:inline font-mono-data">{ptlColumnWidth}px</span>
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
        <div className="ml-auto flex items-center gap-2 text-[11px]" style={{ color: "var(--text-muted)" }}>
          <span>{processed.length} / {records.length} kartu</span>
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
              columnColor={resolveColumnColor(status, idx)}
              cardFields={localCardFields}
              labelColors={ptlLabelColors}
              onColorChange={handleColorChange}
            />
          ))}
        </div>
      </DndContext>

      {/* Modals */}
      {showFieldMgr && (
        <PTLCardFieldManager
          records={records}
          cardFields={localCardFields}
          onCardFieldsChange={setLocalCardFields}
          onClose={() => setShowFieldMgr(false)}
        />
      )}
      {showColMgr && (
        <PTLColumnVisibilityManager
          statuses={statuses}
          hiddenStatuses={hiddenStatuses}
          onToggle={s => setHiddenStatuses(prev =>
            prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
          )}
          onClose={() => setShowColMgr(false)}
        />
      )}
      {showFilter && (
        <PTLFilterManager
          records={records}
          statusColumnName={STATUS_COL}
          onClose={() => setShowFilter(false)}
        />
      )}
      {showLabelMgr && (
        <PTLGlobalLabelManager
          records={records}
          onClose={() => setShowLabelMgr(false)}
        />
      )}
    </div>
  );
}
