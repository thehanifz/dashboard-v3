import { useState, useMemo } from "react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";

import { useTaskStore } from "../../state/taskStore";
import { usePresetStore } from "../../state/presetStore";
import { useAppearanceStore } from "../../state/appearanceStore";
import { getColorTheme } from "../../utils/colorPalette";

import { renderCell } from "./renderCell";
import { useTablePagination } from "./useTablePagination";
import { useTableResize } from "./useTableResize";
import { TableHeaderCell } from "./TableHeaderCell";
import PresetEditorModal from "../preset/PresetEditorModal";
import ColumnFilter from "./ColumnFilter";
import EditableColumnsModal from "./EditableColumnsModal";
import BaiActionButton from "./BaiActionButton";
import { useToast } from "../../utils/useToast";

const MIN_COL_WIDTH     = 60;
const DEFAULT_COL_WIDTH = 150;

export default function DynamicTable() {
  const records        = useTaskStore(s => s.records) ?? [];
  const statusMaster   = useTaskStore(s => s.statusMaster);
  const presets        = usePresetStore(s => s.presets) ?? [];
  const activePresetId = usePresetStore(s => s.activePresetId);
  const setActivePreset = usePresetStore(s => s.setActivePreset);
  const addPreset      = usePresetStore(s => s.addPreset);
  const reorderColumns = usePresetStore(s => s.reorderColumns);

  const { columnColors, labelColors, activeFilters } = useAppearanceStore();
  const activePreset = presets.find(p => p.id === activePresetId);

  const { show: showToast } = useToast();
  const [search,              setSearch]             = useState("");
  const [showEditor,          setShowEditor]          = useState(false);
  const [showEditableColumns, setShowEditableColumns] = useState(false);
  const [activeFilterCol,     setActiveFilterCol]     = useState<string | null>(null);
  const [filterPos,           setFilterPos]           = useState({ top: 0, left: 0 });

  const filteredRecords = useMemo(() => {
    let result = [...records];
    if (Object.keys(activeFilters).length > 0) {
      result = result.filter(r =>
        Object.entries(activeFilters).every(([key, vals]) => vals.includes(String(r.data[key] || "")))
      );
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(r => Object.values(r.data ?? {}).some(v => String(v).toLowerCase().includes(q)));
    }
    return result;
  }, [records, search, activeFilters]);

  const pagination = useTablePagination(filteredRecords);
  const columns    = activePreset?.columns ?? [];
  const widths     = activePreset?.widths ?? {};
  const resize     = useTableResize(activePreset?.id, widths, filteredRecords);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (activePresetId && over && active.id !== over.id) {
      const oi = columns.indexOf(active.id as string);
      const ni = columns.indexOf(over.id as string);
      reorderColumns(activePresetId, arrayMove(columns, oi, ni));
    }
  };

  const handleOpenFilter = (e: React.MouseEvent, col: string) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setFilterPos({ top: rect.bottom + 5, left: rect.left });
    setActiveFilterCol(activeFilterCol === col ? null : col);
  };

  const filterCount = Object.keys(activeFilters).length;

  return (
    <div className="flex flex-col h-full" style={{ height: "calc(100vh - 56px - 32px)" }}>

      {/* ── Toolbar ── */}
      <div className="shrink-0 flex flex-wrap items-center gap-2 px-1 pb-3">

        {/* Search */}
        <div className="relative">
          <svg className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: "var(--text-muted)" }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" placeholder="Cari data..." value={search} onChange={e => setSearch(e.target.value)}
            className="th-input pl-8 pr-3 py-1.5 text-xs w-48" />
        </div>

        {/* Filter badge */}
        {filterCount > 0 && (
          <span className="text-xs px-2.5 py-1.5 rounded-lg font-medium flex items-center gap-1.5"
            style={{ background: "var(--accent-soft)", color: "var(--accent)", border: "1px solid var(--accent)" }}>
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" /></svg>
            {filterCount} filter aktif
          </span>
        )}

        {/* Editable Columns */}
        <button onClick={() => setShowEditableColumns(true)} className="btn-ghost flex items-center gap-1.5 text-xs py-1.5 px-2.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
          <span className="hidden sm:inline">Kolom Editable</span>
        </button>

        {/* Stats */}
        <div className="ml-auto text-[11px]" style={{ color: "var(--text-muted)" }}>
          {filteredRecords.length} / {records.length} baris
        </div>
      </div>

      {/* ── Preset Tabs ── */}
      <div className="shrink-0 flex items-center gap-1 px-1 mb-2 overflow-x-auto custom-scrollbar" style={{ paddingBottom: 1 }}>
        {presets.map(p => (
          <button key={p.id} onClick={() => setActivePreset(p.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0"
            style={p.id === activePresetId
              ? { background: "var(--accent)", color: "#fff" }
              : { background: "var(--bg-surface2)", color: "var(--text-secondary)", border: "1px solid var(--border)" }
            }
          >{p.name}</button>
        ))}
        <button onClick={() => { addPreset("Preset Baru", []); setShowEditor(true); }}
          className="btn-ghost flex items-center gap-1 text-xs py-1.5 px-2.5 shrink-0"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          <span className="hidden sm:inline">Preset</span>
        </button>
        {activePreset && (
          <button onClick={() => setShowEditor(true)} className="btn-ghost p-1.5 shrink-0" title="Edit Preset">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>
        )}
      </div>

      {/* ── Table ── */}
      {!activePreset ? (
        <div className="flex-1 flex flex-col items-center justify-center rounded-2xl" style={{ background: "var(--bg-surface)", border: "2px dashed var(--border)" }}>
          <svg className="w-10 h-10 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: "var(--text-muted)" }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18M10 3v18M6 3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6a3 3 0 013-3z" />
          </svg>
          <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Belum ada preset</p>
          <p className="text-xs mt-1 mb-4" style={{ color: "var(--text-muted)" }}>Buat preset untuk mulai menampilkan data</p>
          <button onClick={() => { addPreset("Preset Pertama", []); setShowEditor(true); }} className="btn-primary text-sm">
            + Buat Preset
          </button>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-auto rounded-2xl custom-scrollbar" style={{ border: "1px solid var(--border)" }}>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <table className="text-xs border-collapse" style={{ tableLayout: "fixed", width: "max-content" }}>
                <thead className="sticky top-0 z-10 th-table-head">
                  <tr>
                    {/* Kolom Action BAI — fixed paling kiri */}
                    <th className="sticky left-0 z-20 th-table-head" style={{ width: 40, minWidth: 40, padding: "10px 8px", borderBottom: "2px solid var(--border)", textAlign: "center" }}>
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>BAI</span>
                    </th>
                    <SortableContext items={columns} strategy={horizontalListSortingStrategy}>
                      {columns.map(col => (
                        <TableHeaderCell
                          key={col} column={col}
                          width={widths[col] ?? DEFAULT_COL_WIDTH}
                          minWidth={MIN_COL_WIDTH}
                          onResize={resize.onMouseDown}
                          onAutoFit={resize.onDoubleClick}
                          onFilter={handleOpenFilter}
                          isFiltered={activeFilters[col]?.length > 0}
                        />
                      ))}
                    </SortableContext>
                  </tr>
                </thead>
                <tbody>
                  {pagination.rows.map((r, rowIdx) => {
                    const status  = statusMaster?.status_column ? r.data?.[statusMaster.status_column] : r.data?.StatusPekerjaan;
                    const themeId = columnColors[status] || "gray";
                    const theme   = getColorTheme(themeId);

                    return (
                      <tr key={r.row_id}
                        className={`th-table-row ${rowIdx % 2 !== 0 ? "th-table-row-alt" : ""}`}
                        style={{ background: rowIdx % 2 !== 0 ? "var(--table-row-alt)" : "var(--bg-surface)" }}
                      >
                        {/* Action cell BAI */}
                        <td className="sticky left-0 z-10 border-r" style={{ width: 40, minWidth: 40, padding: "4px 8px", textAlign: "center", borderColor: "var(--border)", background: rowIdx % 2 !== 0 ? "var(--table-row-alt)" : "var(--bg-surface)" }}>
                          <BaiActionButton
                            rowId={r.row_id}
                            idPa={r.data["ID PA"] || ""}
                            namaPerusahaan={r.data["NAMA PERUSAHAAN"] || ""}
                            onToast={showToast}
                          />
                        </td>
                        {columns.map(col => {
                          const colWidth = widths[col] ?? DEFAULT_COL_WIDTH;
                          return (
                            <td key={col}
                              className="px-3 py-2 border-r overflow-hidden"
                              style={{ borderColor: "var(--border)", maxWidth: colWidth }}
                              title={r.data[col]}
                            >
                              <div className="truncate w-full block" style={{ maxWidth: `${colWidth - 24}px` }}>
                                {statusMaster?.status_column && statusMaster?.detail_column
                                  ? renderCell(r, col, labelColors, statusMaster.status_column, statusMaster.detail_column)
                                  : renderCell(r, col, labelColors)
                                }
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </DndContext>
          </div>

          {/* ── Pagination ── */}
          <div className="shrink-0 flex items-center justify-between px-3 py-2.5 mt-2 rounded-xl"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
          >
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              Menampilkan <b style={{ color: "var(--text-primary)" }}>{(pagination.page - 1) * pagination.pageSize + 1}–{Math.min(pagination.page * pagination.pageSize, filteredRecords.length)}</b> dari <b style={{ color: "var(--text-primary)" }}>{filteredRecords.length}</b> data
            </span>

            <div className="flex items-center gap-2">
              <select value={pagination.pageSize} onChange={e => pagination.setPageSize(Number(e.target.value))}
                className="th-select text-xs py-1">
                <option value={10}>10/hal</option>
                <option value={20}>20/hal</option>
                <option value={50}>50/hal</option>
              </select>

              <div className="flex gap-1">
                <button disabled={pagination.page === 1} onClick={() => pagination.setPage(1)}
                  className="btn-ghost px-2 py-1 text-xs disabled:opacity-30" title="Halaman pertama">«</button>
                <button disabled={pagination.page === 1} onClick={() => pagination.setPage(p => p - 1)}
                  className="btn-ghost px-2 py-1 text-xs disabled:opacity-30">‹</button>
                <span className="px-3 py-1 text-xs font-medium rounded-lg"
                  style={{ background: "var(--accent)", color: "#fff" }}>
                  {pagination.page}
                </span>
                <button disabled={pagination.page === pagination.totalPage} onClick={() => pagination.setPage(p => p + 1)}
                  className="btn-ghost px-2 py-1 text-xs disabled:opacity-30">›</button>
                <button disabled={pagination.page === pagination.totalPage} onClick={() => pagination.setPage(pagination.totalPage)}
                  className="btn-ghost px-2 py-1 text-xs disabled:opacity-30" title="Halaman terakhir">»</button>
              </div>
            </div>
          </div>
        </>
      )}

      {showEditor && activePreset && <PresetEditorModal presetId={activePreset.id} onClose={() => setShowEditor(false)} />}
      {showEditableColumns && <EditableColumnsModal onClose={() => setShowEditableColumns(false)} />}
      {activeFilterCol && <ColumnFilter column={activeFilterCol} onClose={() => setActiveFilterCol(null)} position={filterPos} />}
    </div>
  );
}