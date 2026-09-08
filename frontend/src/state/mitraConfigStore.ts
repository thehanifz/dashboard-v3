/**
 * mitraConfigStore.ts
 * Cache-first untuk konfigurasi tabel Mitra.
 * visible_columns dan editable_columns berasal dari role-config backend.
 */
import { create } from "zustand";
import { roleConfigApi, type RoleTableConfig } from "../services/roleConfigApi";
import { getCurrentCacheScope } from "../services/cacheScope";
import { delScoped, getScoped, setScoped } from "../services/cacheStore";

const CACHE_NAME = "mitra-table-config";

function isValidConfig(value: unknown): value is RoleTableConfig {
  const config = value as RoleTableConfig | null;
  return !!config
    && config.role === "mitra"
    && Array.isArray(config.visible_columns)
    && Array.isArray(config.editable_columns);
}

interface MitraConfigState {
  visibleColumns:  string[];
  editableColumns: string[];
  loaded:          boolean;
  loading:         boolean;
  fetchConfig:     () => Promise<void>;
  reset:           () => void;
}

export const useMitraConfigStore = create<MitraConfigState>((set, get) => ({
  visibleColumns:  [],
  editableColumns: [],
  loaded:          false,
  loading:         false,

  fetchConfig: async () => {
    const scope = getCurrentCacheScope();
    if (!scope) return;

    // Avoid repeated reads/network when the config is already loaded in this store.
    if (get().loaded) return;

    let cached: RoleTableConfig | undefined;
    try {
      cached = await getScoped<RoleTableConfig>(CACHE_NAME, scope);
      if (cached !== undefined && !isValidConfig(cached)) {
        throw new Error("Corrupt Mitra config cache");
      }
    } catch {
      await delScoped(CACHE_NAME, scope).catch(() => undefined);
      cached = undefined;
    }

    const apply = (config: RoleTableConfig) => {
      set({
        visibleColumns: config.visible_columns,
        editableColumns: config.editable_columns,
        loaded: true,
      });
    };

    if (cached) {
      apply(cached);
      set({ loading: false });

      // Cache-first: reconcile in background without blocking the dashboard.
      void roleConfigApi.getConfig("mitra").then(async fresh => {
        if (!isValidConfig(fresh)) return;
        const changed = JSON.stringify(cached) !== JSON.stringify(fresh);
        if (changed) {
          await setScoped(CACHE_NAME, scope, fresh);
          apply(fresh);
        }
      }).catch(() => undefined);
      return;
    }

    set({ loading: true });
    try {
      const config = await roleConfigApi.getConfig("mitra");
      await setScoped(CACHE_NAME, scope, config);
      apply(config);
    } catch {
      set({ visibleColumns: [], editableColumns: [], loaded: true });
    } finally {
      set({ loading: false });
    }
  },

  reset: () => set({ visibleColumns: [], editableColumns: [], loaded: false, loading: false }),
}));
