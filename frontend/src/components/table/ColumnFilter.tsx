import { useMemo, useEffect, useRef, useState } from "react";
import { useTaskStore } from "../../state/taskStore";
import { useAppearanceStore } from "../../state/appearanceStore";

type Props = {
  column: string;
  onClose: () => void;
  // Posisi popup
  position: { top: number; left: number };
};

export default function ColumnFilter({ column, onClose, position }: Props) {
  const records = useTaskStore((s) => s.records);
  const { activeFilters, toggleFilter } = useAppearanceStore();
  const menuRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // 1. Ambil nilai unik HANYA untuk kolom ini
  const uniqueValues = useMemo(() => {
    const values = new Set<string>();
    records.forEach((r) => {
      const val = r.data[column];
      if (val) values.add(String(val));
    });
    return Array.from(values).sort();
  }, [records, column]);

  // 2. Filter values based on search term
  const filteredValues = useMemo(() => {
    if (!searchTerm) return uniqueValues;
    return uniqueValues.filter(value =>
      value.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [uniqueValues, searchTerm]);

  // 2. Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const selectedValues = activeFilters[column] || [];

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 w-64 animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-[400px]"
      style={{ top: position.top, left: position.left }}
    >
      <div className="p-3 border-b bg-gray-50 flex justify-between items-center rounded-t-lg">
        <span className="text-xs font-bold text-gray-700 truncate">
          Filter: {column}
        </span>
        <button onClick={onClose} className="text-gray-400 hover:text-red-500">
          &times;
        </button>
      </div>

      {/* Search Input */}
      <div className="p-2 border-b bg-gray-50">
        <input
          type="text"
          placeholder="Cari..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          autoFocus
        />
      </div>

      <div className="overflow-y-auto p-2 space-y-1 flex-1 custom-scrollbar">
        {filteredValues.length === 0 && (
            <div className="text-xs text-gray-400 text-center py-4">
              {uniqueValues.length === 0 ? "Kosong" : "Tidak ditemukan"}
            </div>
        )}

        {filteredValues.map((val) => {
          const isChecked = selectedValues.includes(val);
          return (
            <label
              key={val}
              className="flex items-start gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                checked={isChecked}
                onChange={() => toggleFilter(column, val)}
              />
              <span className={`text-xs break-words ${isChecked ? "text-gray-900 font-medium" : "text-gray-600"}`}>
                {val}
              </span>
            </label>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-2 border-t bg-gray-50 text-[10px] text-gray-400 text-center rounded-b-lg">
          {selectedValues.length} terpilih dari {uniqueValues.length} ({filteredValues.length} ditampilkan)
      </div>
    </div>
  );
}