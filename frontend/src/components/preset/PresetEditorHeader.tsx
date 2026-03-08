export function PresetEditorHeader({
  name,
  setName,
  onClose,
}: {
  name: string;
  setName: (v: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center gap-2 border-b pb-2 mb-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="flex-1 text-sm font-semibold border rounded px-2 py-1"
        placeholder="Nama preset"
      />
      <button
        onClick={onClose}
        className="text-gray-500 hover:text-black"
      >
        ✕
      </button>
    </div>
  );
}
