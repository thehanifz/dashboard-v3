// PERBAIKAN 1: Gunakan kurung kurawal {} untuk Named Import
import { StatusCell } from "./StatusCell";
import { CellContent } from "./CellContent";
import { getColorTheme } from "../../utils/colorPalette";

export const renderCell = (
  record: any,
  column: string,
  labelColors: Record<string, string>,
  statusColumnName: string = "StatusPekerjaan",
  detailColumnName: string = "Detail Progres"
) => {
  // Always return the same component type to maintain consistent hook counts
  // The CellContent handles all cases internally
  return (
    <CellContent
      record={record}
      column={column}
      labelColors={labelColors}
      statusColumnName={statusColumnName}
      detailColumnName={detailColumnName}
    />
  );
};