import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppearanceState {
  // --- WARNA & TAMPILAN ---
  columnColors: Record<string, string>;
  labelColors: Record<string, string>;
  cardFields: string[];
  hiddenStatuses: string[];

  // --- UKURAN (BARU) ---
  columnWidth: number; // Dalam pixel

  // --- FILTER ---
  activeFilters: Record<string, string[]>;

  // --- EDITABLE COLUMNS ---
  editableColumns: string[];

  setColumnColor: (statusName: string, colorId: string) => void;
  setLabelColor: (labelName: string, colorId: string) => void;
  setCardFields: (fields: string[]) => void;
  toggleStatusVisibility: (statusName: string) => void;

  // Action Ukuran
  setColumnWidth: (width: number) => void;

  // Action Filter
  toggleFilter: (key: string, value: string) => void;
  clearFilters: () => void;

  // Action Editable Columns
  toggleEditableColumn: (columnName: string) => void;
  setEditableColumns: (columnNames: string[]) => void;

  resetDefaults: () => void;
}

export const useAppearanceStore = create<AppearanceState>()(
  persist(
    (set) => ({
      columnColors: {},
      labelColors: {},
      cardFields: ["ID PA"],
      hiddenStatuses: [],

      // Default lebar kolom standar (320px)
      columnWidth: 320,

      activeFilters: {},

      // Editable columns
      editableColumns: [],

      setColumnColor: (statusName, colorId) =>
        set((state) => ({
          columnColors: { ...state.columnColors, [statusName]: colorId },
        })),

      setLabelColor: (labelName, colorId) =>
        set((state) => ({
          labelColors: { ...state.labelColors, [labelName]: colorId },
        })),

      setCardFields: (fields) =>
        set(() => ({ cardFields: fields })),

      toggleStatusVisibility: (statusName) =>
        set((state) => {
          const isHidden = state.hiddenStatuses.includes(statusName);
          return {
            hiddenStatuses: isHidden
              ? state.hiddenStatuses.filter((s) => s !== statusName)
              : [...state.hiddenStatuses, statusName],
          };
        }),

      // Set Ukuran
      setColumnWidth: (width) => set({ columnWidth: width }),

      toggleFilter: (key, value) =>
        set((state) => {
          const currentValues = state.activeFilters[key] || [];
          let newValues;
          if (currentValues.includes(value)) {
            newValues = currentValues.filter((v) => v !== value);
          } else {
            newValues = [...currentValues, value];
          }
          const newFilters = { ...state.activeFilters };
          if (newValues.length > 0) {
            newFilters[key] = newValues;
          } else {
            delete newFilters[key];
          }
          return { activeFilters: newFilters };
        }),

      clearFilters: () => set({ activeFilters: {} }),

      // Editable columns actions
      toggleEditableColumn: (columnName) =>
        set((state) => {
          const isCurrentlyEditable = state.editableColumns.includes(columnName);
          const newEditableColumns = isCurrentlyEditable
            ? state.editableColumns.filter(col => col !== columnName)
            : [...state.editableColumns, columnName];

          return { editableColumns: newEditableColumns };
        }),

      setEditableColumns: (columnNames) =>
        set(() => ({ editableColumns: columnNames })),

      resetDefaults: () => set({
        columnColors: {},
        labelColors: {},
        cardFields: [],
        hiddenStatuses: [],
        activeFilters: {},
        columnWidth: 320,
        editableColumns: []
      }),
    }),
    {
      name: "appearance-storage",
    }
  )
);