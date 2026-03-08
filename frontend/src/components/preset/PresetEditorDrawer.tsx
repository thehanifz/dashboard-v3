import { useTaskStore } from "../../state/taskStore";
import { usePresetEditor } from "./usePresetEditor";
import { PresetEditorHeader } from "./PresetEditorHeader";
import { PresetColumnList } from "./PresetColumnList";

export default function PresetEditorDrawer({
  presetId,
  onClose,
}: {
  presetId: string;
  onClose: () => void;
}) {
  const allColumns =
    useTaskStore((s) => s.columns) ?? [];

  const {
    preset,
    name,
    setName,
    columns,
    toggleColumn,
    save,
    remove,
  } = usePresetEditor(presetId);

  if (!preset) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />

      {/* drawer */}
      <div className="absolute top-0 right-0 h-full w-[420px] bg-white shadow-xl p-4 flex flex-col">
        <PresetEditorHeader
          name={name}
          setName={setName}
          onClose={onClose}
        />

        <PresetColumnList
          allColumns={allColumns}
          selected={columns}
          toggle={toggleColumn}
        />

        <div className="mt-auto pt-3 border-t flex justify-between">
          <button
            onClick={() => {
              remove();
              onClose();
            }}
            className="text-xs text-red-600"
          >
            Hapus Preset
          </button>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1 text-xs border rounded"
            >
              Batal
            </button>
            <button
              onClick={() => {
                save();
                onClose();
              }}
              className="px-3 py-1 text-xs bg-blue-600 text-white rounded"
            >
              Simpan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
