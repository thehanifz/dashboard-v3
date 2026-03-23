import { create } from "zustand";
import { persist } from "zustand/middleware";
import presetApi from "../services/presetApi";

interface AppearanceState {
  // --- WARNA & TAMPILAN (Engineer Kanban) ---
  columnColors:   Record<string, string>;
  labelColors:    Record<string, string>;
  cardFields:     string[];
  hiddenStatuses: string[];

  // --- WARNA & TAMPILAN (PTL Kanban) ---
  ptlColumnColors:   Record<string, string>;
  ptlLabelColors:    Record<string, string>;
  ptlCardFields:     string[];
  ptlHiddenStatuses: string[];
  ptlColumnWidth:    number;

  // --- UKURAN ---
  columnWidth: number;

  // --- FILTER ---
  activeFilters: Record<string, string[]>;

  // --- EDITABLE COLUMNS ---
  editableColumns:    string[];
  ptlEditableColumns: string[];

  setColumnColor:        (statusName: string, colorId: string) => void;
  setLabelColor:         (labelName: string, colorId: string) => void;
  setCardFields:         (fields: string[]) => void;
  toggleStatusVisibility:(statusName: string) => void;
  setColumnWidth:        (width: number) => void;

  // PTL Kanban setters
  setPtlColumnColor:        (statusName: string, colorId: string) => void;
  setPtlLabelColor:         (labelName: string, colorId: string) => void;
  setPtlCardFields:         (fields: string[]) => void;
  togglePtlStatusVisibility:(statusName: string) => void;
  setPtlColumnWidth:        (width: number) => void;

  toggleFilter:          (key: string, value: string) => void;
  clearFilters:          () => void;
  toggleEditableColumn:     (columnName: string) => void;
  setEditableColumns:       (columnNames: string[]) => void;
  togglePtlEditableColumn:  (columnName: string) => void;
  setPtlEditableColumns:    (columnNames: string[]) => void;
  resetDefaults:         () => void;

  loadEditableColumnsFromDB:    () => Promise<void>;
  loadPtlEditableColumnsFromDB: () => Promise<void>;
}

