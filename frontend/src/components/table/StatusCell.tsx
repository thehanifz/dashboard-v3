import { useTaskStore } from "../../state/taskStore";
import { useAppearanceStore } from "../../state/appearanceStore";
import { getColorTheme } from "../../utils/colorPalette";

export function StatusCell({ row, col }: any) {
  const statusMaster = useTaskStore((s) => s.statusMaster);
  const updateStatus = useTaskStore((s) => s.updateStatus);
  const labelColors  = useAppearanceStore((s) => s.labelColors) || {};
  const value        = row.data?.[col] ?? "-";

  if (!statusMaster || !statusMaster.primary) return value;

  const statusColumnName = statusMaster.status_column || "StatusPekerjaan";

  if (col === statusColumnName) {
    return (
      <select
        value={value}
        onChange={(e) => updateStatus(row.row_id, e.target.value, undefined)}
        className="text-xs border rounded px-1 py-0.5 w-full"
        style={{
          background:  "var(--bg-surface2)",
          color:       "var(--text-primary)",
          borderColor: "var(--border)",
        }}
      >
        <option value="">-</option>
        {(statusMaster.primary || []).map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    );
  }

  // Detail Progres dropdown
  const currentStatusValue = row.data?.[statusColumnName];
  const options = currentStatusValue && statusMaster.mapping
    ? statusMaster.mapping[currentStatusValue] ?? []
    : [];

  const detailTheme = getColorTheme(labelColors[value] || "gray");

  return (
    <select
      value={value}
      onChange={(e) => updateStatus(row.row_id, currentStatusValue, e.target.value)}
      className="text-xs border rounded px-1 py-0.5 w-full"
      style={{
        background:  "var(--bg-surface2)",
        color:       "var(--text-primary)",
        borderColor: "var(--border)",
      }}
    >
      <option value="-">-</option>
      {options.map((o) => (
        <option key={o}>{o}</option>
      ))}
    </select>
  );
}