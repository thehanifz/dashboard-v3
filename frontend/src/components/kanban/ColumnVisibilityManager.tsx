import { useTaskStore } from "../../state/taskStore";
import { useAppearanceStore } from "../../state/appearanceStore";

export default function ColumnVisibilityManager({ onClose }: { onClose: () => void }) {
  const statusMaster = useTaskStore((s) => s.statusMaster);
  const { hiddenStatuses, toggleStatusVisibility } = useAppearanceStore();

  if (!statusMaster || !statusMaster.primary) return null;

  // List semua status dari Backend
  const allStatuses = statusMaster.primary || [];

  // Hitung berapa yang aktif
  const activeCount = allStatuses.length - hiddenStatuses.length;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 th-overlay" onClick={onClose} />

      {/* Modal - Posisi agak ke kiri dari tombolnya */}
      <div className="fixed top-20 right-32 z-50 bg-white rounded-lg shadow-xl w-72 p-4 border border-gray-200 animate-in fade-in slide-in-from-top-4">
        <div className="flex justify-between items-center mb-3 pb-2 border-b">
          <h3 className="font-bold text-gray-700 text-sm">Filter Kolom Status</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500">
            &times;
          </button>
        </div>

        <p className="text-xs text-gray-500 mb-3">
            Sembunyikan kolom status yang tidak relevan. Data tidak hilang, hanya disembunyikan.
        </p>

        <div className="max-h-[60vh] overflow-y-auto space-y-1 pr-1">
          {allStatuses.map((status) => {
            const isVisible = !hiddenStatuses.includes(status);
            
            return (
              <label
                key={status}
                className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-xs select-none transition-colors ${
                  isVisible ? "bg-green-50 text-green-800" : "hover:bg-gray-50 text-gray-400 decoration-slate-400"
                }`}
              >
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  checked={isVisible}
                  onChange={() => {
                    // Validasi: Jangan biarkan kosong total (minimal 1 kolom)
                    if (isVisible && activeCount <= 1) return;
                    toggleStatusVisibility(status);
                  }}
                />
                <span className={`truncate flex-1 ${!isVisible && "line-through"}`}>
                    {status}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </>
  );
}