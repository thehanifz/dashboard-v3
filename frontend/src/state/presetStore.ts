import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TablePreset = {
  id: string;
  name: string;
  columns: string[];
  widths?: Record<string, number>;
};

type PresetState = {
  presets: TablePreset[];
  activePresetId: string | null;

  addPreset: (name: string, columns: string[]) => void;
  renamePreset: (id: string, name: string) => void;
  updatePresetColumns: (id: string, columns: string[]) => void;
  updateWidth: (id: string, col: string, width: number) => void;
  updatePreset: (id: string, updates: Partial<TablePreset>) => void;
  
  // --- BARU: REORDER ---
  reorderColumns: (id: string, newOrder: string[]) => void;

  deletePreset: (id: string) => void;
  setActivePreset: (id: string) => void;
};

export const usePresetStore = create<PresetState>()(
  persist(
    (set, get) => ({
      presets: [],
      activePresetId: null,

      addPreset: (name, columns) => {
        const preset: TablePreset = {
          id: crypto.randomUUID(),
          name,
          columns,
          widths: {},
        };
        set((state) => ({
          presets: [...state.presets, preset],
          activePresetId: preset.id,
        }));
      },

      renamePreset: (id, name) =>
        set((state) => ({
          presets: state.presets.map((p) =>
            p.id === id ? { ...p, name } : p
          ),
        })),

      updatePresetColumns: (id, columns) =>
        set((state) => ({
          presets: state.presets.map((p) =>
            p.id === id ? { ...p, columns } : p
          ),
        })),

      updateWidth: (id, col, width) =>
        set((state) => ({
          presets: state.presets.map((p) =>
            p.id === id
              ? {
                  ...p,
                  widths: {
                    ...(p.widths ?? {}),
                    [col]: Math.max(80, width),
                  },
                }
              : p
          ),
        })),

      updatePreset: (id, updates) =>
        set((state) => ({
          presets: state.presets.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),
        
      // --- IMPLEMENTASI REORDER ---
      reorderColumns: (id, newOrder) =>
        set((state) => ({
          presets: state.presets.map((p) =>
            p.id === id ? { ...p, columns: newOrder } : p
          ),
        })),

      deletePreset: (id) =>
        set((state) => {
          const next = state.presets.filter((p) => p.id !== id);
          return {
            presets: next,
            activePresetId:
              state.activePresetId === id
                ? next[0]?.id ?? null
                : state.activePresetId,
          };
        }),

      setActivePreset: (id) => set({ activePresetId: id }),
    }),
    { name: "dashboard-table-presets" }
  )
);