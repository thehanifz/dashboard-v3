import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import TaskCard from "./TaskCard";
import { useAppearanceStore } from "../../state/appearanceStore";
import ColorPicker from "../ui/ColorPicker";

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

type KanbanRecord = { row_id: number; data: Record<string, string> };
type Props = { status: string; records: KanbanRecord[] };

export default function KanbanColumn({ status, records }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const [showPicker, setShowPicker] = useState(false);

  const columnColors   = useAppearanceStore(s => s.columnColors);
  const setColumnColor = useAppearanceStore(s => s.setColumnColor);
  const columnWidth    = useAppearanceStore(s => s.columnWidth) || 300;

  const themeId     = columnColors[status] || "gray";
  const headerColor = THEME_HEX[themeId] ?? "#6b7280";

  return (
    <div
      ref={setNodeRef}
      className="kanban-col flex flex-col shrink-0 transition-all"
      style={{
        width: columnWidth,
        minWidth: columnWidth,
        // Tidak pakai overflow hidden/visible di sini
        // maxHeight diatur di cards area
        outline: isOver ? `2px solid ${headerColor}` : "none",
        outlineOffset: 2,
        borderRadius: 16,
        border: "1px solid var(--border)",
        // Tinggi kolom dibatasi agar tidak unlimited
        maxHeight: "calc(100vh - 140px)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Column Header — full warna, position relative untuk color picker */}
      <div
        className="px-3 py-3 shrink-0 flex items-center justify-between gap-2 relative"
        style={{
          background: headerColor,
          borderRadius: "14px 14px 0 0",
          // overflow visible hanya di header agar color picker tidak terpotong
          overflow: "visible",
          zIndex: 1,
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
                onSelect={id => { setColumnColor(status, id); setShowPicker(false); }}
                onClose={() => setShowPicker(false)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Cards area — scroll terbatas, tidak bisa unlimited */}
      <div
        className="flex-1 overflow-y-auto px-2 pb-3 pt-2 space-y-2 custom-scrollbar min-h-[80px]"
        style={{
          background: headerColor + "12",
          borderRadius: "0 0 14px 14px",
        }}
      >
        {records.map(r => (
          <TaskCard key={r.row_id} record={r} columnColor={headerColor} />
        ))}
        {records.length === 0 && (
          <div
            className="flex items-center justify-center h-20 rounded-lg border-2 border-dashed text-xs"
            style={{ borderColor: headerColor + "40", color: headerColor + "80" }}
          >
            Tidak ada kartu
          </div>
        )}
      </div>
    </div>
  );
}