export const useAppearanceStore = create<AppearanceState>()(
  persist(
    (set, get) => ({
      columnColors:   {},
      labelColors:    {},
      cardFields:     ["ID PA"],
      hiddenStatuses: [],
      columnWidth:    320,

      ptlColumnColors:   {},
      ptlLabelColors:    {},
      ptlCardFields:     ["ID PA"],
      ptlHiddenStatuses: [],
      ptlColumnWidth:    300,

      activeFilters:  {},
      editableColumns:    [],
      ptlEditableColumns: [],

      setColumnColor: (statusName, colorId) =>
        set(state => ({ columnColors: { ...state.columnColors, [statusName]: colorId } })),

      setLabelColor: (labelName, colorId) =>
        set(state => ({ labelColors: { ...state.labelColors, [labelName]: colorId } })),

      setCardFields: (fields) => set({ cardFields: fields }),

      toggleStatusVisibility: (statusName) =>
        set(state => ({
          hiddenStatuses: state.hiddenStatuses.includes(statusName)
            ? state.hiddenStatuses.filter(s => s !== statusName)
            : [...state.hiddenStatuses, statusName],
        })),

      setColumnWidth: (width) => set({ columnWidth: width }),

      // ── PTL Kanban setters ─────────────────────────────────────────────────
      setPtlColumnColor: (statusName, colorId) =>
        set(state => ({ ptlColumnColors: { ...state.ptlColumnColors, [statusName]: colorId } })),

      setPtlLabelColor: (labelName, colorId) =>
        set(state => ({ ptlLabelColors: { ...state.ptlLabelColors, [labelName]: colorId } })),

      setPtlCardFields: (fields) => set({ ptlCardFields: fields }),

      togglePtlStatusVisibility: (statusName) =>
        set(state => ({
          ptlHiddenStatuses: state.ptlHiddenStatuses.includes(statusName)
            ? state.ptlHiddenStatuses.filter(s => s !== statusName)
            : [...state.ptlHiddenStatuses, statusName],
        })),

      setPtlColumnWidth: (width) => set({ ptlColumnWidth: width }),

      toggleFilter: (key, value) =>
        set(state => {
          const cur = state.activeFilters[key] || [];
          const next = cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value];
          const newFilters = { ...state.activeFilters };
          if (next.length > 0) newFilters[key] = next; else delete newFilters[key];
          return { activeFilters: newFilters };
        }),

      clearFilters: () => set({ activeFilters: {} }),

      // ── toggleEditableColumn — sync ke DB ─────────────────────────────────
      toggleEditableColumn: (columnName) => {
        set(state => {
          const isEditable = state.editableColumns.includes(columnName);
          const newCols = isEditable
            ? state.editableColumns.filter(c => c !== columnName)
            : [...state.editableColumns, columnName];
          presetApi.saveEditableColumns(newCols, "engineer").catch(() => {});
          return { editableColumns: newCols };
        });
      },

      // ── setEditableColumns — sync ke DB ───────────────────────────────────
      setEditableColumns: (columnNames) => {
        set({ editableColumns: columnNames });
        presetApi.saveEditableColumns(columnNames, "engineer").catch(() => {});
      },

      // ── togglePtlEditableColumn — sync ke DB ──────────────────────────────
      togglePtlEditableColumn: (columnName) => {
        set(state => {
          const isEditable = state.ptlEditableColumns.includes(columnName);
          const newCols = isEditable
            ? state.ptlEditableColumns.filter(c => c !== columnName)
            : [...state.ptlEditableColumns, columnName];
          presetApi.saveEditableColumns(newCols, "ptl").catch(() => {});
          return { ptlEditableColumns: newCols };
        });
      },

      // ── setPtlEditableColumns — sync ke DB ────────────────────────────────
      setPtlEditableColumns: (columnNames) => {
        set({ ptlEditableColumns: columnNames });
        presetApi.saveEditableColumns(columnNames, "ptl").catch(() => {});
      },

      resetDefaults: () => set({
        columnColors:       {},
        labelColors:        {},
        cardFields:         [],
        hiddenStatuses:     [],
        activeFilters:      {},
        columnWidth:        320,
        editableColumns:    [],
        ptlEditableColumns: [],
        ptlColumnColors:    {},
        ptlLabelColors:     {},
        ptlCardFields:      ["ID PA"],
        ptlHiddenStatuses:  [],
        ptlColumnWidth:     300,
      }),

      // ── Load dari DB saat login ───────────────────────────────────────────
      loadEditableColumnsFromDB: async () => {
        try {
          const cols = await presetApi.getEditableColumns("engineer");
          if (cols.length > 0) set({ editableColumns: cols });
        } catch {}
      },

      loadPtlEditableColumnsFromDB: async () => {
        try {
          const cols = await presetApi.getEditableColumns("ptl");
          if (cols.length > 0) set({ ptlEditableColumns: cols });
        } catch {}
      },
    }),
    {
      name: "appearance-storage",
      // editableColumns tidak di-persist ke localStorage — selalu load dari DB
      partialize: (state) => ({
        columnColors:      state.columnColors,
        labelColors:       state.labelColors,
        cardFields:        state.cardFields,
        hiddenStatuses:    state.hiddenStatuses,
        columnWidth:       state.columnWidth,
        activeFilters:     state.activeFilters,
        ptlColumnColors:   state.ptlColumnColors,
        ptlLabelColors:    state.ptlLabelColors,
        ptlCardFields:     state.ptlCardFields,
        ptlHiddenStatuses: state.ptlHiddenStatuses,
        ptlColumnWidth:    state.ptlColumnWidth,
        // editableColumns sengaja TIDAK disimpan ke localStorage
      }),
    }
  )
);