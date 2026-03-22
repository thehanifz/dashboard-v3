/**
 * ptlPresetStore.ts
 * Store preset PTL — interface TIDAK BERUBAH dari versi sebelumnya.
 * Sync DB fire-and-forget sama seperti presetStore Engineer.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import presetApi from "../services/presetApi";

export type PTLTablePreset = {
  id:      string;
  db_id?:  number;
  name:    string;
  columns: string[];
  widths?: Record<string, number>;
};

type PTLPresetState = {
  presets:        PTLTablePreset[];
  activePresetId: string | null;

  addPreset:          (name: string, columns: string[]) => void;
  renamePreset:       (id: string, name: string) => void;
  updatePresetColumns:(id: string, columns: string[]) => void;
  updatePreset:       (id: string, updates: Partial<PTLTablePreset>) => void;
  reorderColumns:     (id: string, newOrder: string[]) => void;
  deletePreset:       (id: string) => void;
  setActivePreset:    (id: string) => void;

  loadFromDB: () => Promise<void>;
};

export const usePTLPresetStore = create<PTLPresetState>()(
  persist(
    (set, get) => ({
      presets:        [],
      activePresetId: null,

      // ── Load dari DB ──────────────────────────────────────────────────────
      loadFromDB: async () => {
        try {
          const dbPresets = await presetApi.list("ptl");
          if (!dbPresets || !dbPresets.length) return;
          const merged: PTLTablePreset[] = dbPresets.map(p => ({
            id:      p.id.toString(),
            db_id:   p.id,
            name:    p.name,
            columns: Array.isArray(p.columns) ? p.columns : [],
            widths:  p.widths ?? {},
          }));
          set(state => ({
            presets: merged,
            activePresetId: merged.find(p => p.id === state.activePresetId)
              ? state.activePresetId
              : (merged[0]?.id ?? null),
          }));
        } catch {}
      },

      // ── addPreset ─────────────────────────────────────────────────────────
      addPreset: (name, columns) => {
        const tempId = crypto.randomUUID();
        const preset: PTLTablePreset = { id: tempId, name, columns, widths: {} };
        set(state => ({ presets: [...(state.presets ?? []), preset], activePresetId: tempId }));

        presetApi.create("ptl", name, columns).then(created => {
          set(state => ({
            presets: (state.presets ?? []).map(p =>
              p.id === tempId ? { ...p, db_id: created.id, id: created.id.toString() } : p
            ),
            activePresetId: state.activePresetId === tempId ? created.id.toString() : state.activePresetId,
          }));
        }).catch(() => {});
      },

      // ── renamePreset ──────────────────────────────────────────────────────
      renamePreset: (id, name) => {
        set(state => ({ presets: (state.presets ?? []).map(p => p.id === id ? { ...p, name } : p) }));
        const preset = (get().presets ?? []).find(p => p.id === id);
        if (preset?.db_id) presetApi.update(preset.db_id, { name }).catch(() => {});
      },

      // ── updatePresetColumns ───────────────────────────────────────────────
      updatePresetColumns: (id, columns) => {
        set(state => ({ presets: (state.presets ?? []).map(p => p.id === id ? { ...p, columns } : p) }));
        const preset = (get().presets ?? []).find(p => p.id === id);
        if (preset?.db_id) presetApi.update(preset.db_id, { columns }).catch(() => {});
      },

      // ── updatePreset ──────────────────────────────────────────────────────
      updatePreset: (id, updates) => {
        set(state => ({ presets: (state.presets ?? []).map(p => p.id === id ? { ...p, ...updates } : p) }));
        const preset = (get().presets ?? []).find(p => p.id === id);
        if (preset?.db_id) {
          const { name, columns, widths } = updates;
          presetApi.update(preset.db_id, {
            ...(name    !== undefined && { name }),
            ...(columns !== undefined && { columns }),
            ...(widths  !== undefined && { widths }),
          }).catch(() => {});
        }
      },

      // ── reorderColumns ────────────────────────────────────────────────────
      reorderColumns: (id, newOrder) => {
        set(state => ({ presets: (state.presets ?? []).map(p => p.id === id ? { ...p, columns: newOrder } : p) }));
        const preset = (get().presets ?? []).find(p => p.id === id);
        if (preset?.db_id) presetApi.update(preset.db_id, { columns: newOrder }).catch(() => {});
      },

      // ── deletePreset ──────────────────────────────────────────────────────
      deletePreset: (id) => {
        const preset = (get().presets ?? []).find(p => p.id === id);
        set(state => {
          const next = (state.presets ?? []).filter(p => p.id !== id);
          return {
            presets: next,
            activePresetId: state.activePresetId === id ? (next[0]?.id ?? null) : state.activePresetId,
          };
        });
        if (preset?.db_id) presetApi.remove(preset.db_id).catch(() => {});
      },

      // ── setActivePreset ───────────────────────────────────────────────────
      setActivePreset: (id) => set({ activePresetId: id }),
    }),
    { 
      name: "ptl-table-presets",
      merge: (persisted: any, current) => {
        const presets = Array.isArray(persisted?.presets) ? persisted.presets : [];
        return { ...current, ...persisted, presets };
      },
    }
  )
);