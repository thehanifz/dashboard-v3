import { create } from "zustand";
import api from "../services/api";
import { getCachedRecords, setCachedRecords, getCacheMeta, getCachedPtlSheet, setCachedPtlSheet, updateCachedPtlRecord } from "../services/recordCache";
import { clearUserCache } from "../services/cacheStore";
import { getCurrentCacheScope } from "../services/cacheScope";
import { getDeduped } from "../services/api";
import type { CacheMeta } from "../services/recordCache";

// ─── Types ─────────────────────────────────────────────────────────────────────────────────────
export interface RecordRow {
  row_id: number;
  data: Record<string, string>;
}

export interface StatusMaster {
  primary: string[];
  mapping: Record<string, string[]>;
  status_column: string;
  detail_column: string;
}

interface TaskState {
  columns: string[];
  records: RecordRow[];
  statusMaster: StatusMaster | null;
  statusMasterError: string | null;
  isLoading: boolean;
  isOffline: boolean;
  lastUpdated: Date | null;
  autoRefreshEnabled: boolean;
  autoRefreshInterval: number;
  hasLoadedData: boolean;

  // Cache metadata — ditampilkan di Topbar
  cacheMeta: CacheMeta | null;

  // PTL-specific state
  ptlSheetData: PTLSheetData | null;
  ptlLoading: boolean;

  setRecords: (records: RecordRow[]) => void;
  fetchRecords: (forceNetwork?: boolean, background?: boolean) => Promise<void>;
  fetchStatusMaster: () => Promise<void>;
  refreshAll: () => Promise<void>;
  refreshStatusOnly: (background?: boolean) => Promise<void>;
  setAutoRefresh: (enabled: boolean, interval?: number) => void;
  updateStatus: (rowId: number, status?: string, detail?: string) => Promise<void>;
  updateCell: (rowId: number, column: string, value: string) => Promise<void>;
  resetLoadedFlag: () => void;
  setHasLoadedData: () => void;
  loadCacheMeta: () => Promise<void>;
  setOffline: (offline: boolean) => void;
  clearUserCache: () => Promise<void>;

  // PTL-specific methods
  setPtlSheetData: (data: PTLSheetData | null) => void;
  setPtlLoading: (loading: boolean) => void;
  fetchPtlSheet: (forceNetwork?: boolean, background?: boolean) => Promise<void>;
  updatePtlCache: (rowId: number, updates: Record<string, string>) => Promise<void>;
}

export interface PTLSheetData {
  no_gsheet: boolean;
  columns:   string[];
  records:   SheetRecord[];
}

export interface SheetRecord {
  id:     string;
  row_id: number;
  data:   Record<string, string>;
}

// ─── Debounce Timer (module-level, per-row) ────────────────────────────────────────────────
const statusTimer: Record<number, ReturnType<typeof setTimeout>> = {};

