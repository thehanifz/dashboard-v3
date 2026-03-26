import { useState } from "react";
import { useAppearanceStore } from "../../state/appearanceStore";
import { getColorTheme } from "../../utils/colorPalette";
import ColorPicker from "../ui/ColorPicker";
import type { SheetRecord } from "../../types/record";

interface Props {
  records: SheetRecord[];
  labelColumnName?: string;
  onClose: () => void;
}

export default function PTLGlobalLabelManager({ records, labelColumnName = "Detail Progres", onClose }: Props) {
  const { ptlLabelColors, setPtlLabelColor } = useAppearanceStore();
  const [editingLabel, setEditingLabel] = useState<string | null>(null);

  // Generate unique labels dari records PTL (tidak bergantung pada statusMaster Engineer)
  const allLabels = Array.from(
    new Set(
      records
        .map(r => r.data[labelColumnName])
        .filter((v): v is string => !!v && v !== "-")
    )
  ).sort();

  if (allLabels.length === 0) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rounded-xl shadow-2xl w-full max-w-md p-6 text-center"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Tidak ada label ditemukan di kolom &ldquo;{labelColumnName}&rdquo;.
        </p>
        <button onClick={onClose} className="mt-4 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: "var(--accent)" }}>Tutup</button>
      </div>
    </div>
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
          Atur warna untuk setiap detail progres. Perubahan berlaku di semua kartu PTL.
        </p>
        <div className="max-h-[60vh] overflow-y-auto space-y-2 custom-scrollbar">
          {allLabels.map((label) => {
            const theme = getColorTheme(ptlLabelColors[label] || "gray");
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
                      onSelect={(newColor) => { setPtlLabelColor(label, newColor); setEditingLabel(null); }}
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
