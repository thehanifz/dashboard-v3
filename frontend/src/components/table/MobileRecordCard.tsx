import { useEffect, useState, type ReactNode } from "react";
import { useTaskStore } from "../../state/taskStore";
import { useRole } from "../../hooks/useRole";
import type { SheetRecord, StatusMaster } from "../../types/record";

type Props = {
  record: SheetRecord;
  columns: string[];
  statusMaster: StatusMaster | null;
  canEditColumn?: (column: string) => boolean;
  onCommit?: (rowId: number, column: string, value: string) => Promise<void> | void;
  onStatusChange?: (rowId: number, status: string, detail?: string) => Promise<void> | void;
  actions?: ReactNode;
};

function MobileEditSheet({
  open,
  column,
  value,
  saving,
  onChange,
  onCancel,
  onSave,
}: {
  open: boolean;
  column: string;
  value: string;
  saving: boolean;
  onChange: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end md:hidden"
      style={{ background: "rgba(0,0,0,0.42)" }}
      onMouseDown={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        className="w-full rounded-t-3xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl"
        style={{ background: "var(--bg-surface)", borderTop: "1px solid var(--border)" }}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: "var(--border-strong)" }} />
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Edit data
            </p>
            <h3 className="text-sm font-semibold mt-0.5 truncate" style={{ color: "var(--text-primary)" }}>
              {column}
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "var(--bg-surface2)", color: "var(--text-muted)" }}
            aria-label="Tutup"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <textarea
          autoFocus
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={5}
          className="w-full rounded-2xl px-3 py-3 text-sm outline-none resize-none"
          style={{
            background: "var(--input-bg, var(--bg-surface2))",
            color: "var(--text-primary)",
            border: "1px solid var(--accent)",
            boxShadow: "0 0 0 3px color-mix(in srgb, var(--accent) 12%, transparent)",
          }}
          onKeyDown={e => {
            if (e.key === "Escape") onCancel();
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") onSave();
          }}
        />

        <div className="flex gap-2 mt-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="flex-1 min-h-11 rounded-xl text-sm font-medium"
            style={{ background: "var(--bg-surface2)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="flex-1 min-h-11 rounded-xl text-sm font-semibold text-white"
            style={{ background: "var(--accent)", opacity: saving ? 0.7 : 1 }}
          >
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MobileRecordCard({
  record,
  columns,
  statusMaster,
  canEditColumn,
  onCommit,
  onStatusChange,
  actions,
}: Props) {
  const { canEditColumn: roleCanEditColumn } = useRole();
  const updateCell = useTaskStore(s => s.updateCell);
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState<{ column: string; value: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const statusColumn = statusMaster?.status_column ?? "";
  const detailColumn = statusMaster?.detail_column ?? "";
  const primaryColumns = columns.slice(0, 3);
  const secondaryColumns = columns.slice(3);

  useEffect(() => {
    if (!editing) return;
    const latest = record.data?.[editing.column] ?? "";
    if (!saving && latest !== editing.value) setEditing(prev => prev ? { ...prev, value: latest } : null);
  }, [record.data, editing?.column]);

  const isEditable = (column: string) => {
    if (column === statusColumn || column === detailColumn) return false;
    return canEditColumn ? canEditColumn(column) : roleCanEditColumn(column);
  };

  const saveEdit = async () => {
    if (!editing) return;
    const { column, value } = editing;
    const original = record.data?.[column] ?? "";
    if (value === original) {
      setEditing(null);
      return;
    }

    setSaving(true);
    try {
      if (onCommit) await onCommit(record.row_id, column, value);
      else await updateCell(record.row_id, column, value);
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  const renderValue = (column: string, primary = false) => {
    const value = record.data?.[column] ?? "";
    const isStatus = column === statusColumn;
    const isDetail = column === detailColumn;
    const editable = isEditable(column);

    if ((isStatus || isDetail) && statusMaster && onStatusChange) {
      const options = isStatus
        ? statusMaster.primary ?? []
        : (statusMaster.mapping?.[record.data?.[statusColumn] ?? ""] ?? []);

      return (
        <div className="min-w-0" onClick={e => e.stopPropagation()}>
          <select
            value={value}
            onChange={e => onStatusChange(
              record.row_id,
              isStatus ? e.target.value : (record.data?.[statusColumn] ?? ""),
              isDetail ? e.target.value : undefined,
            )}
            className="w-full min-h-10 rounded-xl px-3 text-sm outline-none"
            style={{
              background: "var(--bg-surface2)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
            }}
          >
            <option value={isStatus ? "" : "-"}>{isStatus ? "-" : "-"}</option>
            {options.map(option => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
      );
    }

    return (
      <button
        type="button"
        disabled={!editable}
        onClick={() => editable && setEditing({ column, value })}
        className={`w-full text-left ${editable ? "cursor-text" : "cursor-default"}`}
      >
        <div
          className={`${primary ? "text-sm font-semibold" : "text-sm"} whitespace-pre-wrap break-words leading-5`}
          style={{ color: value ? "var(--text-primary)" : "var(--text-muted)" }}
        >
          {value || "—"}
        </div>
      </button>
    );
  };

  return (
    <article
      className="rounded-2xl p-3.5 shadow-sm"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0 grid grid-cols-1 gap-3">
          {primaryColumns.map((column, index) => (
            <div key={column} className="min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  {column}
                </span>
                {isEditable(column) && (
                  <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} style={{ color: "var(--accent)" }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                )}
              </div>
              {renderValue(column, index === 0)}
            </div>
          ))}
        </div>

        {actions && (
          <div className="flex items-center gap-1 shrink-0 pt-0.5">
            {actions}
          </div>
        )}
      </div>

      {secondaryColumns.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            className="w-full flex items-center justify-between gap-3 mt-3 pt-3 text-xs font-medium"
            style={{ borderTop: "1px solid var(--border)", color: "var(--accent)" }}
          >
            <span>{expanded ? "Sembunyikan informasi" : `Lihat ${secondaryColumns.length} informasi lainnya`}</span>
            <svg className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expanded && (
            <div className="grid grid-cols-1 gap-3 mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
              {secondaryColumns.map(column => (
                <div key={column} className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                      {column}
                    </span>
                    {isEditable(column) && (
                      <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} style={{ color: "var(--accent)" }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    )}
                  </div>
                  {renderValue(column)}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <MobileEditSheet
        open={!!editing}
        column={editing?.column ?? ""}
        value={editing?.value ?? ""}
        saving={saving}
        onChange={value => setEditing(prev => prev ? { ...prev, value } : prev)}
        onCancel={() => !saving && setEditing(null)}
        onSave={saveEdit}
      />
    </article>
  );
}
