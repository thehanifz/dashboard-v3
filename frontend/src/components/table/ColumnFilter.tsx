/**
 * ColumnFilter.tsx
 * Komponen filter kolom universal — dipakai Engineer dan PTL.
 * Semua data diterima via props, tidak ada ketergantungan store internal.
 *
 * Engineer: pass records dari useTaskStore, activeFilters dari useAppearanceStore
 * PTL:      pass records dan activeFilters dari state lokal PTLDetailPanel
 */
import { useMemo, useEffect, useRef, useState } from "react";
import type { SheetRecord } from "../../types/record";

type Props = {
  column:        string;
  records:       SheetRecord[];
  activeFilters: Record<string, string[]>;
  onToggle:      (col: string, val: string) => void;
  onClose:       () => void;
  position:      { top: number; left: number };
};

export default function ColumnFilter({
  column, records, activeFilters, onToggle, onClose, position,
}: Props) {
  const menuRef                     = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const uniqueValues = useMemo(() => {
    const values = new Set<string>();
    records.forEach(r => {
      const val = r.data[column];
      if (val !== undefined && val !== null && String(val).trim() !== "")
        values.add(String(val));
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [records, column]);

  const filteredValues = useMemo(() => {
    if (!searchTerm.trim()) return uniqueValues;
    return uniqueValues.filter(v =>
      v.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [uniqueValues, searchTerm]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const selectedValues = activeFilters[column] ?? [];

  const handleSelectAll = () => {
    filteredValues.forEach(val => {
      if (!selectedValues.includes(val)) onToggle(column, val);
    });
  };

  const handleDeselectAll = () => {
    filteredValues.forEach(val => {
      if (selectedValues.includes(val)) onToggle(column, val);
    });
  };

  const handleReset = () => {
    selectedValues.forEach(val => onToggle(column, val));
  };

  const allFilteredSelected =
    filteredValues.length > 0 && filteredValues.every(v => selectedValues.includes(v));

  return (
    <div
      ref={menuRef}
      className="fixed z-50 flex flex-col rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-100"
      style={{
        top: position.top, left: position.left,
        width: 268, maxHeight: 420,
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
      }}
    >
      {/* Header */}
      <div className="px-3 py-2.5 flex items-center justify-between shrink-0"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-surface2)" }}>
        <div className="flex items-center gap-1.5 min-w-0">
          <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20"
            style={{ color: "var(--accent)" }}>
            <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
          </svg>
          <span className="text-xs font-bold truncate" style={{ color: "var(--text-primary)" }}>
            {column}
          </span>
        </div>
        <button onClick={onClose} className="shrink-0 w-5 h-5 flex items-center justify-center rounded transition-colors text-base leading-none"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"}>
          ×
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="relative">
          <svg className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            style={{ color: "var(--text-muted)" }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Cari nilai..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            autoFocus
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg outline-none"
            style={{
              background: "var(--bg-app)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
            onFocus={e => e.target.style.borderColor = "var(--accent)"}
            onBlur={e => e.target.style.borderColor = "var(--border)"}
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-3 py-1.5 flex items-center gap-1.5 shrink-0"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-surface2)" }}>
        <button
          onClick={handleSelectAll}
          disabled={allFilteredSelected}
          className="flex-1 text-[11px] font-medium px-2 py-1 rounded-lg transition-colors"
          style={{
            background: "var(--accent-soft)",
            color: allFilteredSelected ? "var(--text-muted)" : "var(--accent)",
            opacity: allFilteredSelected ? 0.5 : 1,
          }}>
          Pilih Semua
        </button>
        <button
          onClick={handleDeselectAll}
          disabled={filteredValues.every(v => !selectedValues.includes(v))}
          className="flex-1 text-[11px] font-medium px-2 py-1 rounded-lg transition-colors"
          style={{
            background: "var(--bg-surface)",
            color: "var(--text-secondary)",
            border: "1px solid var(--border)",
            opacity: filteredValues.every(v => !selectedValues.includes(v)) ? 0.5 : 1,
          }}>
          Kosongkan
        </button>
        {selectedValues.length > 0 && (
          <button
            onClick={handleReset}
            className="text-[11px] font-medium px-2 py-1 rounded-lg transition-colors"
            style={{
              background: "#fee2e2",
              color: "#ef4444",
            }}>
            Reset
          </button>
        )}
      </div>

      {/* Options list */}
      <div className="overflow-y-auto p-2 space-y-0.5 flex-1 custom-scrollbar">
        {filteredValues.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 gap-1">
            <svg className="w-8 h-8 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
              style={{ color: "var(--text-muted)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {uniqueValues.length === 0 ? "Tidak ada data" : "Tidak ditemukan"}
            </span>
          </div>
        ) : (
          filteredValues.map(val => {
            const checked = selectedValues.includes(val);
            return (
              <label key={val}
                className="flex items-start gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors select-none"
                style={{ background: checked ? "var(--accent-soft)" : "transparent" }}
                onMouseEnter={e => { if (!checked) (e.currentTarget as HTMLElement).style.background = "var(--bg-surface2)"; }}
                onMouseLeave={e => { if (!checked) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(column, val)}
                  className="mt-0.5 rounded shrink-0"
                  style={{ accentColor: "var(--accent)" }}
                />
                <span className="text-xs break-words leading-relaxed"
                  style={{
                    color: checked ? "var(--accent)" : "var(--text-secondary)",
                    fontWeight: checked ? 600 : 400,
                  }}>
                  {val}
                </span>
              </label>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 text-[10px] flex items-center justify-between rounded-b-xl shrink-0"
        style={{ borderTop: "1px solid var(--border)", background: "var(--bg-surface2)", color: "var(--text-muted)" }}>
        <span>
          <span style={{ color: selectedValues.length > 0 ? "var(--accent)" : "var(--text-muted)", fontWeight: selectedValues.length > 0 ? 600 : 400 }}>
            {selectedValues.length} terpilih
          </span>
          {" "}dari {uniqueValues.length}
        </span>
        {searchTerm && (
          <span>{filteredValues.length} cocok</span>
        )}
      </div>
    </div>
  );
}
