import { useMemo, useState } from "react";
import type { SheetRecord } from "../../types/record";

type Props = {
  open: boolean;
  columns: string[];
  records: SheetRecord[];
  activeFilters: Record<string, string[]>;
  onToggle: (column: string, value: string) => void;
  onReset: () => void;
  onClose: () => void;
  title?: string;
};

export default function MobileFilterSheet({
  open,
  columns,
  records,
  activeFilters,
  onToggle,
  onReset,
  onClose,
  title = "Filter Data",
}: Props) {
  const [activeColumn, setActiveColumn] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const availableColumns = useMemo(
    () => columns.filter(Boolean),
    [columns]
  );

  const values = useMemo(() => {
    if (!activeColumn) return [];
    const unique = Array.from(new Set(
      records.map(record => String(record.data?.[activeColumn] ?? ""))
    ));
    unique.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
    if (!search.trim()) return unique;
    const q = search.trim().toLowerCase();
    return unique.filter(value => value.toLowerCase().includes(q));
  }, [activeColumn, records, search]);

  if (!open) return null;

  const selectedCount = Object.values(activeFilters).reduce((sum, vals) => sum + vals.length, 0);

  return (
    <div
      className="fixed inset-0 z-[70] md:hidden flex items-end"
      style={{ background: "rgba(0,0,0,0.42)" }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-h-[82vh] rounded-t-3xl overflow-hidden shadow-2xl"
        style={{ background: "var(--bg-surface)", borderTop: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b" style={{ borderColor: "var(--border)" }}>
          {activeColumn && (
            <button
              type="button"
              onClick={() => { setActiveColumn(null); setSearch(""); }}
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "var(--bg-surface2)", color: "var(--text-secondary)" }}
              aria-label="Kembali"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              {activeColumn ? "Filter kolom" : title}
            </div>
            <div className="text-sm font-semibold truncate mt-0.5" style={{ color: "var(--text-primary)" }}>
              {activeColumn || `${selectedCount} filter aktif`}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "var(--bg-surface2)", color: "var(--text-muted)" }}
            aria-label="Tutup"
          >
            ×
          </button>
        </div>

        {!activeColumn ? (
          <>
            <div className="px-4 py-3 border-b flex items-center justify-between gap-3" style={{ borderColor: "var(--border)" }}>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                {selectedCount > 0 ? `${selectedCount} pilihan aktif` : "Pilih kolom yang ingin difilter"}
              </div>
              {selectedCount > 0 && (
                <button type="button" onClick={onReset} className="text-xs font-medium" style={{ color: "var(--accent)" }}>
                  Reset semua
                </button>
              )}
            </div>
            <div className="max-h-[62vh] overflow-y-auto p-3 space-y-2 custom-scrollbar">
              {availableColumns.map(column => {
                const count = activeFilters[column]?.length ?? 0;
                return (
                  <button
                    type="button"
                    key={column}
                    onClick={() => setActiveColumn(column)}
                    className="w-full flex items-center justify-between gap-3 rounded-2xl px-3.5 py-3 text-left"
                    style={{ background: count ? "var(--accent-soft)" : "var(--bg-surface2)", border: `1px solid ${count ? "var(--accent)" : "var(--border)"}` }}
                  >
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>{column}</span>
                      <span className="block text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {count ? `${count} nilai dipilih` : "Belum difilter"}
                      </span>
                    </span>
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: count ? "var(--accent)" : "var(--text-muted)" }}>
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                );
              })}
            </div>
            <div className="px-4 py-3 border-t" style={{ borderColor: "var(--border)" }}>
              <button type="button" onClick={onClose} className="w-full min-h-11 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--accent)" }}>
                Selesai
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
              <div className="relative">
                <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: "var(--text-muted)" }}>
                  <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  autoFocus
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Cari nilai..."
                  className="w-full rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none"
                  style={{ background: "var(--bg-app)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
                />
              </div>
            </div>
            <div className="max-h-[54vh] overflow-y-auto p-3 space-y-1 custom-scrollbar">
              {values.length === 0 ? (
                <div className="py-10 text-center text-xs" style={{ color: "var(--text-muted)" }}>Tidak ada nilai.</div>
              ) : values.map(value => {
                const checked = activeFilters[activeColumn]?.includes(value) ?? false;
                return (
                  <label
                    key={value}
                    className="flex items-start gap-3 rounded-xl px-3 py-2.5"
                    style={{ background: checked ? "var(--accent-soft)" : "transparent" }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggle(activeColumn, value)}
                      className="mt-0.5 h-4 w-4 rounded"
                      style={{ accentColor: "var(--accent)" }}
                    />
                    <span className="text-sm break-words leading-5" style={{ color: checked ? "var(--accent)" : "var(--text-secondary)", fontWeight: checked ? 600 : 400 }}>
                      {value || "(kosong)"}
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="px-4 py-3 border-t flex gap-2" style={{ borderColor: "var(--border)" }}>
              <button
                type="button"
                onClick={() => {
                  (activeFilters[activeColumn] ?? []).forEach(value => onToggle(activeColumn, value));
                  setSearch("");
                }}
                disabled={!activeFilters[activeColumn]?.length}
                className="flex-1 min-h-11 rounded-xl text-sm font-medium disabled:opacity-40"
                style={{ background: "var(--bg-surface2)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
              >
                Reset kolom
              </button>
              <button type="button" onClick={() => { setActiveColumn(null); setSearch(""); }} className="flex-1 min-h-11 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--accent)" }}>
                Selesai
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
