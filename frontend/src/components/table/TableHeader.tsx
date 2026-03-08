import { useState, useRef, useEffect } from "react";
import { useAppearanceStore } from "../../state/appearanceStore";
import { usePresetStore } from "../../state/presetStore";

type Props = {
  search: string;
  onSearchChange: (val: string) => void;
  onAddPreset: () => void;
  onOpenEditor: () => void;
  onOpenFilter: () => void;
  onOpenEditableColumns: () => void;
};

export function TableHeader({
  search,
  onSearchChange,
  onAddPreset,
  onOpenEditor,
  onOpenFilter,
  onOpenEditableColumns,
}: Props) {
  // Ambil Data Store
  const { presets, activePresetId, setActivePreset, deletePreset } = usePresetStore();
  const activeFilters = useAppearanceStore((s) => s.activeFilters);
  const filterCount = Object.keys(activeFilters).length;

  const activePreset = presets.find((p) => p.id === activePresetId);
  const canDelete = presets.length > 1; // Aturan: Minimal sisa 1 preset

  // State Dropdown Kustom
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown saat klik di luar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Biar gak kepilih saat mau hapus
    if (window.confirm("Yakin hapus preset ini?")) {
        deletePreset(id);
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3 flex flex-col sm:flex-row gap-3 justify-between items-center shadow-sm z-20 relative">

      {/* KIRI: Search Bar Only */}
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <div className="relative flex-1 sm:w-64">
          <input
            type="text"
            placeholder="Cari data..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
          />
          <svg
            className="w-4 h-4 text-gray-400 absolute left-2.5 top-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* KANAN: Preset Dropdown, Edit Button, and Filter */}
      <div className="flex items-center gap-2 w-full sm:w-auto">

        {/* CUSTOM DROPDOWN */}
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center justify-between gap-2 w-48 border border-gray-300 rounded px-3 py-1.5 bg-white text-sm hover:border-blue-500 transition-colors"
            >
                <span className="truncate font-medium text-gray-700">
                    {activePreset ? activePreset.name : "Pilih Preset"}
                </span>
                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* LIST DROPDOWN */}
            {isDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded shadow-xl py-1 z-50 animate-in fade-in zoom-in-95">
                    {presets.map((p) => (
                        <div
                            key={p.id}
                            onClick={() => {
                                setActivePreset(p.id);
                                setIsDropdownOpen(false);
                            }}
                            className={`flex items-center justify-between px-3 py-2 cursor-pointer text-xs ${
                                p.id === activePresetId ? "bg-blue-50 text-blue-700 font-bold" : "text-gray-700 hover:bg-gray-50"
                            }`}
                        >
                            <span className="truncate flex-1">{p.name}</span>

                            {/* Tombol Hapus (Hanya muncul jika bukan satu-satunya) */}
                            {canDelete && (
                                <button
                                    onClick={(e) => handleDelete(e, p.id)}
                                    className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                    title="Hapus Preset"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    ))}

                    {/* Divider */}
                    <div className="border-t my-1"></div>

                    {/* Tombol Tambah Baru di dalam dropdown (Opsional, tapi bagus UX-nya) */}
                    <button
                         onClick={() => {
                            onAddPreset();
                            setIsDropdownOpen(false);
                         }}
                         className="w-full text-left px-3 py-2 text-xs text-blue-600 font-medium hover:bg-blue-50 flex items-center gap-2"
                    >
                         <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Buat Preset Baru
                    </button>
                </div>
            )}
        </div>

        {/* Tombol Edit Preset (Gear Icon) */}
        <button
          onClick={onOpenEditor}
          className="text-gray-500 hover:text-blue-600 hover:bg-gray-100 p-2 rounded border border-transparent hover:border-gray-200 transition-all"
          title="Atur Kolom Preset Ini"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        {/* Filter Button */}
        <button
            onClick={onOpenFilter}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded border shadow-sm transition-colors ${
                filterCount > 0
                    ? "bg-blue-50 border-blue-200 text-blue-700"
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
        >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filter
            {filterCount > 0 && (
                <span className="bg-blue-600 text-white text-[10px] px-1.5 rounded-full">
                    {filterCount}
                </span>
            )}
        </button>

        {/* Editable Columns Button */}
        <button
          onClick={onOpenEditableColumns}
          className="text-gray-500 hover:text-blue-600 hover:bg-gray-100 p-2 rounded border border-transparent hover:border-gray-200 transition-all"
          title="Atur Kolom Editable"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      </div>
    </div>
  );
}