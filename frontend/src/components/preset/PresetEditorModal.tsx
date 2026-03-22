/**
 * PresetEditorModal.tsx
 * Modal edit preset universal — support Engineer dan PTL.
 *
 * scope="engineer" → pakai usePresetStore (Zustand, id: string)
 * scope="ptl"      → pakai usePresets("ptl") hook (DB, id: number)
 *
 * Sorting kolom: pure alfabetis A-Z.
 * Label "Baru" tetap muncul untuk kolom yang baru ditambah ke preset.
 */
import { useState, useMemo, useEffect } from "react";
import { useTaskStore }   from "../../state/taskStore";
import { usePresetStore } from "../../state/presetStore";
import { usePresets }     from "../../hooks/usePresets";
import { useToast }       from "../../utils/useToast";

type Props = {
  presetId: string | number;
  scope:    "engineer" | "ptl";
  onClose:  () => void;
  /** Kolom dari sheet PTL — wajib kalau scope="ptl" */
  allCols?: string[];
  /** Dipanggil setelah save/delete berhasil — untuk trigger refetch di parent */
  onSaved?: () => void;
};

export default function PresetEditorModal({ presetId, scope, onClose, allCols, onSaved }: Props) {

  // ── Engineer store ─────────────────────────────────────────────────────────
  const engRecords       = useTaskStore((s) => s.records) ?? [];
  const engPresets       = usePresetStore((s) => s.presets) ?? [];
  const engUpdateColumns = usePresetStore((s) => s.updatePresetColumns);
  const engRename        = usePresetStore((s) => s.renamePreset);
  const engDelete        = usePresetStore((s) => s.deletePreset);

  // ── PTL hook ───────────────────────────────────────────────────────────────
  const { presets: ptlPresets, updatePreset: ptlUpdate, deletePreset: ptlDelete } = usePresets("ptl");

  const { show: showToast } = useToast();

  // ── Resolve preset aktif ───────────────────────────────────────────────────
  const preset = useMemo(() => {
    if (scope === "engineer") {
      return engPresets.find((p) => p.id === (presetId as string)) ?? null;
    }
    return ptlPresets.find((p) => p.id === (presetId as number)) ?? null;
  }, [scope, presetId, engPresets, ptlPresets]);

  // ── Local state ────────────────────────────────────────────────────────────
  const [localName,       setLocalName]       = useState("");
  const [selectedCols,    setSelectedCols]    = useState<string[]>([]);
  const [searchTerm,      setSearchTerm]      = useState("");
  const [initialSnapshot, setInitialSnapshot] = useState<Set<string>>(new Set());
  const [saving,          setSaving]          = useState(false);

  useEffect(() => {
    if (preset) {
      setLocalName(preset.name);
      setSelectedCols(preset.columns ?? []);
      setInitialSnapshot(new Set(preset.columns ?? []));
    }
  }, [preset?.id]);

  // ── Kolom tersedia ─────────────────────────────────────────────────────────
  const availableColumns = useMemo(() => {
    if (scope === "ptl") return allCols && allCols.length > 0 ? allCols : [];
    const keys = new Set<string>();
    keys.add("ID PA");
    engRecords.forEach((r) => Object.keys(r.data ?? {}).forEach((k) => keys.add(k)));
    return Array.from(keys);
  }, [scope, allCols, engRecords]);

  // ── Sorted + filtered: selected dulu, lalu A-Z dalam masing-masing grup ───
  const sortedAndFilteredColumns = useMemo(() => {
    return availableColumns
      .filter((col) => col.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        const aSelected = selectedCols.includes(a);
        const bSelected = selectedCols.includes(b);
        if (aSelected && !bSelected) return -1;
        if (!aSelected && bSelected) return 1;
        return a.localeCompare(b);
      });
  }, [availableColumns, searchTerm, selectedCols]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!preset) return;
    setSaving(true);
    try {
      if (scope === "engineer") {
        if (localName.trim()) engRename(presetId as string, localName.trim());
        engUpdateColumns(presetId as string, selectedCols);
      } else {
        await ptlUpdate(presetId as number, {
          name:    localName.trim() || preset.name,
          columns: selectedCols,
        });
      }
      showToast({ title: "Preset disimpan", type: "success" });
      onSaved?.();
      onClose();
    } catch {
      showToast({ title: "Gagal menyimpan preset", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!preset) return;
    const confirmed = window.confirm(`Hapus preset "${preset.name}"?`);
    if (!confirmed) return;
    setSaving(true);
    try {
      if (scope === "engineer") {
        engDelete(presetId as string);
        showToast({ title: "Preset dihapus", description: `"${preset.name}" telah dihapus.`, type: "success" });
      } else {
        await ptlDelete(presetId as number);
        showToast({ title: "Preset dihapus", type: "success" });
      }
      onSaved?.();
      onClose();
    } catch {
      showToast({ title: "Gagal menghapus preset", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const toggleCol = (col: string) =>
    setSelectedCols(prev =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );

  const handleSelectAll = () => {
    const s = new Set(selectedCols);
    sortedAndFilteredColumns.forEach(c => s.add(c));
    setSelectedCols(Array.from(s));
  };

  const handleDeselectAll = () => {
    const s = new Set(selectedCols);
    sortedAndFilteredColumns.forEach(c => s.delete(c));
    setSelectedCols(Array.from(s));
  };

  if (!preset) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden">

        {/* HEADER */}
        <div className="bg-gray-50 border-b shrink-0 z-20">
          <div className="p-4 flex justify-between items-center border-b border-gray-200">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Edit Kolom Preset</h2>
              <p className="text-xs text-gray-500">Atur kolom yang ingin ditampilkan · selected dulu, lalu A–Z</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors p-1">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-4 space-y-4 bg-white">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Nama Preset</label>
              <input
                type="text"
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Contoh: Preset Utama"
              />
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Cari kolom..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
                />
                <svg className="w-4 h-4 text-gray-400 absolute left-2.5 top-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-gray-400 hidden sm:inline">
                  {selectedCols.length}/{availableColumns.length} dipilih
                </span>
                <button onClick={handleSelectAll}
                  className="flex-1 sm:flex-none text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded transition-colors text-center">
                  Pilih Semua
                </button>
                <button onClick={handleDeselectAll}
                  className="flex-1 sm:flex-none text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 px-3 py-2 rounded transition-colors text-center">
                  Hapus Semua
                </button>
              </div>
            </div>
          </div>
          <div className="h-1 bg-gradient-to-b from-gray-100 to-transparent opacity-50" />
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-gray-50/30">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {sortedAndFilteredColumns.map((col) => {
              const isSelected          = selectedCols.includes(col);
              const isInitiallySelected = initialSnapshot.has(col);
              return (
                <label key={col}
                  className={`flex items-start gap-2 p-2 rounded border cursor-pointer transition-all select-none ${
                    isSelected
                      ? "bg-blue-50 border-blue-200 shadow-sm ring-1 ring-blue-100"
                      : "bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0"
                    checked={isSelected}
                    onChange={() => toggleCol(col)}
                  />
                  <div className="flex flex-col">
                    <span className={`text-xs break-words leading-tight ${isSelected ? "font-bold text-gray-800" : "text-gray-600"}`}>
                      {col}
                    </span>
                    {isSelected && !isInitiallySelected && (
                      <span className="text-[9px] text-green-600 font-bold italic mt-0.5">Baru</span>
                    )}
                  </div>
                </label>
              );
            })}
          </div>

          {sortedAndFilteredColumns.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <svg className="w-10 h-10 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm">Tidak ditemukan kolom "{searchTerm}"</span>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 border-t bg-white shrink-0 flex justify-between items-center gap-3 rounded-b-xl z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <button onClick={handleDelete} disabled={saving}
            className="px-5 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Hapus Preset</span>
            </div>
          </button>

          <div className="flex gap-2">
            <button onClick={onClose} disabled={saving}
              className="px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-50">
              Batal
            </button>
            <button onClick={handleSave} disabled={saving}
              className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-md hover:shadow-lg transition-all transform active:scale-95 disabled:opacity-60">
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}