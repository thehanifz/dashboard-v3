type Props = {
  allColumns: string[];
  selected: string[];
  toggle: (col: string) => void;
};

export function PresetColumnList({
  allColumns,
  selected,
  toggle,
}: Props) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold text-gray-700">
        Pilih Kolom
      </div>

      <div className="grid grid-cols-2 gap-2 max-h-[60vh] overflow-auto pr-2">
        {allColumns.map((col) => {
          const checked = selected.includes(col);
          return (
            <label
              key={col}
              className={`
                flex items-center gap-2 px-2 py-1 rounded cursor-pointer
                ${checked ? "bg-blue-50" : "hover:bg-gray-50"}
              `}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(col)}
              />
              <span className="text-xs truncate">{col}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
