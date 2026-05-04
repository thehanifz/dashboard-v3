import { StatusCell } from "../components/table/StatusCell";
import { CellContent } from "../components/table/CellContent";
import { getColorTheme } from "./colorPalette";

export const renderCell = (
  record: any,
  column: string,
  labelColors: Record<string, string>,
  statusColumnName: string = "Status Pekerjaan",
  detailColumnName: string = "Detail Progres"
) => {
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
