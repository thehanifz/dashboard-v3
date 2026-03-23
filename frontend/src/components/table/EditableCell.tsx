/**
 * EditableCell.tsx
 * Komponen input cell yang bisa diedit dengan optimistic update.
 * Dipakai di PTLDetailPanel dan bisa dipakai di mana saja.
 *
 * - Tampil sebagai text biasa, jadi input saat focus
 * - Commit onBlur atau Enter, cancel dengan Escape
 * - Sync dari luar via value prop (setelah optimistic update selesai)
 */
import { useState, useEffect, useRef } from "react";

type Props = {
  value:    string;
  colW?:    number;
  onCommit: (val: string) => void;
  disabled?: boolean;
};

export default function EditableCell({ value, colW, onCommit, disabled = false }: Props) {
  const [localVal, setLocalVal] = useState(value);
  const [editing,  setEditing]  = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync dari luar (saat optimistic update atau refresh)
  useEffect(() => { setLocalVal(value); }, [value]);

  const commit = () => {
    setEditing(false);
    if (localVal !== value) onCommit(localVal);
  };

  if (disabled) {
    return (
      <div className="truncate px-2 py-1 text-xs" style={{ color: "var(--text-muted)", maxWidth: colW ? `${colW - 8}px` : undefined }}>
        {value || "—"}
      </div>
    );
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={localVal}
      onChange={e => setLocalVal(e.target.value)}
      onFocus={() => setEditing(true)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === "Enter")  { inputRef.current?.blur(); }
        if (e.key === "Escape") { setLocalVal(value); setEditing(false); inputRef.current?.blur(); }
      }}
      readOnly={!editing}
      style={{
        width: "100%",
        maxWidth: colW ? `${colW - 8}px` : undefined,
        padding: "4px 8px",
        fontSize: 12,
        borderRadius: 6,
        outline: "none",
        background:  editing ? "var(--input-bg, var(--bg-surface2))" : "var(--bg-surface2)",
        color:       "var(--text-primary)",
        border:      editing ? "1px solid var(--accent)" : "1px solid transparent",
        cursor:      editing ? "text" : "pointer",
        boxShadow:   editing ? "0 0 0 2px color-mix(in srgb, var(--accent) 15%, transparent)" : "none",
        transition:  "border-color 0.15s, background 0.15s",
      }}
      onMouseEnter={e => { if (!editing) (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
      onMouseLeave={e => { if (!editing) (e.currentTarget as HTMLElement).style.borderColor = "transparent"; }}
    />
  );
}
