/**
 * presetStore.ts
 * Store preset Engineer — interface TIDAK BERUBAH, semua komponen lain tidak perlu diubah.
 *
 * Perubahan internal:
 * - Setiap preset sekarang punya db_id (number | null) untuk referensi ke DB
 * - Setiap mutasi (add/rename/updateColumns/updatePreset/delete) diikuti
 *   fire-and-forget sync ke /api/presets
 * - Saat app mount, data di-load dari DB via loadFromDB()
 * - Kalau DB tidak tersedia (belum login, error), state lokal tetap jalan
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import presetApi from "../services/presetApi";

export type TablePreset = {
  id:      string;   // UUID lokal (tetap dipakai sebagai key di komponen)
  db_id?:  number;   // ID di database
  name:    string;
  columns: string[];
  widths?: Record<string, number>;
};

type PresetState = {
  presets:       TablePreset[];
  activePresetId: string | null;

  // Sama persis dengan sebelumnya
  addPreset:          (name: string, columns: string[]) => void;
  renamePreset:       (id: string, name: string) => void;
  updatePresetColumns:(id: string, columns: string[]) => void;
  updateWidth:        (id: string, col: string, width: number) => void;
  updatePreset:       (id: string, updates: Partial<TablePreset>) => void;
  reorderColumns:     (id: string, newOrder: string[]) => void;
  deletePreset:       (id: string) => void;
  setActivePreset:    (id: string) => void;

  // Baru: load dari DB saat login
  loadFromDB: () => Promise<void>;
};

export const usePresetStore = create<PresetState>()(
  persist(
    (set, get) => ({
      presets:        [],
      activePresetId: null,

      // ── Load dari DB saat login ──────────────────────────────────────────
      loadFromDB: async () => {
        try {
          const dbPresets = await presetApi.list("engineer");
          if (!dbPresets || !dbPresets.length) return;

          const merged: TablePreset[] = dbPresets.map(p => ({
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
        } catch {
          // Gagal load DB → pakai state lokal
        }
      },

      // ── addPreset ─────────────────────────────────────────────────────────
      addPreset: (name, columns) => {
        const tempId = crypto.randomUUID();
        const preset: TablePreset = { id: tempId, name, columns, widths: {} };
        set(state => ({
          presets: [...(state.presets ?? []), preset],
          activePresetId: tempId,
        }));

        // Sync ke DB, update db_id setelah berhasil
        presetApi.create("engineer", name, columns).then(created => {
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

      // ── updateWidth ───────────────────────────────────────────────────────
      updateWidth: (id, col, width) => {
        set(state => ({
          presets: (state.presets ?? []).map(p =>
            p.id === id ? { ...p, widths: { ...(p.widths ?? {}), [col]: Math.max(80, width) } } : p
          ),
        }));
        const preset = (get().presets ?? []).find(p => p.id === id);
        if (preset?.db_id) presetApi.update(preset.db_id, { widths: preset.widths }).catch(() => {});
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
      name: "dashboard-table-presets",
      // Handle localStorage lama yang mungkin punya format berbeda
      merge: (persisted: any, current) => {
        const presets = Array.isArray(persisted?.presets) ? persisted.presets : [];
        return {
          ...current,
          ...persisted,
          presets,
        };
      },
    }
  )
);