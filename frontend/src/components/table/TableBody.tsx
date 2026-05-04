import { renderCell }      from "../../utils/renderCell";
import { getColorTheme }   from "../../utils/colorPalette";
import BaiActionButton     from "./BaiActionButton";
import TeskomActionButton  from "./TeskomActionButton";
import type { DynamicTableConfig } from "../../services/settingsApi";

const MIN_COL_WIDTH     = 60;
const DEFAULT_COL_WIDTH = 150;

type Row = { row_id: number; data: Record<string, string> };

type StatusMaster = {
  status_column: string;
  detail_column: string;
  primary: string[];
};

type CellEditor = {
  editingCell:     { rowId: number; col: string } | null;
  editingValue:    string;
  setEditingValue: (v: string) => void;
  canEditCell:     (col: string) => boolean;
  handleCellClick: (rowId: number, col: string, val: string) => void;
  handleCellCommit:(rowId: number, col: string) => void;
  handleCellKeyDown:(e: React.KeyboardEvent, rowId: number, col: string) => void;
};

type Props = {
  rows:          Row[];
  columns:       string[];
  widths:        Record<string, number>;
  pinnedColumns: string[];
  statusMaster:  StatusMaster | null;
  columnColors:  Record<string, string>;
  labelColors:   Record<string, string>;
  tableConfig:   DynamicTableConfig;
  editor:        CellEditor;
  onToast:       (msg: string, type?: "success" | "error") => void;
};

export function TableBody({
  rows, columns, widths, pinnedColumns,
  statusMaster, columnColors, labelColors,
  tableConfig, editor, onToast,
}: Props) {
  const { editingCell, editingValue, setEditingValue,
          canEditCell, handleCellClick, handleCellCommit, handleCellKeyDown } = editor;

  return (
    <tbody>
      {rows.map((r, rowIdx) => {
        const statusCol = statusMaster?.status_column;
        const status    = statusCol ? r.data?.[statusCol] : undefined;
        const themeId   = status ? (columnColors[status] || "gray") : "gray";
        const theme     = getColorTheme(themeId);

        return (
          <tr
            key={r.row_id}
            className={`th-table-row ${rowIdx % 2 !== 0 ? "th-table-row-alt" : ""}`}
            style={{ background: rowIdx % 2 !== 0 ? "var(--table-row-alt)" : "var(--bg-surface)" }}
          >
            {/* Kolom Aksi */}
            <td
              className="sticky left-0"
              style={{
                zIndex: 10, width: 64, minWidth: 64,
                padding: "4px 8px", textAlign: "center",
                borderRight: "1px solid var(--border)",
                borderBottom: "1px solid var(--border)",
                background: rowIdx % 2 !== 0 ? "var(--table-row-alt)" : "var(--bg-surface)",
              }}
            >
              <div className="flex items-center justify-center gap-1">
                <BaiActionButton
                  rowId={r.row_id}
                  idPa={r.data[tableConfig.colIdPa] || ""}
                  namaPerusahaan={r.data[tableConfig.colNamaPerusahaan] || ""}
                  onToast={onToast}
                />
                <TeskomActionButton idPa={r.data[tableConfig.colIdPa] || ""} />
              </div>
            </td>

            {/* Kolom Data */}
            {columns.map(col => {
              const colWidth   = widths[col] ?? DEFAULT_COL_WIDTH;
              const isEditing  = editingCell?.rowId === r.row_id && editingCell?.col === col;
              const editable   = canEditCell(col);
              const isPinned   = pinnedColumns.includes(col);
              const pinnedLeft = isPinned
                ? 64 + pinnedColumns
                    .slice(0, pinnedColumns.indexOf(col))
                    .reduce((acc, c) => acc + (widths[c] ?? DEFAULT_COL_WIDTH), 0)
                : undefined;

              return (
                <td
                  key={col}
                  className="px-3 py-2 overflow-hidden"
                  style={{
                    borderRight:  "1px solid var(--border)",
                    borderBottom: "1px solid var(--border)",
                    width: colWidth, minWidth: MIN_COL_WIDTH, maxWidth: colWidth,
                    cursor: editable ? "pointer" : "default",
                    ...(isPinned ? {
                      position:   "sticky",
                      left:       pinnedLeft,
                      zIndex:     10,
                      background: rowIdx % 2 !== 0 ? "var(--table-row-alt)" : "var(--bg-surface)",
                      boxShadow:  "2px 0 4px rgba(0,0,0,0.06)",
                    } : {}),
                  }}
                  title={isEditing ? undefined : r.data[col]}
                  onClick={() => !isEditing && handleCellClick(r.row_id, col, r.data[col] ?? "")}
                >
                  {isEditing ? (
                    <input
                      autoFocus
                      value={editingValue}
                      onChange={e => setEditingValue(e.target.value)}
                      onBlur={() => handleCellCommit(r.row_id, col)}
                      onKeyDown={e => handleCellKeyDown(e, r.row_id, col)}
                      className="w-full text-xs px-1 py-0.5 rounded border outline-none"
                      style={{
                        background:   "var(--bg-app)",
                        color:        "var(--text-primary)",
                        borderColor:  "var(--accent)",
                        width:        `${colWidth - 24}px`,
                      }}
                    />
                  ) : (
                    <div
                      className="truncate w-full block"
                      style={{
                        maxWidth: `${colWidth - 24}px`,
                        outline: editable ? "1px dashed transparent" : undefined,
                      }}
                      onMouseEnter={e => { if (editable) (e.currentTarget as HTMLElement).style.outline = "1px dashed var(--accent)"; }}
                      onMouseLeave={e => { if (editable) (e.currentTarget as HTMLElement).style.outline = "1px dashed transparent"; }}
                    >
                      {statusMaster?.status_column && statusMaster?.detail_column
                        ? renderCell(r, col, labelColors, statusMaster.status_column, statusMaster.detail_column)
                        : renderCell(r, col, labelColors)
                      }
                    </div>
                  )}
                </td>
              );
            })}
          </tr>
        );
      })}
    </tbody>
  );
}
