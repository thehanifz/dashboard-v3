import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import TaskCard from "./TaskCard";
import { useAppearanceStore } from "../../state/appearanceStore";
import { getColorTheme } from "../../utils/colorPalette";
import ColorPicker from "../ui/ColorPicker";
import { calcAging } from "../../utils/aging";

type KanbanRecord = { row_id: number; data: Record<string, string> };
type Props = { status: string; records: KanbanRecord[] };

export default function KanbanColumn({ status, records }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const [showPicker, setShowPicker] = useState(false);

  const columnColors   = useAppearanceStore(s => s.columnColors);
  const setColumnColor = useAppearanceStore(s => s.setColumnColor);
  const columnWidth    = useAppearanceStore(s => s.columnWidth) || 300;

  const themeId = columnColors[status] || "gray";
  const theme   = getColorTheme(themeId);

  // avg aging
  const agingDays  = records.map(r => calcAging(r.data["TGL TERBIT PA"])?.days ?? 0);
  const avgAging   = agingDays.length ? Math.round(agingDays.reduce((a, b) => a + b, 0) / agingDays.length) : null;
  const maxAging   = agingDays.length ? Math.max(...agingDays) : 0;
  const agingColor = maxAging > 90 ? "#ef4444" : maxAging > 60 ? "#f97316" : maxAging > 30 ? "#f59e0b" : "#10b981";

  return (
    <div
      ref={setNodeRef}
      className="kanban-col flex flex-col shrink-0 transition-all"
      style={{
        width: columnWidth,
        minWidth: columnWidth,
        maxHeight: "calc(100vh - 120px)",
        outline: isOver ? `2px solid var(--accent)` : "none",
        outlineOffset: 2,
      }}
    >
      {/* Column Header */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {/* Color dot */}
            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${theme.dot}`} />
            <h3 className="font-bold text-sm truncate" style={{ color: "var(--text-primary)" }}>{status}</h3>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {avgAging !== null && (
              <span className="text-[10px] font-mono-data font-semibold px-1.5 py-0.5 rounded"
                style={{ color: agingColor, background: agingColor + "18" }}>
                ⌀{avgAging}h
              </span>
            )}
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: "var(--bg-surface2)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
              {records.length}
            </span>
            <div className="relative">
              <button
                onClick={() => setShowPicker(!showPicker)}
                className="p-1 rounded-md transition-colors"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"}
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
                  onSelect={id => { setColumnColor(status, id); setShowPicker(false); }}
                  onClose={() => setShowPicker(false)}
                />
              )}
            </div>
          </div>
        </div>

        {/* Mini aging progress bar */}
        {records.length > 0 && (
          <div className="mt-2 h-0.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
            <div className="h-full rounded-full transition-all" style={{
              width: `${Math.min(100, (avgAging ?? 0) / 120 * 100)}%`,
              background: agingColor
            }} />
          </div>
        )}
      </div>

      {/* Cards area */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 pt-1 space-y-2 custom-scrollbar min-h-[80px]">
        {records.map(r => <TaskCard key={r.row_id} record={r} />)}
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
