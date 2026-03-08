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
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(record?.data?.[column] ?? "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const editableColumns = useAppearanceStore(state => state.editableColumns);
  const updateCell = useTaskStore(state => state.updateCell);

  // Update local value when record data changes
  useEffect(() => {
    if (record?.data && column) {
      setInputValue(record.data[column] ?? "");
    }
  }, [record?.data, column]);

  // Determine if this column is editable
  const isEditable = editableColumns.includes(column);

  const handleSave = async () => {
    if (inputValue === record?.data?.[column]) {
      // No changes, just exit edit mode
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Call the update function which handles optimistic update and API call
      await updateCell(record.row_id, column, inputValue);
      
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to update record:", err);
      setError("Gagal menyimpan perubahan");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setInputValue(record?.data?.[column] ?? ""); // Revert to original value
    }
  };

  // Check if this is a status or detail column
  const isStatusColumn = column === statusColumnName;
  const isDetailColumn = column === detailColumnName;

  // If it's a status or detail column, return the special StatusCell
  if (isStatusColumn || isDetailColumn) {
    return <StatusCell row={record} col={column} />;
  }

  // If the column is editable, render the editable input
  if (isEditable) {
    return (
      <div className="relative w-full h-full">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (!isEditing) {
              setIsEditing(true);
            }
          }}
          onBlur={(e) => {
            // Only save if we're actually leaving the element completely
            setTimeout(() => {
              if (document.activeElement !== inputRef.current) {
                handleSave();
              }
            }, 0);
          }}
          onClick={(e) => {
            e.stopPropagation(); // Prevent triggering other click handlers
            if (!isEditing) {
              setIsEditing(true);
              // Focus the input after setting isEditing to true
              setTimeout(() => {
                if (inputRef.current) {
                  inputRef.current.focus();
                  inputRef.current.select(); // Select all text for easy editing
                }
              }, 0);
            }
          }}
          readOnly={!isEditing}
          className={`
            w-full h-full px-2 py-2 text-xs rounded focus:outline-none
            ${isEditing
              ? 'border border-blue-500 ring-1 ring-blue-200 bg-white'
              : 'border border-transparent bg-gray-50 cursor-pointer hover:bg-gray-100 hover:border-gray-300'}
          `}
        />
        {isLoading && <span className="text-xs text-blue-500 ml-1 absolute top-0 right-0">Menyimpan...</span>}
        {error && <span className="text-xs text-red-500 ml-1 absolute top-0 right-0">{error}</span>}
      </div>
    );
  }

  // For non-editable columns, render as plain text
  return (
    <div className="w-full h-full">
      <span className="text-gray-700 truncate block px-2 py-2">
        {record?.data?.[column] ?? "-"}
      </span>
    </div>
  );
};