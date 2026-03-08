import { useMemo } from "react";
import { usePresetStore } from "../../state/presetStore";
import { useAppearanceStore } from "../../state/appearanceStore";

type Props = {
  onClose: () => void;
};

export default function EditableColumnsModal({ onClose }: Props) {
  const { activePresetId } = usePresetStore();
  const { editableColumns, toggleEditableColumn } = useAppearanceStore();
  const presets = usePresetStore((s) => s.presets);

  const activePreset = useMemo(() => {
    return presets.find(p => p.id === activePresetId);
  }, [presets, activePresetId]);

  const columns = activePreset?.columns || [];

  const handleToggleColumn = (column: string) => {
    toggleEditableColumn(column);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-semibold text-gray-800">Kolom Editable</h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            &times;
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          <p className="text-sm text-gray-600 mb-3">
            Pilih kolom yang ingin dapat diedit langsung di tabel:
          </p>
          
          <div className="space-y-2">
            {columns.map((column) => (
              <div 
                key={column} 
                className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
              >
                <span className="text-sm text-gray-700">{column}</span>
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editableColumns.includes(column)}
                    onChange={() => handleToggleColumn(column)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}