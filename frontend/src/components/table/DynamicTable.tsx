import { useState, useMemo, useEffect } from "react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";

import { useTaskStore }       from "../../state/taskStore";
import { usePresetStore }     from "../../state/presetStore";
import { useAppearanceStore } from "../../state/appearanceStore";
import { useAuthStore }       from "../../state/authStore";
import { getColorTheme }      from "../../utils/colorPalette";
import { getDynamicTableConfig, type DynamicTableConfig } from "../../services/settingsApi";

import { useTablePagination } from "../../hooks/useTablePagination";
import { useTableResize }     from "../../hooks/useTableResize";
import { useToast }           from "../../hooks/useToast";
import { useTableData }       from "../../hooks/useTableData";
import { useCellEditor }      from "../../hooks/useCellEditor";

import { TableHeaderCell }      from "./TableHeaderCell";
import { TableBody }            from "./TableBody";
import { TablePagination }      from "./TablePagination";
import TableToolbar              from "./TableToolbar";
import PresetEditorModal         from "../preset/PresetEditorModal";
import ColumnFilter              from "./ColumnFilter";
import MobileRecordList          from "./MobileRecordList";
import MobileFilterSheet         from "./MobileFilterSheet";
import BaiActionButton            from "./BaiActionButton";
import TeskomActionButton         from "./TeskomActionButton";

const MIN_COL_WIDTH     = 60;
const DEFAULT_COL_WIDTH = 150;

type Props = {
  view?:         "table" | "kanban";
  onViewChange?: (v: "table" | "kanban") => void;
  toolbarOnly?:  boolean;
};

