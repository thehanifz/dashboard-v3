import { useTaskStore } from "../../state/taskStore";
import { useAppearanceStore } from "../../state/appearanceStore";

export default function CardFieldManager({ onClose }: { onClose: () => void }) {
  const records = useTaskStore((s) => s.records);
  const { cardFields, setCardFields } = useAppearanceStore();

  // Ambil semua kemungkinan Key dari record pertama (sebagai sample)
  const sampleData = records[0]?.data || {};
  const allKeys = Object.keys(sampleData);

  const toggleField = (key: string) => {
    let newFields = [...cardFields];

    if (newFields.includes(key)) {
      // HAPUS (Uncheck)
      // Validasi: Jangan biarkan kosong melompong (minimal 1 field)
      if (newFields.length <= 1) return; 
      newFields = newFields.filter((f) => f !== key);
    } else {
      // TAMBAH (Check)
      newFields.push(key);
    }

    setCardFields(newFields);
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 th-overlay" onClick={onClose} />

      {/* Modal */}
      <div className="fixed top-20 right-4 z-50 bg-white rounded-lg shadow-xl w-72 p-4 border border-gray-200 animate-in fade-in slide-in-from-top-4">
        <div className="flex justify-between items-center mb-3 pb-2 border-b">
          <h3 className="font-bold text-gray-700 text-sm">Tampilan Kartu</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500">
            &times;
          </button>
        </div>

        <p className="text-xs text-gray-500 mb-3">
            Centang data yang ingin ditampilkan pada kartu. Urutan mengikuti data asli.
        </p>

        <div className="max-h-[60vh] overflow-y-auto space-y-1 pr-1">
          {allKeys.map((key) => {
            const isChecked = cardFields.includes(key);
            return (
              <label
                key={key}
                className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-xs select-none transition-colors ${
                  isChecked ? "bg-blue-50 text-blue-800" : "hover:bg-gray-50 text-gray-600"
                }`}
              >
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={isChecked}
                  onChange={() => toggleField(key)}
                />
                <span className="truncate flex-1">{key}</span>
              </label>
            );
          })}
        </div>
      </div>
    </>
  );
}