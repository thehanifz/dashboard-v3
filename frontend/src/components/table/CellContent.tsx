import { useState, useEffect, useRef } from "react";
import { StatusCell } from "./StatusCell";
import { useAppearanceStore } from "../../state/appearanceStore";
import { useTaskStore } from "../../state/taskStore";

type CellContentProps = {
  record: any;
  column: string;
  labelColors: Record<string, string>;
  statusColumnName?: string;
  detailColumnName?: string;
};

export const CellContent = ({
  record,
  column,
  labelColors,
  statusColumnName = "StatusPekerjaan",
  detailColumnName = "Detail Progres"
}: CellContentProps) => {
  const [isEditing, setIsEditing]   = useState(false);
  const [inputValue, setInputValue] = useState(record?.data?.[column] ?? "");
  const [isLoading, setIsLoading]   = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const editableColumns = useAppearanceStore(state => state.editableColumns);
  const updateCell      = useTaskStore(state => state.updateCell);

  useEffect(() => {
    if (record?.data && column) {
      setInputValue(record.data[column] ?? "");
    }
  }, [record?.data, column]);

  const isEditable    = editableColumns.includes(column);
  const isStatusColumn = column === statusColumnName;
  const isDetailColumn = column === detailColumnName;

  const handleSave = async () => {
    if (inputValue === record?.data?.[column]) {
      setIsEditing(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await updateCell(record.row_id, column, inputValue);
      setIsEditing(false);
    } catch {
      setError("Gagal menyimpan");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter")  handleSave();
    if (e.key === "Escape") { setIsEditing(false); setInputValue(record?.data?.[column] ?? ""); }
  };

  if (isStatusColumn || isDetailColumn) {
    return <StatusCell row={record} col={column} />;
  }

  if (isEditable) {
    return (
      <div className="relative w-full h-full">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (!isEditing) setIsEditing(true); }}
          onBlur={() => {
            setTimeout(() => {
              if (document.activeElement !== inputRef.current) handleSave();
            }, 0);
          }}
          onClick={e => {
            e.stopPropagation();
            if (!isEditing) {
              setIsEditing(true);
              setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select(); }, 0);
            }
          }}
          readOnly={!isEditing}
          style={{
            width: "100%",
            padding: "4px 8px",
            fontSize: 12,
            borderRadius: 6,
            outline: "none",
            background: isEditing ? "var(--input-bg)" : "var(--bg-surface2)",
            color: "var(--text-primary)",
            border: isEditing
              ? "1px solid var(--input-focus)"
              : "1px solid transparent",
            cursor: isEditing ? "text" : "pointer",
            boxShadow: isEditing ? "0 0 0 2px color-mix(in srgb, var(--accent) 15%, transparent)" : "none",
            transition: "border-color 0.15s, background 0.15s",
          }}
          onMouseEnter={e => {
            if (!isEditing) (e.currentTarget as HTMLElement).style.borderColor = "var(--border-strong)";
          }}
          onMouseLeave={e => {
            if (!isEditing) (e.currentTarget as HTMLElement).style.borderColor = "transparent";
          }}
        />
        {isLoading && (
          <span className="text-[10px] absolute top-0 right-0 mt-1 mr-1" style={{ color: "var(--accent)" }}>
            Menyimpan...
          </span>
        )}
        {error && (
          <span className="text-[10px] absolute top-0 right-0 mt-1 mr-1" style={{ color: "#ef4444" }}>
            {error}
          </span>
        )}
      </div>
    );
  }

  // Non-editable — plain text pakai CSS var
  return (
    <div className="w-full h-full">
      <span className="truncate block px-2 py-2" style={{ color: "var(--text-secondary)" }}>
        {record?.data?.[column] ?? "—"}
      </span>
    </div>
  );
};