import { create } from "zustand";
import api from "../services/api";

// ─── Types ─────────────────────────────────────────────────────────────────────────
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
  statusMasterError: string | null; // error message jika fetch gagal
  isLoading: boolean;
  lastUpdated: Date | null;
  autoRefreshEnabled: boolean;
  autoRefreshInterval: number; // menit
  hasLoadedData: boolean; // flag: sudah pernah load data records saat sesi ini
  
  // PTL-specific state
  ptlSheetData: PTLSheetData | null;
  ptlLoading: boolean;

  setRecords: (records: RecordRow[]) => void;
  fetchRecords: () => Promise<void>;
  fetchStatusMaster: () => Promise<void>;
  refreshAll: () => Promise<void>;
  refreshStatusOnly: () => Promise<void>; // fetch status master saja (untuk first load)
  setAutoRefresh: (enabled: boolean, interval?: number) => void;
  updateStatus: (rowId: number, status?: string, detail?: string) => Promise<void>;
  updateCell: (rowId: number, column: string, value: string) => Promise<void>;
  resetLoadedFlag: () => void; // reset flag untuk refresh di login berikutnya
  setHasLoadedData: () => void; // set flag hasLoadedData = true
  
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

// ─── Debounce Timer (module-level, per-row) ─────────────────────────────────────
const statusTimer: Record<number, ReturnType<typeof setTimeout>> = {};

// ─── Store ────────────────────────────────────────────────────────────────────────
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
  ptlSheetData: null,
  ptlLoading: false,

  setRecords: (records) => set({ records }),

  fetchRecords: async () => {
    console.log("[taskStore] Fetching /records...");
    const res = await api.get("/records");
    console.log("[taskStore] Records response:", res.data);
    set({
      columns: res.data.columns ?? [],
      records: res.data.records ?? [],
    });
  },

  fetchStatusMaster: async () => {
    console.log("[taskStore] Fetching /status...");
    try {
      const res = await api.get("/status");
      console.log("[taskStore] Status master response:", res.data);
      set({ statusMaster: res.data, statusMasterError: null });
    } catch (error: any) {
      // Tidak pakai hardcode fallback — biarkan null agar komponen
      // downstream bisa menampilkan error state yang jelas.
      const msg = error?.message ?? "Gagal memuat status master";
      console.error("[taskStore] fetchStatusMaster error:", msg);
      set({ statusMaster: null, statusMasterError: msg });
    }
  },

  // ─── Refresh All (manual & auto) ───────────────────────────────────────────────
  refreshAll: async () => {
    console.log("[taskStore] refreshAll called");
    set({ isLoading: true });
    try {
      await Promise.all([get().fetchStatusMaster(), get().fetchRecords()]);
      console.log("[taskStore] refreshAll completed");
      set({ lastUpdated: new Date(), hasLoadedData: true });
    } catch (err) {
      console.error("[taskStore] refreshAll error:", err);
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  refreshStatusOnly: async () => {
    console.log("[taskStore] refreshStatusOnly called");
    try {
      await get().fetchStatusMaster();
      console.log("[taskStore] refreshStatusOnly completed");
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

  // ─── Update Status (optimistic + debounce) ────────────────────────────────────────
  updateStatus: async (rowId, status, detail) => {
    const { statusMaster, records } = get();
    // Pakai nilai dari statusMaster (API) tanpa hardcode fallback.
    // Jika statusMaster null (error), aksi ini tidak akan mengubah kolom yang salah.
    const statusColumn = statusMaster?.status_column;
    const detailColumn = statusMaster?.detail_column;

    if (!statusColumn) {
      console.warn("[taskStore] updateStatus: statusMaster belum tersedia, skip optimistic update");
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

  // ─── Update Cell (optimistic + debounce) ──────────────────────────────────────────
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
  setPtlSheetData: (data) => set({ ptlSheetData: data }),
  setPtlLoading: (loading) => set({ ptlLoading: loading }),
}));
