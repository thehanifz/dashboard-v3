/**
 * TableToolbar.tsx
 * Shared toolbar component — dipakai Engineer (DynamicTable) dan PTL (PTLDetailPanel).
 * Semua data dan handler diterima via props, tidak ada store dependency.
 *
 * Fitur:
 * - Header: icon + judul + record count + nama user + saving indicator
 * - Tab Tabel/Kanban pill style (optional)
 * - Search input
 * - Preset selector inline dengan tombol edit langsung
 * - Filter badge + reset
 * - Kolom Editable button
 * - Stats pill
 */
import { useState } from "react";

export type PresetItem = {
  id:      string | number;
  name:    string;
  columns: string[];
};

type ViewType = "table" | "kanban";

type Props = {
  // ── Header ────────────────────────────────────────────────────────────────
  title:        string;
  recordCount:  number;
  userName:     string;
  saving?:      boolean;

  // ── View tab (optional — kalau tidak di-pass, tab tidak ditampilkan) ──────
  view?:        ViewType;
  onViewChange?:(v: ViewType) => void;

  // ── Search ────────────────────────────────────────────────────────────────
  search:       string;
  onSearch:     (val: string) => void;

  // ── Preset ────────────────────────────────────────────────────────────────
  presets:         PresetItem[];
  activePreset:    PresetItem | null;
  presetLoading?:  boolean;
  onSelectPreset:  (id: string | number) => void;
  onCreatePreset:  () => void;
  onEditPreset:    (id: string | number) => void;

  // ── Filter ────────────────────────────────────────────────────────────────
  filterCount:    number;
  onResetFilter:  () => void;

  // ── Kolom Editable ────────────────────────────────────────────────────────
  onOpenEditableColumns: () => void;

  // ── Stats ────────────────────────────────────────────────────────────────
  filteredCount: number;
  totalCount:    number;
};

