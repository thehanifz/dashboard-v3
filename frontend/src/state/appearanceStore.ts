import { create } from "zustand";
import { persist } from "zustand/middleware";
import presetApi from "../services/presetApi";

interface AppearanceState {
  // --- WARNA & TAMPILAN ---
  columnColors:   Record<string, string>;
  labelColors:    Record<string, string>;
  cardFields:     string[];
  hiddenStatuses: string[];

  // --- UKURAN ---
  columnWidth: number;

  // --- FILTER ---
  activeFilters: Record<string, string[]>;

  // --- EDITABLE COLUMNS ---
  editableColumns: string[];

  setColumnColor:        (statusName: string, colorId: string) => void;
  setLabelColor:         (labelName: string, colorId: string) => void;
  setCardFields:         (fields: string[]) => void;
  toggleStatusVisibility:(statusName: string) => void;
  setColumnWidth:        (width: number) => void;
  toggleFilter:          (key: string, value: string) => void;
  clearFilters:          () => void;
  toggleEditableColumn:  (columnName: string) => void;
  setEditableColumns:    (columnNames: string[]) => void;
  resetDefaults:         () => void;

  // Baru: load editableColumns dari DB saat login
  loadEditableColumnsFromDB: () => Promise<void>;
}

export const useAppearanceStore = create<AppearanceState>()(
  persist(
    (set, get) => ({
      columnColors:   {},
      labelColors:    {},
      cardFields:     ["ID PA"],
      hiddenStatuses: [],
      columnWidth:    320,
      activeFilters:  {},
      editableColumns:[],

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
          // Fire-and-forget sync
          presetApi.saveEditableColumns(newCols).catch(() => {});
          return { editableColumns: newCols };
        });
      },

      // ── setEditableColumns — sync ke DB ───────────────────────────────────
      setEditableColumns: (columnNames) => {
        set({ editableColumns: columnNames });
        presetApi.saveEditableColumns(columnNames).catch(() => {});
      },

      resetDefaults: () => set({
        columnColors:    {},
        labelColors:     {},
        cardFields:      [],
        hiddenStatuses:  [],
        activeFilters:   {},
        columnWidth:     320,
        editableColumns: [],
      }),

      // ── Load dari DB saat login ───────────────────────────────────────────
      loadEditableColumnsFromDB: async () => {
        try {
          const cols = await presetApi.getEditableColumns();
          if (cols.length > 0) set({ editableColumns: cols });
        } catch {}
      },
    }),
    {
      name: "appearance-storage",
      // editableColumns tidak di-persist ke localStorage — selalu load dari DB
      partialize: (state) => ({
        columnColors:   state.columnColors,
        labelColors:    state.labelColors,
        cardFields:     state.cardFields,
        hiddenStatuses: state.hiddenStatuses,
        columnWidth:    state.columnWidth,
        activeFilters:  state.activeFilters,
        // editableColumns sengaja TIDAK disimpan ke localStorage
      }),
    }
  )
);