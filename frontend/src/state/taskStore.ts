import { create } from "zustand";
import api from "../services/api";
import { getCachedRecords, setCachedRecords, getCacheMeta } from "../services/recordCache";
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
  fetchRecords: (forceNetwork?: boolean) => Promise<void>;
  fetchStatusMaster: () => Promise<void>;
  refreshAll: () => Promise<void>;
  refreshStatusOnly: () => Promise<void>;
  setAutoRefresh: (enabled: boolean, interval?: number) => void;
  updateStatus: (rowId: number, status?: string, detail?: string) => Promise<void>;
  updateCell: (rowId: number, column: string, value: string) => Promise<void>;
  resetLoadedFlag: () => void;
  setHasLoadedData: () => void;
  loadCacheMeta: () => Promise<void>;

  // PTL-specific methods
  setPtlSheetData: (data: PTLSheetData | null) => void;
  setPtlLoading: (loading: boolean) => void;
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

  setRecords: (records) => set({ records }),

  /**
   * fetchRecords — cek IndexedDB dulu sebelum hit network.
   * @param forceNetwork — kalau true, skip cache dan langsung fetch dari server
   */
  fetchRecords: async (forceNetwork = false) => {
    if (!forceNetwork) {
      // Coba ambil dari IndexedDB
      const cached = await getCachedRecords();
      if (cached) {
        console.log("[taskStore] Loaded from IndexedDB cache:", cached.records.length, "rows");
        set({
          columns: cached.columns,
          records: cached.records,
          cacheMeta: cached.meta,
          hasLoadedData: true,
          lastUpdated: new Date(cached.meta.lastSyncedAt),
        });
        return;
      }
      console.log("[taskStore] No cache found, fetching from network...");
    } else {
      console.log("[taskStore] Force network fetch...");
    }

    // Fetch dari server
    const res = await api.get("/records/");
    const records: RecordRow[] = res.data.records ?? [];
    const columns: string[]    = res.data.columns ?? [];

    // Simpan ke IndexedDB
    await setCachedRecords(records, columns);

    // Ambil meta yang baru disimpan
    const meta = await getCacheMeta();

    set({
      columns,
      records,
      cacheMeta: meta,
      lastUpdated: new Date(),
    });
    console.log("[taskStore] Fetched from network and cached:", records.length, "rows");
  },

  fetchStatusMaster: async () => {
    console.log("[taskStore] Fetching /status...");
    try {
      const res = await api.get("/status");
      set({ statusMaster: res.data, statusMasterError: null });
    } catch (error: any) {
      const msg = error?.message ?? "Gagal memuat status master";
      console.error("[taskStore] fetchStatusMaster error:", msg);
      set({ statusMaster: null, statusMasterError: msg });
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
      set({ lastUpdated: new Date(), hasLoadedData: true });
    } catch (err) {
      console.error("[taskStore] refreshAll error:", err);
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  refreshStatusOnly: async () => {
    try {
      await get().fetchStatusMaster();
    } catch (err) {
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
    const { statusMaster, records } = get();
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
      } catch (err) {
        console.error("updateStatus failed", err);
      }
    }, 400);
  },

  // ─── Update Cell (optimistic + debounce) ──────────────────────────────────
  updateCell: async (rowId, column, value) => {
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
      } catch (err) {
        console.error("updateCell failed", err);
      }
    }, 400);
  },

  resetLoadedFlag: () => set({ hasLoadedData: false }),
  setHasLoadedData: () => set({ hasLoadedData: true }),

  /** Load hanya metadata cache (dipanggil saat init, tanpa load data besar) */
  loadCacheMeta: async () => {
    const meta = await getCacheMeta();
    if (meta) set({ cacheMeta: meta });
  },

  setPtlSheetData: (data) => set({ ptlSheetData: data }),
  setPtlLoading: (loading) => set({ ptlLoading: loading }),
}));
