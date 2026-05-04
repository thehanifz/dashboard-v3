import { useState } from "react";
import type { PresetItem } from "./TableToolbar";

type Props = {
  presets:        PresetItem[];
  activePreset:   PresetItem | null;
  presetLoading?: boolean;
  onSelectPreset: (id: string | number) => void;
  onCreatePreset: () => void;
  onEditPreset:   (id: string | number) => void;
};

export function PresetSelector({
  presets, activePreset, presetLoading,
  onSelectPreset, onCreatePreset, onEditPreset,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <div className="flex items-center rounded-lg overflow-hidden"
        style={{ border: "1px solid var(--border)", background: "var(--bg-surface)" }}>

        {/* Trigger */}
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium transition-colors"
          style={{ color: "var(--text-primary)", minWidth: 148 }}>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            style={{ color: "var(--accent)", width: 14, height: 14, flexShrink: 0 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h8" />
          </svg>
          <span className="truncate max-w-[108px]">
            {presetLoading ? "Memuat..." : activePreset ? activePreset.name : "Pilih Preset"}
          </span>
          <svg className={`shrink-0 ml-auto transition-transform ${open ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            style={{ color: "var(--text-muted)", width: 13, height: 13 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Tombol edit preset aktif */}
        {activePreset && (
          <>
            <div className="w-px h-5 shrink-0" style={{ background: "var(--border)" }} />
            <button
              onClick={() => onEditPreset(activePreset.id)}
              className="px-2 py-1.5 transition-colors shrink-0"
              title="Edit preset aktif"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--accent)"; (e.currentTarget as HTMLElement).style.background = "var(--accent-soft)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: 13, height: 13 }}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Dropdown list */}
      {open && (
        <>
          <div className="fixed inset-0 z-[25]" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1.5 rounded-xl shadow-2xl border z-[35] overflow-hidden"
            style={{ background: "var(--bg-surface)", borderColor: "var(--border)", minWidth: 220 }}>
            <div className="px-3 pt-2.5 pb-1">
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                Preset Tersimpan
              </p>
            </div>
            <div className="max-h-52 overflow-y-auto custom-scrollbar pb-1">
              {presets.length === 0 && (
                <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>Belum ada preset</p>
              )}
              {presets.map(p => (
                <div key={p.id} className="flex items-center gap-1 px-2 py-0.5">
                  <button
                    onClick={() => { onSelectPreset(p.id); setOpen(false); }}
                    className="flex-1 text-left px-2 py-1.5 text-xs flex items-center gap-2 rounded-lg transition-colors"
                    style={{ background: p.id === activePreset?.id ? "var(--accent-soft)" : "transparent" }}
                    onMouseEnter={e => { if (p.id !== activePreset?.id) (e.currentTarget as HTMLElement).style.background = "var(--bg-surface2)"; }}
                    onMouseLeave={e => { if (p.id !== activePreset?.id) (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                    {p.id === activePreset?.id ? (
                      <svg fill="currentColor" viewBox="0 0 20 20"
                        style={{ color: "var(--accent)", width: 12, height: 12, flexShrink: 0 }}>
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <span style={{ width: 12, flexShrink: 0, display: "inline-block" }} />
                    )}
                    <span
                      className={p.id === activePreset?.id ? "font-semibold" : ""}
                      style={{ color: p.id === activePreset?.id ? "var(--accent)" : "var(--text-primary)" }}>
                      {p.name}
                    </span>
                  </button>
                  <button
                    onClick={() => { onEditPreset(p.id); setOpen(false); }}
                    className="p-1.5 rounded-lg shrink-0 transition-colors"
                    style={{ color: "var(--text-muted)" }}
                    title="Edit preset"
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--accent-soft)"; (e.currentTarget as HTMLElement).style.color = "var(--accent)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}>
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: 11, height: 11 }}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            <div className="border-t mx-2 my-1" style={{ borderColor: "var(--border)" }} />
            <div className="px-2 pb-2">
              <button
                onClick={() => { setOpen(false); onCreatePreset(); }}
                className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 rounded-lg transition-colors font-medium"
                style={{ color: "var(--accent)" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--accent-soft)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: 13, height: 13 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Buat Preset Baru
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
