import { usePresetStore } from "../../state/presetStore";
import { useState, useEffect } from "react";

export function usePresetEditor(presetId: string) {
  const preset = usePresetStore(
    (s) => s.presets.find((p) => p.id === presetId)
  );

  const updatePresetColumns = usePresetStore((s) => s.updatePresetColumns);
  const renamePreset = usePresetStore((s) => s.renamePreset);
  const deletePreset = usePresetStore((s) => s.deletePreset);

  const [name, setName] = useState("");
  const [columns, setColumns] = useState<string[]>([]);

  // sync saat ganti preset
  useEffect(() => {
    if (!preset) return;
    setName(preset.name);
    setColumns(preset.columns ?? []);
  }, [presetId]);

  function toggleColumn(col: string) {
    setColumns((prev) =>
      prev.includes(col)
        ? prev.filter((c) => c !== col)
        : [...prev, col]
    );
  }

  function save() {
    if (!preset) return;
    // Update both name and columns separately since there's no combined updatePreset function
    renamePreset(preset.id, name);
    updatePresetColumns(preset.id, columns);
  }

  function remove() {
    if (!preset) return;
    deletePreset(preset.id);
  }

  return {
    preset,
    name,
    setName,
    columns,
    toggleColumn,
    save,
    remove,
  };
}
