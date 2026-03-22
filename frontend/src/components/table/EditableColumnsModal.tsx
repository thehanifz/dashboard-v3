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

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: "rgba(0,0,0,0.5)" }}>
      <div
        className="rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 flex justify-between items-center shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}>
          <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
            Kolom Editable
          </h3>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-lg leading-none transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
          <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
            Pilih kolom yang ingin dapat diedit langsung di tabel:
          </p>

          {columns.length === 0 && (
            <p className="text-xs text-center py-6" style={{ color: "var(--text-muted)" }}>
              Tidak ada kolom di preset aktif.
            </p>
          )}

          <div className="space-y-1">
            {columns.map(column => {
              const isChecked = editableColumns.includes(column);
              return (
                <label key={column}
                  className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors"
                  style={{ background: isChecked ? "var(--accent-soft)" : "transparent" }}
                  onMouseEnter={e => { if (!isChecked) (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; }}
                  onMouseLeave={e => { if (!isChecked) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <span className="text-xs font-medium" style={{ color: isChecked ? "var(--accent)" : "var(--text-secondary)" }}>
                    {column}
                  </span>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleEditableColumn(column)}
                    className="rounded cursor-pointer"
                    style={{ accentColor: "var(--accent)" }}
                  />
                </label>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 shrink-0 flex justify-between items-center"
          style={{ borderTop: "1px solid var(--border)" }}>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {editableColumns.filter(c => columns.includes(c)).length} dari {columns.length} kolom dipilih
          </span>
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-white transition-colors"
            style={{ background: "var(--accent)" }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--accent-hover)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "var(--accent)"}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}