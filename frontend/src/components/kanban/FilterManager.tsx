import { useMemo, useState } from "react";
import { useTaskStore } from "../../state/taskStore";
import { useAppearanceStore } from "../../state/appearanceStore";

export default function FilterManager({ onClose }: { onClose: () => void }) {
  const records = useTaskStore((s) => s.records);
  const { activeFilters, toggleFilter, clearFilters } = useAppearanceStore();
  
  // State untuk accordion (menu mana yang sedang dibuka)
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  // 1. EXTRACT UNIQUE VALUES (The Scanner Logic)
  // Kita hitung opsi apa saja yang tersedia dari data yang ada
  const statusMaster = useTaskStore((s) => s.statusMaster);
  const statusColumnName = statusMaster?.status_column || "StatusPekerjaan";

  const filterOptions = useMemo(() => {
    const options: Record<string, Set<string>> = {};
    const keysToIgnore = ["row_id", statusColumnName]; // Status punya filter sendiri, ID tidak perlu difilter

    records.forEach((r) => {
      Object.entries(r.data).forEach(([key, value]) => {
        if (keysToIgnore.includes(key)) return;
        if (!value) return; // Skip kosong

        if (!options[key]) {
          options[key] = new Set();
        }
        options[key].add(String(value));
      });
    });

    return options;
  }, [records, statusColumnName]);

  // Convert Keys ke Array agar bisa diloop
  const availableKeys = Object.keys(filterOptions).sort();

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 th-overlay" onClick={onClose} />

      {/* Modal - Sidebar style di kanan */}
      <div className="fixed top-0 right-0 h-full w-80 shadow-2xl z-50 th-modal flex flex-col animate-in slide-in-from-right duration-200 border-l">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b bg-gray-50">
          <div>
            <h3 className="font-bold text-gray-800">Filter Data</h3>
            <p className="text-xs text-gray-500">Filter berdasarkan isi data</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 text-xl">
            &times;
          </button>
        </div>

        {/* Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {availableKeys.length === 0 && (
                <div className="text-center text-gray-400 py-10 text-sm">
                    Tidak ada data untuk difilter.
                </div>
            )}

            {availableKeys.map((key) => {
                const values = Array.from(filterOptions[key]).sort();
                const selectedCount = activeFilters[key]?.length || 0;
                const isExpanded = expandedKey === key;

                return (
                    <div key={key} className="border rounded-lg overflow-hidden transition-all bg-white">
                        {/* Accordion Header */}
                        <button
                            onClick={() => setExpandedKey(isExpanded ? null : key)}
                            className={`w-full flex items-center justify-between p-3 text-left text-sm font-medium transition-colors ${
                                isExpanded ? "bg-blue-50 text-blue-800" : "hover:bg-gray-50 text-gray-700"
                            }`}
                        >
                            <span>{key}</span>
                            <div className="flex items-center gap-2">
                                {selectedCount > 0 && (
                                    <span className="bg-blue-600 text-white text-[10px] px-1.5 rounded-full">
                                        {selectedCount}
                                    </span>
                                )}
                                <svg className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </button>

                        {/* Accordion Body */}
                        {isExpanded && (
                            <div className="p-3 bg-gray-50/50 border-t max-h-60 overflow-y-auto space-y-1 custom-scrollbar">
                                {values.map((val) => {
                                    const isChecked = activeFilters[key]?.includes(val);
                                    return (
                                        <label key={val} className="flex items-start gap-2 cursor-pointer p-1 rounded hover:bg-gray-100">
                                            <input
                                                type="checkbox"
                                                className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                checked={isChecked}
                                                onChange={() => toggleFilter(key, val)}
                                            />
                                            <span className={`text-xs break-words ${isChecked ? "font-semibold text-gray-900" : "text-gray-600"}`}>
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

        {/* Footer Actions */}
        <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
            <button
                onClick={clearFilters}
                className="text-xs text-red-600 hover:underline font-medium"
            >
                Reset Semua
            </button>
            <button
                onClick={onClose}
                className="bg-gray-900 text-white px-6 py-2 rounded text-sm font-medium hover:bg-gray-800 transition-colors"
            >
                Terapkan
            </button>
        </div>
      </div>
    </>
  );
}