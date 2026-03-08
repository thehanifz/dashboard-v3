import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useTaskStore } from "../../state/taskStore";
import { useAppearanceStore } from "../../state/appearanceStore";
import { getColorTheme } from "../../utils/colorPalette";
import { calcAging, AGING_TIER_STYLES } from "../../utils/aging";

const AGING_LEFT_BORDER: Record<string, string> = {
  safe:     "#10b981",
  warning:  "#f59e0b",
  danger:   "#f97316",
  critical: "#ef4444",
};

export default function TaskCard({ record }: { record: { row_id: number; data: Record<string, string> } }) {
  const statusMaster = useTaskStore(s => s.statusMaster);
  const updateStatus = useTaskStore(s => s.updateStatus);
  const { cardFields, labelColors } = useAppearanceStore();

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: record.row_id,
    data: { row_id: record.row_id },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : "auto",
  };

  if (!statusMaster?.primary) return null;

  const statusColumnName = statusMaster.status_column || "StatusPekerjaan";
  const detailColumnName = statusMaster.detail_column || "Detail Progres";

  const visibleKeys = Object.keys(record.data).filter(k => cardFields.includes(k));
  const finalKeys   = visibleKeys.length > 0 ? visibleKeys : ["ID PA"];

  const aging      = calcAging(record.data["TGL TERBIT PA"]);
  const agingTier  = aging?.tier ?? "safe";
  const agingStyle = AGING_TIER_STYLES[agingTier];
  const borderColor = AGING_LEFT_BORDER[agingTier];

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, borderLeft: `3px solid ${borderColor}` } as any}
      className="task-card p-3 text-xs cursor-grab active:cursor-grabbing"
      {...listeners}
      {...attributes}
    >
      {/* Header: ID + aging */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="font-extrabold text-sm font-mono-data leading-tight" style={{ color: "var(--text-primary)" }}>
          {record.data["ID PA"] || `#${record.row_id}`}
        </span>
        {aging && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap"
            style={{ background: agingStyle.bg.replace("bg-", ""), color: AGING_LEFT_BORDER[agingTier], border: `1px solid ${AGING_LEFT_BORDER[agingTier]}33` }}>
            {aging.days}h
          </span>
        )}
      </div>

      {/* Fields */}
      <div className="space-y-2">
        {finalKeys.filter(k => k !== "ID PA").map(key => {
          const value = record.data[key] ?? "";

          if (key === statusColumnName) return (
            <div key={key}>
              <label className="text-[9px] font-bold uppercase tracking-wider mb-1 block" style={{ color: "var(--text-muted)" }}>Status</label>
              <select
                className="th-select w-full text-[11px]"
                value={value}
                onChange={e => updateStatus(record.row_id, e.target.value, undefined)}
                onPointerDown={e => e.stopPropagation()}
              >
                {(statusMaster.primary || []).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          );

          if (key === detailColumnName) {
            const detailVal = value || "-";
            const theme     = getColorTheme(labelColors[detailVal] || "gray");
            return (
              <div key={key}>
                <label className="text-[9px] font-bold uppercase tracking-wider mb-1 block" style={{ color: "var(--text-muted)" }}>Progres</label>
                <select
                  className="w-full text-[11px] rounded-md px-2 py-1 border font-semibold outline-none cursor-pointer appearance-none"
                  style={{ background: "transparent", borderColor: "var(--border)", color: "var(--text-primary)" }}
                  value={detailVal}
                  onChange={e => updateStatus(record.row_id, record.data[statusColumnName], e.target.value)}
                  onPointerDown={e => e.stopPropagation()}
                >
                  <option value="-">-</option>
                  {(statusMaster.mapping[record.data[statusColumnName]] ?? []).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            );
          }

          return (
            <div key={key}>
              <label className="text-[9px] font-bold uppercase tracking-wider block" style={{ color: "var(--text-muted)" }}>{key}</label>
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