// ─── Store ─────────────────────────────────────────────────────────────────────────────────────
export const useTaskStore = create<TaskState>((set, get) => ({
  columns: [],
  records: [],
  statusMaster: null,
  statusMasterError: null,
  isLoading: false,
  lastUpdated: null,
  autoRefreshEnabled: false,
  autoRefreshInterval: 5,
  hasLoadedData: false,
  cacheMeta: null,
  ptlSheetData: null,
  ptlLoading: false,
  isOffline: typeof navigator !== "undefined" ? !navigator.onLine : false,

  setRecords: (records) => set({ records }),

  /**
   * fetchRecords — cek IndexedDB dulu sebelum hit network.
   * @param forceNetwork — kalau true, skip cache dan langsung fetch dari server
   */
  fetchRecords: async (forceNetwork = false, background = false) => {
    const scope = getCurrentCacheScope();
    if (!scope) throw new Error("Session cache scope tidak tersedia");

    if (!forceNetwork) {
      let cached = null;
      try { cached = await getCachedRecords(scope); }
      catch {
        await clearUserCache(scope);
      }
      if (cached) {
        console.log("[taskStore] Loaded from IndexedDB cache:", cached.records.length, "rows");
        set({
          columns: cached.columns,
          records: cached.records,
          cacheMeta: cached.meta,
          hasLoadedData: true,
          lastUpdated: new Date(cached.meta.lastSyncedAt),
          isOffline: typeof navigator !== "undefined" ? !navigator.onLine : false,
        });
        // Cache-first: render immediately, then reconcile with backend.
        void get().fetchRecords(true, true).catch(() => undefined);
        return;
      }
      console.log("[taskStore] No cache found, fetching from network...");
    } else {
      console.log("[taskStore] Force network fetch...");
    }

    // Fetch dari server
    try {
      const res = await getDeduped<{ records?: RecordRow[]; columns?: string[] }>("/records/");
      const records: RecordRow[] = res.data.records ?? [];
      const columns: string[]    = res.data.columns ?? [];

    const current = get();
      const changed = JSON.stringify({ records: current.records, columns: current.columns }) !==
        JSON.stringify({ records, columns });

      if (!background || changed) {
        await setCachedRecords(records, columns, scope);
        const meta = await getCacheMeta(scope);
        set({
          columns,
          records,
          cacheMeta: meta,
          lastUpdated: new Date(),
          isOffline: false,
          hasLoadedData: true,
        });
      } else {
        set({ isOffline: false });
      }
      console.log(background ? "[taskStore] Background sync completed:" : "[taskStore] Fetched from network:", records.length, "rows");
    } catch (error) {
      set({ isOffline: true });
      throw error;
    }
  },

  fetchStatusMaster: async () => {
    const scope = getCurrentCacheScope();
    if (!scope) return;

    let cached: StatusMaster | undefined;
    try {
      const { getScoped } = await import("../services/cacheStore");
      const value = await getScoped<StatusMaster>("status", scope);
      if (value !== undefined && (!Array.isArray(value.primary) || !value.mapping || !value.status_column)) {
        throw new Error("Corrupt status cache");
      }
      cached = value;
    } catch {
      const { delScoped } = await import("../services/cacheStore");
      await delScoped("status", scope);
    }

    if (cached) {
      set({ statusMaster: cached, statusMasterError: null });
      void get().refreshStatusOnly(true).catch(() => undefined);
      return;
    }

    try {
      const res = await getDeduped<StatusMaster>("/status");
      const { setScoped } = await import("../services/cacheStore");
      await setScoped("status", scope, res.data);
      set({ statusMaster: res.data, statusMasterError: null, isOffline: false });
    } catch (error: any) {
      const msg = error?.message ?? "Gagal memuat status master";
      console.error("[taskStore] fetchStatusMaster error:", msg);
      set({ statusMasterError: msg, isOffline: true });
      throw error;
    }
  },

  // ─── Refresh All ───────────────────────────────────────────────────────────
  // forceNetwork: true saat user klik tombol Refresh manual
  refreshAll: async (forceNetwork = false) => {
    console.log("[taskStore] refreshAll called, forceNetwork:", forceNetwork);
    set({ isLoading: true });
    try {
      await Promise.all([
        get().fetchStatusMaster(),
        get().fetchRecords(forceNetwork as boolean),
      ]);
      if (forceNetwork) set({ lastUpdated: new Date() });
      set({ hasLoadedData: true });
    } catch (err) {
      console.error("[taskStore] refreshAll error:", err);
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  refreshStatusOnly: async (background = false) => {
    const scope = getCurrentCacheScope();
    if (!scope) return;
    try {
      const res = await getDeduped<StatusMaster>("/status");
      const current = get().statusMaster;
      const changed = JSON.stringify(current) !== JSON.stringify(res.data);
      if (!background || changed) {
        const { setScoped } = await import("../services/cacheStore");
        await setScoped("status", scope, res.data);
        set({ statusMaster: res.data, statusMasterError: null, isOffline: false });
      } else {
        set({ isOffline: false });
      }
    } catch (err) {
      set({ isOffline: true });
      console.error("[taskStore] refreshStatusOnly error:", err);
      throw err;
    }
  },

  setAutoRefresh: (enabled, interval) => {
    set({
      autoRefreshEnabled: enabled,
      ...(interval !== undefined ? { autoRefreshInterval: interval } : {}),
    });
  },

  // ─── Update Status (optimistic + debounce) ────────────────────────────────
  updateStatus: async (rowId, status, detail) => {
    if (get().isOffline || (typeof navigator !== "undefined" && !navigator.onLine)) throw new Error("Offline");
    const { statusMaster, records, columns } = get();
    const statusColumn = statusMaster?.status_column;
    const detailColumn = statusMaster?.detail_column;

    if (!statusColumn) {
      console.warn("[taskStore] updateStatus: statusMaster belum tersedia, skip");
      return;
    }

    set({
      records: records.map((r) =>
        r.row_id === rowId
          ? {
              ...r,
              data: {
                ...r.data,
                ...(status !== undefined ? { [statusColumn]: status } : {}),
                ...(detail !== undefined && detailColumn ? { [detailColumn]: detail } : {}),
              },
            }
          : r
      ),
    });

    if (statusTimer[rowId]) clearTimeout(statusTimer[rowId]);
    statusTimer[rowId] = setTimeout(async () => {
      try {
        await api.post(`/records/${rowId}/status`, { status, detail });
        await setCachedRecords(get().records, columns, getCurrentCacheScope()!);
      } catch (err) {
        console.error("updateStatus failed", err);
      }
    }, 400);
  },

  // ─── Update Cell (optimistic + debounce) ──────────────────────────────────
  updateCell: async (rowId, column, value) => {
    if (get().isOffline || (typeof navigator !== "undefined" && !navigator.onLine)) throw new Error("Offline");
    const { records } = get();
    set({
      records: records.map((r) =>
        r.row_id === rowId
          ? { ...r, data: { ...r.data, [column]: value } }
          : r
      ),
    });

    if (statusTimer[rowId]) clearTimeout(statusTimer[rowId]);
    statusTimer[rowId] = setTimeout(async () => {
      try {
        await api.post(`/records/${rowId}/cells`, { updates: { [column]: value } });
        const current = get();
        await setCachedRecords(current.records, current.columns, getCurrentCacheScope()!);
      } catch (err) {
        console.error("updateCell failed", err);
      }
    }, 400);
  },

  resetLoadedFlag: () => set({ hasLoadedData: false }),
  setHasLoadedData: () => set({ hasLoadedData: true }),

  /** Load hanya metadata cache (dipanggil saat init, tanpa load data besar) */
  loadCacheMeta: async () => {
    const scope = getCurrentCacheScope();
    if (!scope) return;
    const meta = await getCacheMeta(scope);
    if (meta) set({ cacheMeta: meta });
  },

  setOffline: (offline) => set({ isOffline: offline }),

  clearUserCache: async () => {
    const scope = getCurrentCacheScope();
    if (!scope) return;
    await clearUserCache(scope);
    set({ records: [], columns: [], cacheMeta: null, ptlSheetData: null, statusMaster: null, hasLoadedData: false });
  },

  setPtlSheetData: (data) => set({ ptlSheetData: data }),
  setPtlLoading: (loading) => set({ ptlLoading: loading }),

  fetchPtlSheet: async (forceNetwork = false, background = false) => {
    const scope = getCurrentCacheScope();
    if (!scope) throw new Error("Session cache scope tidak tersedia");
    if (!forceNetwork) {
      let cached = null;
      try { cached = await getCachedPtlSheet(scope); }
      catch { await clearUserCache(scope); }
      if (cached) {
        set({ ptlSheetData: cached, isOffline: typeof navigator !== "undefined" ? !navigator.onLine : false });
        void get().fetchPtlSheet(true, true).catch(() => undefined);
        return;
      }
    }

    set({ ptlLoading: true });
    try {
      const res = await getDeduped<PTLSheetData>("/records/ptl-sheet");
      const changed = JSON.stringify(get().ptlSheetData) !== JSON.stringify(res.data);
      if (!background || changed) {
        await setCachedPtlSheet(res.data, scope);
        set({ ptlSheetData: res.data, isOffline: false });
      } else {
        set({ isOffline: false });
      }
    } catch (error) {
      set({ isOffline: true });
      throw error;
    } finally {
      set({ ptlLoading: false });
    }
  },

  updatePtlCache: async (rowId, updates) => {
    const scope = getCurrentCacheScope();
    if (!scope) return;
    await updateCachedPtlRecord(rowId, updates, scope);
    const current = get().ptlSheetData;
    if (!current) return;
    set({
      ptlSheetData: {
        ...current,
        records: current.records.map((record) =>
          record.row_id === rowId
            ? { ...record, data: { ...record.data, ...updates } }
            : record
        ),
      },
    });
  },
}));
