import { useState } from "react";
import { useAppearanceStore } from "../../state/appearanceStore";
import { useTaskStore } from "../../state/taskStore";
import { getColorTheme } from "../../utils/colorPalette";
import ColorPicker from "../ui/ColorPicker";

export default function GlobalLabelManager({ onClose }: { onClose: () => void }) {
  const statusMaster = useTaskStore((s) => s.statusMaster);
  const { labelColors, setLabelColor } = useAppearanceStore();
  const [editingLabel, setEditingLabel] = useState<string | null>(null);

  if (!statusMaster || !statusMaster.mapping) return null;

  // Kumpulkan semua detail progres unik dari mapping
  const allDetails = Array.from(
    new Set(
      Object.values(statusMaster.mapping)
        .flat()
        .filter((d) => d !== "-")
    )
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md p-6 relative">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-800">Manajemen Warna Label</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-red-500">
            Tutup
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          Atur warna untuk setiap detail progres. Perubahan akan berlaku di semua kartu.
        </p>

        <div className="max-h-[60vh] overflow-y-auto space-y-2">
          {allDetails.map((label) => {
            const theme = getColorTheme(labelColors[label] || "gray");
            
            return (
              <div
                key={label}
                className="flex items-center justify-between p-2 border rounded hover:bg-gray-50"
              >
                <div className={`px-2 py-1 rounded text-xs font-bold ${theme.bg} ${theme.text} border ${theme.border}`}>
                  {label}
                </div>

                <div className="relative">
                  <button
                    onClick={() => setEditingLabel(editingLabel === label ? null : label)}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <div className={`w-3 h-3 rounded-full ${theme.dot}`} />
                    Ubah
                  </button>

                  {editingLabel === label && (
                    <ColorPicker
                      selectedColorId={theme.id}
                      onSelect={(newColor) => setLabelColor(label, newColor)}
                      onClose={() => setEditingLabel(null)}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}