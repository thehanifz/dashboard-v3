import api from "./api";

export interface SyncResult {
  ok: boolean;
  ptl_username?: string;
  synced_fields?: number;
  new_mismatches?: number;
  error?: string;
  diffs_applied?: { id_pa: string; diffs: string[] }[];
  missing_in_ptl?: string[];
  missing_in_engineer?: string[];
}

export interface SyncLog {
  id: number;
  id_pa: string;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
  sync_type: string;
  synced_at: string;
  synced_by: string | null;
}

export interface SyncMismatch {
  id: number;
  id_pa: string;
  mismatch_type: "missing_in_engineer" | "missing_in_ptl";
  detected_at: string;
  ptl_user_id: string;
}

export const syncApi = {
  async runOne(ptlUsername: string): Promise<SyncResult> {
    const res = await api.post<SyncResult>(`/sync/run/${ptlUsername}`);
    return res.data;
  },

  async runAll(): Promise<{ ok: boolean; ptl_count: number; total_synced: number; total_mismatches: number; results: SyncResult[] }> {
    const res = await api.post("/sync/run-all");
    return res.data;
  },

  async getLogs(limit = 100): Promise<SyncLog[]> {
    const res = await api.get<SyncLog[]>(`/sync/logs?limit=${limit}`);
    return res.data;
  },

  async getMismatches(): Promise<SyncMismatch[]> {
    const res = await api.get<SyncMismatch[]>("/sync/mismatches");
    return res.data;
  },

  async dismissMismatch(id: number): Promise<void> {
    await api.delete(`/sync/mismatches/${id}`);
  },
};
