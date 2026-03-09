// frontend/src/components/teskom/PhotoUpload.tsx  ✏️ MODIFIED
import { useRef } from "react";

interface PhotoSlot {
  key: string;
  label: string;
  multiple?: boolean;
}

interface Props {
  slots: PhotoSlot[];
  files: Record<string, File | File[] | null>;
  onChange: (key: string, value: File | File[] | null) => void;
  cols?: 2 | 3;
}

export default function PhotoUpload({ slots, files, onChange, cols = 3 }: Props) {
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleChange = (key: string, multiple: boolean, e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected) return;
    onChange(key, multiple ? Array.from(selected) : (selected[0] || null));
  };

  const getLabel = (key: string, multiple: boolean) => {
    const val = files[key];
    if (!val) return "Klik atau drag foto ke sini...";
    if (Array.isArray(val)) return val.length > 0 ? `${val.length} foto dipilih` : "Klik atau drag foto ke sini...";
    return (val as File).name;
  };

  const gridClass = cols === 3
    ? "grid grid-cols-1 sm:grid-cols-3 gap-3"
    : "grid grid-cols-1 sm:grid-cols-2 gap-3";

  return (
    <div className={gridClass}>
      {slots.map(({ key, label, multiple }) => {
        const hasFile = !!(files[key] && (Array.isArray(files[key]) ? (files[key] as File[]).length > 0 : true));
        return (
          <div key={key}>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
              {label}
            </label>
            <div
              onClick={() => inputRefs.current[key]?.click()}
              className="flex flex-col items-center justify-center gap-2 px-3 rounded-xl border-2 border-dashed cursor-pointer transition-all"
              style={{
                minHeight: "100px",
                background: hasFile ? "var(--accent-soft)" : "var(--bg-surface2)",
                borderColor: hasFile ? "var(--accent)" : "var(--border)",
                color: hasFile ? "var(--accent)" : "var(--text-muted)",
              }}
            >
              <svg className="w-6 h-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs text-center px-2 truncate max-w-full">
                {getLabel(key, !!multiple)}
              </span>
              {hasFile && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(key, null);
                    if (inputRefs.current[key]) inputRefs.current[key]!.value = "";
                  }}
                  className="text-xs px-2 py-0.5 rounded-md"
                  style={{ background: "var(--border)", color: "var(--text-muted)" }}
                >
                  ✕ Hapus
                </button>
              )}
            </div>
            <input
              ref={(el) => { inputRefs.current[key] = el; }}
              type="file"
              accept="image/*"
              multiple={multiple}
              className="hidden"
              onChange={(e) => handleChange(key, !!multiple, e)}
            />
          </div>
        );
      })}
    </div>
  );
}