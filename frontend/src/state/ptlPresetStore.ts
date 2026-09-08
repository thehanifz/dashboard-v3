/**
 * ptlPresetStore.ts
 * Store preset PTL — interface TIDAK BERUBAH dari versi sebelumnya.
 * Sync DB fire-and-forget sama seperti presetStore Engineer.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import presetApi, { type DBPreset } from "../services/presetApi";
import { getPresetCache, setPresetCache } from "../services/presetCache";

export type PTLTablePreset = {
  id:             string;
  db_id?:         number;
  name:           string;
  columns:        string[];
  widths?:        Record<string, number>;
  pinnedColumns?: string[];
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

async function persistPtlCache(presets: PTLTablePreset[]) {
  const dbPresets: DBPreset[] = presets
    .filter(p => Number.isFinite(p.db_id))
    .map(p => ({
      id: p.db_id as number,
      scope: "ptl" as const,
      name: p.name,
      columns: p.columns,
      widths: p.widths ?? {},
    }));
  await setPresetCache("ptl", dbPresets);
}

export const usePTLPresetStore = create<PTLPresetState>()(
  persist(
    (set, get) => ({
      presets:        [],
      activePresetId: null,

      // ── Load cache-first, lalu background sync dari backend ──────────────
      loadFromDB: async () => {
        const applyPresets = (dbPresets: DBPreset[]) => {
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
        };

        const cached = await getPresetCache("ptl");
        if (cached) {
          applyPresets(cached);
        }

        try {
          const fresh = await presetApi.list("ptl");
          const changed = JSON.stringify(cached ?? null) !== JSON.stringify(fresh);
          if (changed) {
            await setPresetCache("ptl", fresh);
            applyPresets(fresh);
          } else if (!cached) {
            await setPresetCache("ptl", fresh);
            applyPresets(fresh);
          }
        } catch {
          // Cache tetap menjadi fallback ketika backend tidak tersedia.
        }
      },

      // ── addPreset ─────────────────────────────────────────────────────────
      addPreset: (name, columns) => {
        const tempId = crypto.randomUUID();
        const preset: PTLTablePreset = { id: tempId, name, columns, widths: {} };
        set(state => ({ presets: [...(state.presets ?? []), preset], activePresetId: tempId }));

        presetApi.create("ptl", name, columns).then(async created => {
          set(state => ({
            presets: (state.presets ?? []).map(p =>
              p.id === tempId ? { ...p, db_id: created.id, id: created.id.toString() } : p
            ),
            activePresetId: state.activePresetId === tempId ? created.id.toString() : state.activePresetId,
          }));
          await persistPtlCache(get().presets ?? []);
        }).catch(() => {});
      },

      // ── renamePreset ──────────────────────────────────────────────────────
      renamePreset: (id, name) => {
        set(state => ({ presets: (state.presets ?? []).map(p => p.id === id ? { ...p, name } : p) }));
        const preset = (get().presets ?? []).find(p => p.id === id);
        if (preset?.db_id) presetApi.update(preset.db_id, { name }).then(() => persistPtlCache(get().presets ?? [])).catch(() => {});
      },

      // ── updatePresetColumns ───────────────────────────────────────────────
      updatePresetColumns: (id, columns) => {
        set(state => ({ presets: (state.presets ?? []).map(p => p.id === id ? { ...p, columns } : p) }));
        const preset = (get().presets ?? []).find(p => p.id === id);
        if (preset?.db_id) presetApi.update(preset.db_id, { columns }).then(() => persistPtlCache(get().presets ?? [])).catch(() => {});
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
          }).then(() => persistPtlCache(get().presets ?? [])).catch(() => {});
        }
      },

      // ── reorderColumns ────────────────────────────────────────────────────
      reorderColumns: (id, newOrder) => {
        set(state => ({ presets: (state.presets ?? []).map(p => p.id === id ? { ...p, columns: newOrder } : p) }));
        const preset = (get().presets ?? []).find(p => p.id === id);
        if (preset?.db_id) presetApi.update(preset.db_id, { columns: newOrder }).then(() => persistPtlCache(get().presets ?? [])).catch(() => {});
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
        if (preset?.db_id) presetApi.remove(preset.db_id).then(() => persistPtlCache(get().presets ?? [])).catch(() => {});
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