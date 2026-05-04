import { CellContent } from "../components/table/CellContent";
import { STATUS_COL_PRIMARY, STATUS_COL_DETAIL } from "../constants/columns";

export const renderCell = (
  record: any,
  column: string,
  labelColors: Record<string, string>,
  statusColumnName: string = STATUS_COL_PRIMARY,
  detailColumnName: string  = STATUS_COL_DETAIL
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
