import { useTaskStore } from "../../state/taskStore";

interface Props {
  onClose: () => void;
  cardFields?: string[];
  onCardFieldsChange?: (fields: string[]) => void;
}

export default function CardFieldManager({ onClose, cardFields: externalFields, onCardFieldsChange }: Props) {
  const records = useTaskStore((s) => s.records);
  const sampleData = records[0]?.data || {};
  const allKeys = Object.keys(sampleData);

  // Kalau ada external props pakai itu, fallback ke kosong
  const activeFields = externalFields ?? [];

  const toggleField = (key: string) => {
    if (!onCardFieldsChange) return;
    if (activeFields.includes(key)) {
      if (activeFields.length <= 1) return;
      onCardFieldsChange(activeFields.filter(f => f !== key));
    } else {
      onCardFieldsChange([...activeFields, key]);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 th-overlay" onClick={onClose} />
      <div className="fixed top-20 right-4 z-50 rounded-xl shadow-2xl w-72 p-4 animate-in fade-in slide-in-from-top-4"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <div className="flex justify-between items-center mb-3 pb-2"
          style={{ borderBottom: "1px solid var(--border)" }}>
          <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Tampilan Kartu</h3>
          <button onClick={onClose} className="text-lg leading-none transition-colors"
            style={{ color: "var(--text-muted)" }}>
            &times;
          </button>
        </div>
        <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
          Centang data yang ingin ditampilkan pada kartu.
        </p>
        <div className="max-h-[60vh] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
          {allKeys.map((key) => {
            const isChecked = activeFields.includes(key);
            return (
              <label key={key}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-xs select-none transition-colors"
                style={{ background: isChecked ? "var(--accent-soft)" : "transparent" }}
                onMouseEnter={e => { if (!isChecked) (e.currentTarget as HTMLElement).style.background = "var(--bg-surface2)"; }}
                onMouseLeave={e => { if (!isChecked) (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                <input type="checkbox" className="rounded shrink-0"
                  style={{ accentColor: "var(--accent)" }}
                  checked={isChecked}
                  onChange={() => toggleField(key)} />
                <span className="truncate flex-1"
                  style={{ color: isChecked ? "var(--accent)" : "var(--text-secondary)", fontWeight: isChecked ? 600 : 400 }}>
                  {key}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </>
  );
}
