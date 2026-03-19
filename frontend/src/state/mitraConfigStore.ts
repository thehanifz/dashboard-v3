/**
 * mitraConfigStore.ts
 * Simpan konfigurasi tabel Mitra yang di-fetch saat login.
 * visible_columns dan editable_columns dari Engineer.
 */
import { create } from "zustand";
import { roleConfigApi } from "../services/roleConfigApi";

interface MitraConfigState {
  visibleColumns:  string[];
  editableColumns: string[];
  loaded:          boolean;
  loading:         boolean;
  fetchConfig:     () => Promise<void>;
  reset:           () => void;
}

export const useMitraConfigStore = create<MitraConfigState>((set) => ({
  visibleColumns:  [],
  editableColumns: [],
  loaded:          false,
  loading:         false,

  fetchConfig: async () => {
    set({ loading: true });
    try {
      const config = await roleConfigApi.getConfig("mitra");
      set({
        visibleColumns:  config.visible_columns,
        editableColumns: config.editable_columns,
        loaded:          true,
      });
    } catch {
      set({ visibleColumns: [], editableColumns: [], loaded: true });
    } finally {
      set({ loading: false });
    }
  },

  reset: () => set({ visibleColumns: [], editableColumns: [], loaded: false }),
}));
