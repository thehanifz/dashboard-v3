/**
 * PTLKanbanBoard.tsx
 * Kanban board untuk PTL.
 * - Kolom dari unique values "Status Pekerjaan" di GSheet PTL
 * - Drag card → update "Status Pekerjaan" ke GSheet PTL via /records/ptl-sheet/{row_id}/cells
 * - Aging, search, sort — sama seperti Engineer
 */
import { useState, useMemo } from "react";
import { DndContext, useDroppable, useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { calcAging } from "../../utils/aging";

const STATUS_COL = "Status Pekerjaan";
const ID_PA_COL  = "ID PA";
const TGL_COL    = "TGL TERBIT PA";

const AGING_COLORS = { safe: "#10b981", warning: "#f59e0b", danger: "#f97316", critical: "#ef4444" } as const;
const COL_COLORS   = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316","#ec4899"];

interface SheetRecord {
  id:     string;
  row_id: number;
  data:   Record<string, string>;
}

interface Props {
  records:      SheetRecord[];
  columnWidth?: number;
  onUpdateCell: (rowId: number, col: string, value: string) => Promise<void>;
}

// ── Kanban Card ───────────────────────────────────────────────────────────────
function PTLCard({ record, cardFields }: { record: SheetRecord; cardFields: string[] }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: record.row_id,
    data: { row_id: record.row_id },
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

  return (
    <div ref={setNodeRef} style={style as any}
      className="task-card p-3 text-xs cursor-grab active:cursor-grabbing"
      {...listeners} {...attributes}
    >
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
function PTLColumn({ status, records, width, colorIdx, cardFields }: {
  status: string; records: SheetRecord[]; width: number; colorIdx: number; cardFields: string[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const color = COL_COLORS[colorIdx % COL_COLORS.length];

  const agingDays = records.map(r => calcAging(r.data[TGL_COL])?.days ?? 0);
  const avgAging  = agingDays.length ? Math.round(agingDays.reduce((a, b) => a + b, 0) / agingDays.length) : null;
  const maxAging  = agingDays.length ? Math.max(...agingDays) : 0;
  const agingColor = maxAging > 90 ? "#ef4444" : maxAging > 60 ? "#f97316" : maxAging > 30 ? "#f59e0b" : "#10b981";

  return (
    <div ref={setNodeRef}
      className="kanban-col flex flex-col shrink-0 transition-all"
      style={{
        width, minWidth: width,
        maxHeight: "calc(100vh - 180px)",
        outline: isOver ? `2px solid var(--accent)` : "none",
        outlineOffset: 2,
      }}
    >
      <div className="px-3 pt-3 pb-2 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
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
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, (avgAging ?? 0) / 120 * 100)}%`, background: agingColor }} />
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-3 pt-1 space-y-2 custom-scrollbar min-h-[80px]">
        {records.map(r => <PTLCard key={r.row_id} record={r} cardFields={cardFields} />)}
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

// ── Main Board ────────────────────────────────────────────────────────────────
export default function PTLKanbanBoard({ records, columnWidth = 300, onUpdateCell }: Props) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"id_asc" | "id_desc" | "newest" | "oldest" | "aging_desc">("id_asc");
  const [showSlider, setShowSlider] = useState(false);
  const [colWidth, setColWidth] = useState(columnWidth);

  // Card fields — semua kolom kecuali Status Pekerjaan dan ID PA
  const allCols   = records[0] ? Object.keys(records[0].data) : [];
  const cardFields = allCols;

  // Unique statuses dari data
  const statuses = useMemo(() => {
    const set = new Set<string>();
    records.forEach(r => { const s = r.data[STATUS_COL]; if (s) set.add(s); });
    return Array.from(set);
  }, [records]);

  // Filter + sort
  const processed = useMemo(() => {
    let result = [...records];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(r => Object.values(r.data).join(" ").toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      if (sortBy === "id_asc")    return (a.data[ID_PA_COL] || "").localeCompare(b.data[ID_PA_COL] || "");
      if (sortBy === "id_desc")   return (b.data[ID_PA_COL] || "").localeCompare(a.data[ID_PA_COL] || "");
      if (sortBy === "newest")    return b.row_id - a.row_id;
      if (sortBy === "oldest")    return a.row_id - b.row_id;
      if (sortBy === "aging_desc") {
        const tA = new Date(a.data[TGL_COL] || 0).getTime();
        const tB = new Date(b.data[TGL_COL] || 0).getTime();
        return tA - tB;
      }
      return 0;
    });
    return result;
  }, [records, search, sortBy]);

  const onDragEnd = async (event: any) => {
    const { active, over } = event;
    if (!over) return;
    const rowId    = active.data.current?.row_id;
    const newStatus = over.id as string;
    if (!rowId || !newStatus) return;

    const record = records.find(r => r.row_id === rowId);
    if (!record || record.data[STATUS_COL] === newStatus) return;

    try {
      await onUpdateCell(rowId, STATUS_COL, newStatus);
    } catch { /* error handled by parent */ }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="px-4 py-2.5 shrink-0 flex flex-wrap items-center gap-2"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-surface)" }}>
        <div className="relative">
          <svg className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: "var(--text-muted)" }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" placeholder="Cari..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="th-input pl-8 pr-3 py-1.5 text-xs w-44" />
        </div>

        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="th-select text-xs py-1.5">
          <option value="id_asc">ID ↑</option>
          <option value="id_desc">ID ↓</option>
          <option value="newest">Terbaru</option>
          <option value="oldest">Terlama</option>
          <option value="aging_desc">Aging ↓</option>
        </select>

        <div className="h-4 w-px" style={{ background: "var(--border)" }} />

        {/* Ukuran kolom */}
        <div className="relative">
          <button onClick={() => setShowSlider(v => !v)}
            className="btn-ghost flex items-center gap-1.5 text-xs py-1.5 px-2.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            <span className="font-mono-data">{colWidth}px</span>
          </button>
          {showSlider && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowSlider(false)} />
              <div className="absolute top-full left-0 mt-1.5 z-20 rounded-xl p-4 w-56 th-modal">
                <div className="flex justify-between mb-2 text-[10px]" style={{ color: "var(--text-muted)" }}>
                  <span>220px</span><span>500px</span>
                </div>
                <input type="range" min="220" max="500" step="10" value={colWidth}
                  onChange={e => setColWidth(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: "var(--accent)" }} />
              </div>
            </>
          )}
        </div>

        <div className="ml-auto text-[11px]" style={{ color: "var(--text-muted)" }}>
          {processed.length} / {records.length} kartu
        </div>
      </div>

      {/* Board */}
      <DndContext onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto overflow-y-hidden flex-1 p-4 custom-scrollbar">
          {statuses.map((status, idx) => (
            <PTLColumn
              key={status}
              status={status}
              records={processed.filter(r => r.data[STATUS_COL] === status)}
              width={colWidth}
              colorIdx={idx}
              cardFields={cardFields}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}