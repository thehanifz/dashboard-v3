/**
 * presetApi.ts
 * Fire-and-forget sync ke DB untuk preset dan editable columns.
 * Dipanggil dari dalam store setelah update state lokal.
 * Kalau gagal → tidak apa-apa, state lokal tetap jalan.
 */
import api from "./api";

export type PresetScope = "engineer" | "ptl";

export interface DBPreset {
  id:      number;
  scope:   PresetScope;
  name:    string;
  columns: string[];
  widths?: Record<string, number>;
}

const presetApi = {
  // ── Preset CRUD ────────────────────────────────────────────────────────────
  list: (scope: PresetScope): Promise<DBPreset[]> =>
    api.get<DBPreset[]>("/presets", { params: { scope } }).then(r => r.data),

  create: (scope: PresetScope, name: string, columns: string[], widths?: Record<string, number>): Promise<DBPreset> =>
    api.post<DBPreset>("/presets", { scope, name, columns, widths: widths ?? {} }).then(r => r.data),

  update: (id: number, payload: Partial<Pick<DBPreset, "name" | "columns" | "widths">>): Promise<DBPreset> =>
    api.put<DBPreset>(`/presets/${id}`, payload).then(r => r.data),

  remove: (id: number): Promise<void> =>
    api.delete(`/presets/${id}`).then(() => undefined),

  // ── Editable columns ───────────────────────────────────────────────────────
  getEditableColumns: (): Promise<string[]> =>
    api.get<string[]>("/presets/editable-columns").then(r => r.data),

  saveEditableColumns: (columns: string[]): Promise<void> =>
    api.put("/presets/editable-columns", { columns }).then(() => undefined),
};

export default presetApi;