export default function DynamicTable({ view, onViewChange, toolbarOnly = false }: Props = {}) {
  /* ── Stores ────────────────────────────────────────────────────────────── */
  const records         = useTaskStore(s => s.records) ?? [];
  const statusMaster    = useTaskStore(s => s.statusMaster);
  const presets         = usePresetStore(s => s.presets) ?? [];
  const activePresetId  = usePresetStore(s => s.activePresetId);
  const setActivePreset = usePresetStore(s => s.setActivePreset);
  const reorderColumns  = usePresetStore(s => s.reorderColumns);
  const updatePreset    = usePresetStore(s => s.updatePreset);
  const { columnColors, labelColors, editableColumns, toggleEditableColumn } = useAppearanceStore();
  const updateCell = useTaskStore(s => s.updateCell);
  const updateStatus = useTaskStore(s => s.updateStatus);
  const { user }        = useAuthStore();

  /* ── Config dari API ───────────────────────────────────────────────────── */
  const [tableConfig, setTableConfig] = useState<DynamicTableConfig>({
    colIdPa:            "ID PA",
    colNamaPerusahaan:  "NAMA PERUSAHAAN",
    tableTitle:         "Detail Pekerjaan",
    ptlEditableColumns: ["STATUS", "DETAIL", "KETERANGAN"],
  });

  useEffect(() => { getDynamicTableConfig().then(setTableConfig); }, []);
  useEffect(() => {
    usePresetStore.getState().loadFromDB();
    useAppearanceStore.getState().loadEditableColumnsFromDB();
  }, []);

  /* ── Derived ───────────────────────────────────────────────────────────── */
  const activePreset  = presets.find(p => p.id === activePresetId);
  const pinnedColumns = activePreset?.pinnedColumns ?? [];
  const columns       = activePreset?.columns ?? [];
  const widths        = activePreset?.widths ?? {};

  const ptlEditableSet = useMemo(
    () => new Set(tableConfig.ptlEditableColumns),
    [tableConfig.ptlEditableColumns]
  );

  /* ── Custom hooks ──────────────────────────────────────────────────────── */
  const [search, setSearch] = useState("");
  const { filteredRecords, activeFilters } = useTableData(records, search, statusMaster);
  const editor     = useCellEditor(statusMaster, ptlEditableSet);
  const pagination = useTablePagination(filteredRecords);
  const resize     = useTableResize(activePreset?.id, widths, filteredRecords);
  const { show: showToast } = useToast();

  /* ── UI State ──────────────────────────────────────────────────────────── */
  const [editorMode,          setEditorMode]          = useState<"create" | "edit" | null>(null);
  const [activeFilterCol,     setActiveFilterCol]     = useState<string | null>(null);
  const [mobileFilterOpen,     setMobileFilterOpen]     = useState(false);
  const [filterPos,           setFilterPos]           = useState({ top: 0, left: 0 });
  const [saving]              = useState(false);

  /* ── DnD ───────────────────────────────────────────────────────────────── */
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (activePresetId && over && active.id !== over.id) {
      const oi = columns.indexOf(active.id as string);
      const ni = columns.indexOf(over.id as string);
      reorderColumns(activePresetId, arrayMove(columns, oi, ni));
    }
  };

  /* ── Pin ───────────────────────────────────────────────────────────────── */
  const handleTogglePin = (col: string) => {
    if (!activePreset) return;
    const current   = activePreset.pinnedColumns ?? [];
    const cols      = activePreset.columns ?? [];
    const isPinning = !current.includes(col);
    if (isPinning) {
      const nextPinned = [...current, col];
      const unpinned   = cols.filter(c => !nextPinned.includes(c));
      updatePreset(activePreset.id, { pinnedColumns: nextPinned, columns: [...nextPinned, ...unpinned] });
    } else {
      updatePreset(activePreset.id, { pinnedColumns: current.filter(c => c !== col) });
    }
  };

  /* ── Filter popup ──────────────────────────────────────────────────────── */
  const handleOpenFilter = (e: React.MouseEvent, col: string) => {
    const rect    = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const POPUP_W = 268, POPUP_MAX_H = 420;
    const vw = window.innerWidth, vh = window.innerHeight;
    const left = rect.left + POPUP_W > vw ? Math.max(4, vw - POPUP_W - 8) : rect.left;
    const top  = rect.bottom + 5 + POPUP_MAX_H > vh ? Math.max(4, rect.top - POPUP_MAX_H - 4) : rect.bottom + 5;
    setFilterPos({ top, left });
    setActiveFilterCol(activeFilterCol === col ? null : col);
  };

  const filterCount = Object.keys(activeFilters).length;

  /* ── Render ────────────────────────────────────────────────────────────── */
  return (
    <div className={toolbarOnly ? "shrink-0" : "flex flex-col h-full"}>

      <TableToolbar
        title={tableConfig.tableTitle}
        recordCount={records.length}
        userName={user?.nama_lengkap ?? ""}
        saving={saving}
        view={view}
        onViewChange={onViewChange}
        search={search}
        onSearch={v => { setSearch(v); pagination.setPage(1); }}
        presets={presets.map(p => ({ id: p.id, name: p.name, columns: p.columns ?? [] }))}
        activePreset={activePreset ? { id: activePreset.id, name: activePreset.name, columns: activePreset.columns ?? [] } : null}
        onSelectPreset={id => setActivePreset(id as string)}
        onCreatePreset={() => setEditorMode("create")}
        onEditPreset={() => setEditorMode("edit")}
        filterCount={filterCount}
        onResetFilter={() => useAppearanceStore.getState().clearFilters()}
        onOpenMobileFilter={() => setMobileFilterOpen(true)}
        filteredCount={filteredRecords.length}
        totalCount={records.length}
      />

      {!toolbarOnly && (
        <>
          {!activePreset ? (
            <div className="flex-1 flex flex-col items-center justify-center rounded-2xl"
              style={{ background: "var(--bg-surface)", border: "2px dashed var(--border)" }}>
              <svg className="w-10 h-10 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
                style={{ color: "var(--text-muted)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18M10 3v18M6 3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6a3 3 0 013-3z" />
              </svg>
              <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Belum ada preset</p>
              <p className="text-xs mt-1 mb-4" style={{ color: "var(--text-muted)" }}>Buat preset untuk mulai menampilkan data</p>
              <button onClick={() => setEditorMode("create")} className="btn-primary text-sm">
                + Buat Preset
              </button>
            </div>
          ) : (
            <>
              <div className="md:hidden flex-1 min-h-0 overflow-y-auto custom-scrollbar px-3 pb-3">
                <MobileRecordList
                  records={pagination.rows}
                  columns={columns}
                  statusMaster={statusMaster}
                  canEditColumn={editor.canEditCell}
                  onCommit={async (rowId, col, value) => {
                    try {
                      await updateCell(rowId, col, value);
                      showToast("Data berhasil disimpan", "success");
                    } catch {
                      showToast("Gagal menyimpan data", "error");
                      throw new Error("update failed");
                    }
                  }}
                  onStatusChange={async (rowId, status, detail) => {
                    await updateStatus(rowId, status, detail);
                  }}
                  renderActions={record => (
                    <>
                      <BaiActionButton
                        rowId={record.row_id}
                        idPa={record.data[tableConfig.colIdPa] || ""}
                        namaPerusahaan={record.data[tableConfig.colNamaPerusahaan] || ""}
                        onToast={showToast}
                      />
                      <TeskomActionButton idPa={record.data[tableConfig.colIdPa] || ""} />
                    </>
                  )}
                />
              </div>

              <div className="hidden md:block flex-1 overflow-auto custom-scrollbar rounded-2xl"
                style={{ border: "1px solid var(--border)" }}>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <table className="text-xs"
                    style={{ tableLayout: "fixed", width: "max-content", borderCollapse: "separate", borderSpacing: 0 }}>
                    <colgroup>
                      <col style={{ width: "64px", minWidth: "64px" }} />
                      {columns.map(col => (
                        <col key={col} style={{ width: `${widths[col] ?? DEFAULT_COL_WIDTH}px`, minWidth: `${MIN_COL_WIDTH}px` }} />
                      ))}
                    </colgroup>
                    <thead>
                      <tr>
                        <th className="sticky top-0 left-0 th-table-head" style={{
                          zIndex: 30, width: 64, minWidth: 64, maxWidth: 64,
                          padding: "10px 8px", borderBottom: "2px solid var(--border)",
                          borderRight: "1px solid var(--border)", textAlign: "center",
                          background: "var(--table-head-bg)",
                        }}>
                          <span className="text-[10px] font-bold uppercase tracking-wider"
                            style={{ color: "var(--text-muted)" }}>Aksi</span>
                        </th>
                        <SortableContext items={columns} strategy={horizontalListSortingStrategy}>
                          {columns.map(col => {
                            const pinnedLeft = pinnedColumns.includes(col)
                              ? 64 + pinnedColumns.slice(0, pinnedColumns.indexOf(col))
                                  .reduce((acc, c) => acc + (widths[c] ?? DEFAULT_COL_WIDTH), 0)
                              : undefined;
                            return (
                              <TableHeaderCell
                                key={col} column={col}
                                width={widths[col] ?? DEFAULT_COL_WIDTH}
                                minWidth={MIN_COL_WIDTH}
                                onResize={resize.onMouseDown}
                                onAutoFit={resize.onDoubleClick}
                                onFilter={handleOpenFilter}
                                isFiltered={activeFilters[col]?.length > 0}
                                isPinned={pinnedColumns.includes(col)}
                                pinnedLeft={pinnedLeft}
                                onPin={handleTogglePin}
                                isEditable={editableColumns.includes(col)}
                                onToggleEditable={toggleEditableColumn}
                              />
                            );
                          })}
                        </SortableContext>
                      </tr>
                    </thead>
                    <TableBody
                      rows={pagination.rows}
                      columns={columns}
                      widths={widths}
                      pinnedColumns={pinnedColumns}
                      statusMaster={statusMaster}
                      columnColors={columnColors}
                      labelColors={labelColors}
                      tableConfig={tableConfig}
                      editor={editor}
                      onToast={showToast}
                    />
                  </table>
                </DndContext>
              </div>

              <div className="shrink-0 md:hidden px-3 pb-3">
                <TablePagination
                  page={pagination.page}
                  pageSize={pagination.pageSize}
                  totalPage={pagination.totalPage}
                  total={filteredRecords.length}
                  setPage={pagination.setPage}
                  setPageSize={pagination.setPageSize}
                />
              </div>
              <div className="hidden md:block shrink-0 px-4 pb-3">
                <TablePagination
                  page={pagination.page}
                  pageSize={pagination.pageSize}
                  totalPage={pagination.totalPage}
                  total={filteredRecords.length}
                  setPage={pagination.setPage}
                  setPageSize={pagination.setPageSize}
                />
              </div>
            </>
          )}
        </>
      )}

      {editorMode && (editorMode === "create" || activePreset) && (
        <PresetEditorModal
          presetId={editorMode === "edit" ? activePreset?.id : undefined}
          scope="engineer"
          onClose={() => setEditorMode(null)}
        />
      )}
      <MobileFilterSheet
        open={mobileFilterOpen}
        columns={columns}
        records={records}
        activeFilters={activeFilters}
        onToggle={(col, val) => {
          useAppearanceStore.getState().toggleFilter(col, val);
          pagination.setPage(1);
        }}
        onReset={() => {
          useAppearanceStore.getState().clearFilters();
          pagination.setPage(1);
        }}
        onClose={() => setMobileFilterOpen(false)}
      />

      {activeFilterCol && (
        <ColumnFilter
          column={activeFilterCol}
          records={records}
          activeFilters={activeFilters}
          onToggle={(col, val) => useAppearanceStore.getState().toggleFilter(col, val)}
          onClose={() => setActiveFilterCol(null)}
          position={filterPos}
        />
      )}
    </div>
  );
}
