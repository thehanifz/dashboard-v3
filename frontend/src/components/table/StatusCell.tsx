import { useTaskStore } from "../../state/taskStore";
import { useAppearanceStore } from "../../state/appearanceStore";
import { getColorTheme } from "../../utils/colorPalette";
import { statusColor } from "../../utils/statusColor";

export function StatusCell({ row, col }: any) {
  const statusMaster = useTaskStore((s) => s.statusMaster);
  const updateStatus = useTaskStore((s) => s.updateStatus);
  const labelColors = useAppearanceStore((s) => s.labelColors) || {};
  const value = row.data?.[col] ?? "-";

  if (!statusMaster || !statusMaster.primary) return value;

  const statusColumnName = statusMaster.status_column || "StatusPekerjaan";
  const detailColumnName = statusMaster.detail_column || "Detail Progres";

  if (col === statusColumnName) {
    return (
      <select
        value={value}
        onChange={(e) =>
          updateStatus(row.row_id, e.target.value, undefined)
        }
        className={`text-xs border rounded px-1 py-0.5 w-full ${statusColor(
          value
        )}`}
      >
        {(statusMaster.primary || []).map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>
    );
  }

  // Untuk dropdown detail, pastikan kita mengambil status utama dari kolom yang benar
  const currentStatusValue = row.data?.[statusColumnName];
  const options = currentStatusValue && statusMaster.mapping ? statusMaster.mapping[currentStatusValue] ?? [] : [];

  // Ambil warna untuk detail progres dari appearance store
  const detailTheme = getColorTheme(labelColors[value] || "gray");

  return (
    <select
      value={value}
      onChange={(e) =>
        updateStatus(row.row_id, currentStatusValue, e.target.value)
      }
      className={`text-xs border rounded px-1 py-0.5 w-full ${detailTheme.bg} ${detailTheme.text} ${detailTheme.border}`}
    >
      <option value="-">-</option>
      {options.map((o) => (
        <option key={o} className="bg-white text-gray-800">{o}</option>
      ))}
    </select>
  );
}
