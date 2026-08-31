import type { ReactNode } from "react";
import MobileRecordCard from "./MobileRecordCard";
import type { SheetRecord, StatusMaster } from "../../types/record";

type Props = {
  records: SheetRecord[];
  columns: string[];
  statusMaster: StatusMaster | null;
  canEditColumn?: (column: string) => boolean;
  onCommit?: (rowId: number, column: string, value: string) => Promise<void> | void;
  renderActions?: (record: SheetRecord) => ReactNode;
  emptyText?: string;
};

export default function MobileRecordList({
  records,
  columns,
  statusMaster,
  canEditColumn,
  onCommit,
  renderActions,
  emptyText = "Tidak ada data yang sesuai.",
}: Props) {
  if (records.length === 0) {
    return (
      <div
        className="flex min-h-40 items-center justify-center rounded-2xl p-6 text-center"
        style={{ background: "var(--bg-surface)", border: "1px dashed var(--border)" }}
      >
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      {records.map(record => (
        <MobileRecordCard
          key={record.row_id}
          record={record}
          columns={columns}
          statusMaster={statusMaster}
          canEditColumn={canEditColumn}
          onCommit={onCommit}
          actions={renderActions?.(record)}
        />
      ))}
    </div>
  );
}
