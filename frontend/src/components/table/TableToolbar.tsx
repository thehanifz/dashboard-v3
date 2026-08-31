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
  onOpenMobileFilter?: () => void;
  filteredCount: number;
  totalCount:    number;
};

export default function TableToolbar({
  title, recordCount, userName, saving, onRefresh,
  view, onViewChange,
  search, onSearch,
  presets, activePreset, presetLoading, onSelectPreset, onCreatePreset, onEditPreset,
  filterCount, onResetFilter,
  filteredCount, totalCount,
}: Props) {
  return (
    <div className="shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>

      <ToolbarHeader
        title={title} recordCount={recordCount} userName={userName}
        saving={saving} onRefresh={onRefresh}
        view={view} onViewChange={onViewChange}
      />

      <div className={`px-3 md:px-5 pb-3 flex items-center gap-2 flex-wrap ${view === "kanban" ? "md:hidden" : ""}`}>

          {/* Search */}
          <div className="relative w-full md:w-auto">
            <svg className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              style={{ color: "var(--text-muted)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text" placeholder="Cari data..." value={search}
              onChange={e => onSearch(e.target.value)}
              className="th-input pl-8 pr-3 py-2 md:py-1.5 text-xs w-full md:w-44"
            />
          </div>

          {/* Preset selector */}
          <PresetSelector
            presets={presets} activePreset={activePreset} presetLoading={presetLoading}
            onSelectPreset={onSelectPreset} onCreatePreset={onCreatePreset} onEditPreset={onEditPreset}
          />

          {/* Mobile filter trigger */}
          {onOpenMobileFilter && (
            <button
              type="button"
              onClick={onOpenMobileFilter}
              className="md:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium"
              style={{
                background: filterCount > 0 ? "var(--accent-soft)" : "var(--bg-surface)",
                color: filterCount > 0 ? "var(--accent)" : "var(--text-secondary)",
                border: `1px solid ${filterCount > 0 ? "var(--accent)" : "var(--border)"}`,
              }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4-2A1 1 0 018 17v-3.586L3.293 6.707A1 1 0 013 6V4z" />
              </svg>
              Filter{filterCount > 0 ? ` ${filterCount}` : ""}
            </button>
          )}

          {/* Filter badge */}
          {filterCount > 0 && (
            <div className="hidden md:flex items-center gap-1.5">
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
