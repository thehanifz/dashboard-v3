/**
 * TableToolbar.tsx
 * Shared toolbar — dipakai Engineer (DynamicTable) dan PTL (PTLDetailPanel).
 * Semua data dan handler diterima via props, tidak ada store dependency.
 */
import { ToolbarHeader }   from "./ToolbarHeader";
import { PresetSelector }  from "./PresetSelector";

export type PresetItem = {
  id:      string | number;
  name:    string;
  columns: string[];
};

type ViewType = "table" | "kanban";

type Props = {
  title:        string;
  recordCount:  number;
  userName:     string;
  saving?:      boolean;
  onRefresh?:   () => void;
  view?:        ViewType;
  onViewChange?:(v: ViewType) => void;
  search:       string;
  onSearch:     (val: string) => void;
  presets:         PresetItem[];
  activePreset:    PresetItem | null;
  presetLoading?:  boolean;
  onSelectPreset:  (id: string | number) => void;
  onCreatePreset:  () => void;
  onEditPreset:    (id: string | number) => void;
  filterCount:    number;
  onResetFilter:  () => void;
  onOpenEditableColumns: () => void;
  filteredCount: number;
  totalCount:    number;
};

export default function TableToolbar({
  title, recordCount, userName, saving, onRefresh,
  view, onViewChange,
  search, onSearch,
  presets, activePreset, presetLoading, onSelectPreset, onCreatePreset, onEditPreset,
  filterCount, onResetFilter,
  onOpenEditableColumns,
  filteredCount, totalCount,
}: Props) {
  return (
    <div className="shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>

      <ToolbarHeader
        title={title} recordCount={recordCount} userName={userName}
        saving={saving} onRefresh={onRefresh}
        view={view} onViewChange={onViewChange}
      />

      {view !== "kanban" && (
        <div className="px-5 pb-3 flex items-center gap-2 flex-wrap">

          {/* Search */}
          <div className="relative">
            <svg className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              style={{ color: "var(--text-muted)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text" placeholder="Cari data..." value={search}
              onChange={e => onSearch(e.target.value)}
              className="th-input pl-8 pr-3 py-1.5 text-xs w-44"
            />
          </div>

          {/* Preset selector */}
          <PresetSelector
            presets={presets} activePreset={activePreset} presetLoading={presetLoading}
            onSelectPreset={onSelectPreset} onCreatePreset={onCreatePreset} onEditPreset={onEditPreset}
          />

          {/* Filter badge */}
          {filterCount > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs px-2.5 py-1.5 rounded-lg font-medium flex items-center gap-1.5"
                style={{ background: "var(--accent-soft)", color: "var(--accent)", border: "1px solid var(--accent)" }}>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: 11, height: 11 }}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4-2A1 1 0 018 17v-3.586L3.293 6.707A1 1 0 013 6V4z" />
                </svg>
                {filterCount} filter
              </span>
              <button
                onClick={onResetFilter}
                className="text-xs px-2 py-1.5 rounded-lg transition-colors"
                style={{ color: "var(--text-muted)", background: "var(--bg-surface2)", border: "1px solid var(--border)" }}>
                Reset
              </button>
            </div>
          )}

          {/* Kolom Editable */}
          <button
            onClick={onOpenEditableColumns}
            className="btn-ghost flex items-center gap-1.5 text-xs py-1.5 px-2.5 rounded-lg"
            title="Atur kolom yang dapat diedit">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: 13, height: 13 }}>
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
      )}
    </div>
  );
}
