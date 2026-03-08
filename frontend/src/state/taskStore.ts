import { create } from "zustand";
import api from "../services/api";

// ─── Types ───────────────────────────────────────────────────────────────────
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
  isLoading: boolean;
  lastUpdated: Date | null;
  autoRefreshEnabled: boolean;
  autoRefreshInterval: number; // menit

  setRecords: (records: RecordRow[]) => void;
  fetchRecords: () => Promise<void>;
  fetchStatusMaster: () => Promise<void>;
  refreshAll: () => Promise<void>;
  setAutoRefresh: (enabled: boolean, interval?: number) => void;
  updateStatus: (rowId: number, status?: string, detail?: string) => Promise<void>;
  updateCell: (rowId: number, column: string, value: string) => Promise<void>;
}

// ─── Debounce Timer (module-level, per-row) ──────────────────────────────────
const statusTimer: Record<number, ReturnType<typeof setTimeout>> = {};

// ─── Store ───────────────────────────────────────────────────────────────────
export const useTaskStore = create<TaskState>((set, get) => ({
  columns: [],
  records: [],
  statusMaster: null,
  isLoading: false,
  lastUpdated: null,
  autoRefreshEnabled: false,
  autoRefreshInterval: 5,

  setRecords: (records) => set({ records }),

  fetchRecords: async () => {
    const res = await api.get("/records");
    set({
      columns: res.data.columns ?? [],
      records: res.data.records ?? [],
    });
  },

  fetchStatusMaster: async () => {
    try {
      const res = await api.get("/status");
      set({ statusMaster: res.data });
    } catch (error) {
      console.error("Failed to fetch status master:", error);
      set({
        statusMaster: {
          primary: [],
          mapping: {},
          status_column: "StatusPekerjaan",
          detail_column: "Detail Progres",
        },
      });
    }
  },

  // ─── Refresh All (manual & auto) ─────────────────────────────────────────
  refreshAll: async () => {
    set({ isLoading: true });
    try {
      await Promise.all([get().fetchStatusMaster(), get().fetchRecords()]);
      set({ lastUpdated: new Date() });
    } finally {
      set({ isLoading: false });
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
    const statusColumn = statusMaster?.status_column ?? "StatusPekerjaan";
    const detailColumn = statusMaster?.detail_column ?? "Detail Progres";

    set({
      records: records.map((r) =>
        r.row_id === rowId
          ? {
              ...r,
              data: {
                ...r.data,
                ...(status ? { [statusColumn]: status } : {}),
                ...(detail ? { [detailColumn]: detail } : {}),
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
}));
