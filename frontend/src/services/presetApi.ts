/**
 * presetApi.ts
 * Fire-and-forget sync ke DB untuk preset dan editable columns.
 * Dipanggil dari dalam store setelah update state lokal.
 * Kalau gagal → tidak apa-apa, state lokal tetap jalan.
 */
import api from "./api";

export type PresetScope = "engineer" | "ptl";

// Alias — dipakai oleh usePresets.ts
export type Preset = DBPreset;

export interface DBPreset {
  id:      number;
  scope:   PresetScope;
  name:    string;
  columns: string[];
  widths?: Record<string, number>;
}

export interface PresetCreatePayload {
  scope:    PresetScope;
  name:     string;
  columns:  string[];
  widths?:  Record<string, number>;
}

export type PresetUpdatePayload = Partial<Pick<DBPreset, "name" | "columns" | "widths">>;

const presetApi = {
  // ── Preset CRUD ────────────────────────────────────────────────────────────
  list: (scope: PresetScope): Promise<DBPreset[]> =>
    api.get<DBPreset[]>("/presets", { params: { scope } }).then(r => r.data),

  /**
   * create — support 2 calling convention:
   *   1. Object:    presetApi.create({ scope, name, columns, widths })  ← usePresets.ts
   *   2. Positional: presetApi.create("ptl", name, columns, widths)     ← store lama
   */
  create: (
    scopeOrPayload: PresetScope | PresetCreatePayload,
    name?: string,
    columns?: string[],
    widths?: Record<string, number>,
  ): Promise<DBPreset> => {
    const body: PresetCreatePayload =
      typeof scopeOrPayload === "object"
        ? { widths: {}, ...scopeOrPayload }
        : { scope: scopeOrPayload, name: name!, columns: columns!, widths: widths ?? {} };
    return api.post<DBPreset>("/presets", body).then(r => r.data);
  },

  update: (id: number, payload: PresetUpdatePayload): Promise<DBPreset> =>
    api.put<DBPreset>(`/presets/${id}`, payload).then(r => r.data),

  remove: (id: number): Promise<void> =>
    api.delete(`/presets/${id}`).then(() => undefined),

  // ── Editable columns ───────────────────────────────────────────────────────
  getEditableColumns: (scope: PresetScope = "engineer"): Promise<string[]> =>
    api.get<string[]>("/presets/editable-columns", { params: { scope } }).then(r => r.data),

  saveEditableColumns: (columns: string[], scope: PresetScope = "engineer"): Promise<void> =>
    api.put("/presets/editable-columns", { columns }, { params: { scope } }).then(() => undefined),
};

export default presetApi;