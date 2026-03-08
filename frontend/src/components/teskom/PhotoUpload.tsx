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
}

export default function PhotoUpload({ slots, files, onChange }: Props) {
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleChange = (key: string, multiple: boolean, e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected) return;
    if (multiple) {
      onChange(key, Array.from(selected));
    } else {
      onChange(key, selected[0] || null);
    }
  };

  const getLabel = (key: string, multiple: boolean) => {
    const val = files[key];
    if (!val) return "Pilih foto...";
    if (Array.isArray(val)) return val.length > 0 ? `${val.length} foto dipilih` : "Pilih foto...";
    return (val as File).name;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {slots.map(({ key, label, multiple }) => {
        const hasFile = !!(files[key] && (Array.isArray(files[key]) ? (files[key] as File[]).length > 0 : true));
        return (
          <div key={key}>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>{label}</label>
            <div
              onClick={() => inputRefs.current[key]?.click()}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-all"
              style={{
                background: hasFile ? "var(--accent-soft)" : "var(--bg-surface2)",
                border: `1px solid ${hasFile ? "var(--accent)" : "var(--border)"}`,
                color: hasFile ? "var(--accent)" : "var(--text-muted)",
              }}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs truncate">{getLabel(key, !!multiple)}</span>
              {hasFile && (
                <button
                  onClick={(e) => { e.stopPropagation(); onChange(key, null); if (inputRefs.current[key]) inputRefs.current[key]!.value = ""; }}
                  className="ml-auto shrink-0 text-xs"
                  style={{ color: "var(--text-muted)" }}
                >✕</button>
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
