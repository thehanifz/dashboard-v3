/**
 * PTLColumnFilter.tsx
 * Versi ColumnFilter khusus PTL — tidak pakai useTaskStore/useAppearanceStore.
 * Menerima records, activeFilters, dan onToggle via props.
 */
import { useMemo, useEffect, useRef, useState } from "react";

interface SheetRecord {
  id:     string;
  row_id: number;
  data:   Record<string, string>;
}

type Props = {
  column:        string;
  records:       SheetRecord[];
  activeFilters: Record<string, string[]>;
  onToggle:      (col: string, val: string) => void;
  onClose:       () => void;
  position:      { top: number; left: number };
};

export default function PTLColumnFilter({ column, records, activeFilters, onToggle, onClose, position }: Props) {
  const menuRef                     = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const uniqueValues = useMemo(() => {
    const values = new Set<string>();
    records.forEach(r => { const val = r.data[column]; if (val) values.add(String(val)); });
    return Array.from(values).sort();
  }, [records, column]);

  const filteredValues = useMemo(() => {
    if (!searchTerm) return uniqueValues;
    return uniqueValues.filter(v => v.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [uniqueValues, searchTerm]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const selectedValues = activeFilters[column] || [];

  return (
    <div ref={menuRef}
      className="fixed z-50 rounded-xl shadow-2xl flex flex-col"
      style={{
        top: position.top, left: position.left,
        width: 260, maxHeight: 380,
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
      }}>
      {/* Header */}
      <div className="px-3 py-2.5 flex items-center justify-between shrink-0"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-surface2)" }}>
        <span className="text-xs font-bold truncate" style={{ color: "var(--text-primary)" }}>
          Filter: {column}
        </span>
        <button onClick={onClose} className="text-lg leading-none" style={{ color: "var(--text-muted)" }}>×</button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
        <input type="text" placeholder="Cari nilai..." value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)} autoFocus
          className="w-full px-2.5 py-1.5 text-xs rounded-lg border outline-none"
          style={{ background: "var(--bg-app)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          onFocus={e => e.target.style.borderColor = "var(--accent)"}
          onBlur={e => e.target.style.borderColor = "var(--border)"} />
      </div>

      {/* Options */}
      <div className="overflow-y-auto p-2 space-y-0.5 flex-1 custom-scrollbar">
        {filteredValues.length === 0 ? (
          <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>
            {uniqueValues.length === 0 ? "Tidak ada data" : "Tidak ditemukan"}
          </p>
        ) : filteredValues.map(val => {
          const checked = selectedValues.includes(val);
          return (
            <label key={val} className="flex items-start gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors"
              style={{ background: checked ? "var(--accent-soft)" : "transparent" }}>
              <input type="checkbox" checked={checked} onChange={() => onToggle(column, val)}
                className="mt-0.5 rounded" style={{ accentColor: "var(--accent)" }} />
              <span className="text-xs break-words"
                style={{ color: checked ? "var(--accent)" : "var(--text-secondary)", fontWeight: checked ? 600 : 400 }}>
                {val}
              </span>
            </label>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 text-[10px] text-center rounded-b-xl shrink-0"
        style={{ borderTop: "1px solid var(--border)", background: "var(--bg-surface2)", color: "var(--text-muted)" }}>
        {selectedValues.length} terpilih · {filteredValues.length} ditampilkan
      </div>
    </div>
  );
}