import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PTLTablePreset = {
  id: string;
  name: string;
  columns: string[];
  widths?: Record<string, number>;
};

type PTLPresetState = {
  presets: PTLTablePreset[];
  activePresetId: string | null;

  addPreset: (name: string, columns: string[]) => void;
  renamePreset: (id: string, name: string) => void;
  updatePresetColumns: (id: string, columns: string[]) => void;
  updatePreset: (id: string, updates: Partial<PTLTablePreset>) => void;
  reorderColumns: (id: string, newOrder: string[]) => void;
  deletePreset: (id: string) => void;
  setActivePreset: (id: string) => void;
};

export const usePTLPresetStore = create<PTLPresetState>()(
  persist(
    (set, get) => ({
      presets: [],
      activePresetId: null,

      addPreset: (name, columns) => {
        const preset: PTLTablePreset = {
          id: crypto.randomUUID(),
          name,
          columns,
          widths: {},
        };
        set(state => ({
          presets: [...state.presets, preset],
          activePresetId: preset.id,
        }));
      },

      renamePreset: (id, name) =>
        set(state => ({
          presets: state.presets.map(p => p.id === id ? { ...p, name } : p),
        })),

      updatePresetColumns: (id, columns) =>
        set(state => ({
          presets: state.presets.map(p => p.id === id ? { ...p, columns } : p),
        })),

      updatePreset: (id, updates) =>
        set(state => ({
          presets: state.presets.map(p => p.id === id ? { ...p, ...updates } : p),
        })),

      reorderColumns: (id, newOrder) =>
        set(state => ({
          presets: state.presets.map(p => p.id === id ? { ...p, columns: newOrder } : p),
        })),

      deletePreset: (id) =>
        set(state => {
          const next = state.presets.filter(p => p.id !== id);
          return {
            presets: next,
            activePresetId: state.activePresetId === id ? (next[0]?.id ?? null) : state.activePresetId,
          };
        }),

      setActivePreset: (id) => set({ activePresetId: id }),
    }),
    { name: "ptl-table-presets" }
  )
);