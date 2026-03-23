import { useMemo, useState } from "react";
import { useTaskStore } from "../../state/taskStore";
import { useAppearanceStore } from "../../state/appearanceStore";

export default function FilterManager({ onClose }: { onClose: () => void }) {
  const records = useTaskStore((s) => s.records);
  const { activeFilters, toggleFilter, clearFilters } = useAppearanceStore();
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const statusMaster = useTaskStore((s) => s.statusMaster);
  const statusColumnName = statusMaster?.status_column || "StatusPekerjaan";

  const filterOptions = useMemo(() => {
    const options: Record<string, Set<string>> = {};
    const keysToIgnore = ["row_id", statusColumnName];
    records.forEach((r) => {
      Object.entries(r.data).forEach(([key, value]) => {
        if (keysToIgnore.includes(key) || !value) return;
        if (!options[key]) options[key] = new Set();
        options[key].add(String(value));
      });
    });
    return options;
  }, [records, statusColumnName]);

  const availableKeys = Object.keys(filterOptions).sort();

  return (
    <>
      <div className="fixed inset-0 z-40 th-overlay" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-80 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200"
        style={{ background: "var(--bg-surface)", border: "none", borderLeft: "1px solid var(--border)" }}>

        {/* Header */}
        <div className="flex justify-between items-center p-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-surface2)" }}>
          <div>
            <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Filter Data</h3>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Filter berdasarkan isi data</p>
          </div>
          <button onClick={onClose} className="text-xl leading-none w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"}>
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {availableKeys.length === 0 && (
            <div className="text-center py-10 text-sm" style={{ color: "var(--text-muted)" }}>
              Tidak ada data untuk difilter.
            </div>
          )}
          {availableKeys.map((key) => {
            const values = Array.from(filterOptions[key]).sort();
            const selectedCount = activeFilters[key]?.length || 0;
            const isExpanded = expandedKey === key;
            return (
              <div key={key} className="rounded-lg overflow-hidden"
                style={{ border: "1px solid var(--border)" }}>
                <button
                  onClick={() => setExpandedKey(isExpanded ? null : key)}
                  className="w-full flex items-center justify-between p-3 text-left text-sm font-medium transition-colors"
                  style={{
                    background: isExpanded ? "var(--accent-soft)" : "var(--bg-surface2)",
                    color: isExpanded ? "var(--accent)" : "var(--text-primary)",
                  }}>
                  <span>{key}</span>
                  <div className="flex items-center gap-2">
                    {selectedCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                        style={{ background: "var(--accent)", color: "#fff" }}>
                        {selectedCount}
                      </span>
                    )}
                    <svg className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
                {isExpanded && (
                  <div className="p-3 max-h-60 overflow-y-auto space-y-1 custom-scrollbar"
                    style={{ borderTop: "1px solid var(--border)", background: "var(--bg-surface)" }}>
                    {values.map((val) => {
                      const isChecked = !!activeFilters[key]?.includes(val);
                      return (
                        <label key={val}
                          className="flex items-start gap-2 cursor-pointer p-1.5 rounded-lg transition-colors select-none"
                          style={{ background: isChecked ? "var(--accent-soft)" : "transparent" }}
                          onMouseEnter={e => { if (!isChecked) (e.currentTarget as HTMLElement).style.background = "var(--bg-surface2)"; }}
                          onMouseLeave={e => { if (!isChecked) (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                          <input type="checkbox"
                            className="mt-0.5 rounded shrink-0"
                            style={{ accentColor: "var(--accent)" }}
                            checked={isChecked}
                            onChange={() => toggleFilter(key, val)} />
                          <span className="text-xs break-words"
                            style={{ color: isChecked ? "var(--accent)" : "var(--text-secondary)", fontWeight: isChecked ? 600 : 400 }}>
                            {val}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 shrink-0 flex justify-between items-center"
          style={{ borderTop: "1px solid var(--border)", background: "var(--bg-surface2)" }}>
          <button onClick={clearFilters}
            className="text-xs font-medium transition-colors"
            style={{ color: "#ef4444" }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = "0.7"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = "1"}>
            Reset Semua
          </button>
          <button onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ background: "var(--accent)" }}>
            Terapkan
          </button>
        </div>
      </div>
    </>
  );
}
