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

  const allDetails = Array.from(
    new Set(Object.values(statusMaster.mapping).flat().filter((d) => d !== "-"))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rounded-xl shadow-2xl w-full max-w-md p-6 relative"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
            Manajemen Warna Label
          </h2>
          <button onClick={onClose} className="text-sm font-medium px-3 py-1 rounded-lg transition-colors"
            style={{ color: "var(--text-muted)", background: "var(--bg-surface2)" }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"}>
            Tutup
          </button>
        </div>
        <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
          Atur warna untuk setiap detail progres. Perubahan berlaku di semua kartu.
        </p>
        <div className="max-h-[60vh] overflow-y-auto space-y-2 custom-scrollbar">
          {allDetails.map((label) => {
            const theme = getColorTheme(labelColors[label] || "gray");
            return (
              <div key={label}
                className="flex items-center justify-between p-2.5 rounded-lg transition-colors"
                style={{ border: "1px solid var(--border)", background: "var(--bg-surface2)" }}>
                <div className={`px-2 py-1 rounded text-xs font-bold ${theme.bg} ${theme.text} border ${theme.border}`}>
                  {label}
                </div>
                <div className="relative">
                  <button
                    onClick={() => setEditingLabel(editingLabel === label ? null : label)}
                    className="text-xs flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors"
                    style={{ color: "var(--accent)", background: "var(--accent-soft)" }}>
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