export default function TableToolbar({
  title, recordCount, userName, saving,
  view, onViewChange,
  search, onSearch,
  presets, activePreset, presetLoading, onSelectPreset, onCreatePreset, onEditPreset,
  filterCount, onResetFilter,
  onOpenEditableColumns,
  filteredCount, totalCount,
}: Props) {
  const [presetDropdownOpen, setPresetDropdownOpen] = useState(false);

  const showViewTab = view !== undefined && onViewChange !== undefined;

  return (
    <div className="shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>

      {/* ── PAGE HEADER ─────────────────────────────────────────────────── */}
      <div className="px-5 pt-4 pb-3 flex items-center justify-between gap-4">

        {/* Kiri: icon + judul + meta */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "var(--accent-soft)" }}>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              style={{ color: "var(--accent)", width: 18, height: 18 }}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
              {title}
            </h1>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                {recordCount} record
              </span>
              <span className="w-1 h-1 rounded-full shrink-0" style={{ background: "var(--border)" }} />
              <span className="text-[11px] font-medium truncate" style={{ color: "var(--text-secondary)" }}>
                {userName}
              </span>
              {saving && (
                <span className="text-[11px] font-medium flex items-center gap-1" style={{ color: "var(--accent)" }}>
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block"
                    style={{ background: "var(--accent)" }} />
                  Menyimpan...
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Kanan: tab view switcher (optional) */}
        {showViewTab && (
          <div className="flex items-center shrink-0 p-0.5 rounded-xl"
            style={{ background: "var(--bg-surface2)", border: "1px solid var(--border)" }}>
            {([
              ["table",  "Tabel",  "M3 10h18M3 6h18M3 14h18M3 18h18"],
              ["kanban", "Kanban", "M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7"],
            ] as [ViewType, string, string][]).map(([v, label, path]) => (
              <button key={v} onClick={() => onViewChange!(v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: view === v ? "var(--accent)" : "transparent",
                  color:      view === v ? "#fff" : "var(--text-muted)",
                  boxShadow:  view === v ? "0 1px 4px rgba(0,0,0,0.15)" : "none",
                }}>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  style={{ width: 13, height: 13 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={path} />
                </svg>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── TOOLBAR ─────────────────────────────────────────────────────── */}
      <div className="px-5 pb-3 flex items-center gap-2 flex-wrap">

        {/* Search */}
        <div className="relative">
          <svg className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            style={{ color: "var(--text-muted)" }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" placeholder="Cari data..." value={search}
            onChange={e => onSearch(e.target.value)}
            className="th-input pl-8 pr-3 py-1.5 text-xs w-44" />
        </div>

        {/* Preset selector inline */}
        <div className="relative">
          <div className="flex items-center rounded-lg overflow-hidden"
            style={{ border: "1px solid var(--border)", background: "var(--bg-surface)" }}>
            <button onClick={() => setPresetDropdownOpen(v => !v)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium transition-colors"
              style={{ color: "var(--text-primary)", minWidth: 148 }}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                style={{ color: "var(--accent)", width: 14, height: 14, flexShrink: 0 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h8" />
              </svg>
              <span className="truncate max-w-[108px]">
                {presetLoading ? "Memuat..." : activePreset ? activePreset.name : "Pilih Preset"}
              </span>
              <svg className={`shrink-0 ml-auto transition-transform ${presetDropdownOpen ? "rotate-180" : ""}`}
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
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    style={{ width: 13, height: 13 }}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </>
            )}
          </div>

          {/* Dropdown list preset */}
          {presetDropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setPresetDropdownOpen(false)} />
              <div className="absolute top-full left-0 mt-1.5 rounded-xl shadow-2xl border z-20 overflow-hidden"
                style={{ background: "var(--bg-surface)", borderColor: "var(--border)", minWidth: 220 }}>
                <div className="px-3 pt-2.5 pb-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: "var(--text-muted)" }}>Preset Tersimpan</p>
                </div>
                <div className="max-h-52 overflow-y-auto custom-scrollbar pb-1">
                  {presets.length === 0 && (
                    <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>
                      Belum ada preset
                    </p>
                  )}
                  {presets.map(p => (
                    <div key={p.id} className="flex items-center gap-1 px-2 py-0.5">
                      <button
                        onClick={() => { onSelectPreset(p.id); setPresetDropdownOpen(false); }}
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
                        <span className={p.id === activePreset?.id ? "font-semibold" : ""}
                          style={{ color: p.id === activePreset?.id ? "var(--accent)" : "var(--text-primary)" }}>
                          {p.name}
                        </span>
                      </button>
                      <button
                        onClick={() => { onEditPreset(p.id); setPresetDropdownOpen(false); }}
                        className="p-1.5 rounded-lg shrink-0 transition-colors"
                        style={{ color: "var(--text-muted)" }}
                        title="Edit preset"
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--accent-soft)"; (e.currentTarget as HTMLElement).style.color = "var(--accent)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}>
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                          style={{ width: 11, height: 11 }}>
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
                    onClick={() => { setPresetDropdownOpen(false); onCreatePreset(); }}
                    className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 rounded-lg transition-colors font-medium"
                    style={{ color: "var(--accent)" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--accent-soft)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      style={{ width: 13, height: 13 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Buat Preset Baru
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Filter badge */}
        {filterCount > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs px-2.5 py-1.5 rounded-lg font-medium flex items-center gap-1.5"
              style={{ background: "var(--accent-soft)", color: "var(--accent)", border: "1px solid var(--accent)" }}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                style={{ width: 11, height: 11 }}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4-2A1 1 0 018 17v-3.586L3.293 6.707A1 1 0 013 6V4z" />
              </svg>
              {filterCount} filter
            </span>
            <button onClick={onResetFilter}
              className="text-xs px-2 py-1.5 rounded-lg transition-colors"
              style={{ color: "var(--text-muted)", background: "var(--bg-surface2)", border: "1px solid var(--border)" }}>
              Reset
            </button>
          </div>
        )}

        {/* Kolom Editable */}
        <button onClick={onOpenEditableColumns}
          className="btn-ghost flex items-center gap-1.5 text-xs py-1.5 px-2.5 rounded-lg"
          title="Atur kolom yang dapat diedit">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            style={{ width: 13, height: 13 }}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          <span className="hidden sm:inline">Kolom Editable</span>
        </button>

        {/* Stats */}
        <div className="ml-auto">
          <span className="text-[11px] font-medium tabular-nums px-2.5 py-1 rounded-lg"
            style={{ background: "var(--bg-surface2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
            {filteredCount} / {totalCount} baris
          </span>
        </div>
      </div>
    </div>
  );
}