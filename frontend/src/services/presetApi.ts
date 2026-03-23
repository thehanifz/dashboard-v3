/**
 * presetApi.ts
 * Fire-and-forget sync ke DB untuk preset dan editable columns.
 *
 * pinnedColumns disimpan di dalam widths sebagai key "__pinned" (array JSON).
 * Backend menerima widths: dict[str, Any] sehingga bisa menyimpan list.
 */
import api from "./api";

export type PresetScope = "engineer" | "ptl" | "kanban_engineer" | "kanban_ptl";

export type Preset = DBPreset;

export interface DBPreset {
  id:      number;
  scope:   PresetScope;
  name:    string;
  columns: string[];
  widths?: Record<string, any>;   // any agar bisa menyimpan __pinned: string[]
}

export interface PresetCreatePayload {
  scope:   PresetScope;
  name:    string;
  columns: string[];
  widths?: Record<string, any>;
}

export type PresetUpdatePayload = Partial<Pick<DBPreset, "name" | "columns" | "widths">>;

// ── Helpers encode/decode pinnedColumns ──────────────────────────────────────
/** Encode pinnedColumns ke dalam widths object */
export function encodeWidths(
  widths: Record<string, number>,
  pinnedColumns: string[],
): Record<string, any> {
  const result: Record<string, any> = { ...widths };
  if (pinnedColumns.length > 0) result.__pinned = pinnedColumns;
  else delete result.__pinned;
  return result;
}

/** Decode pinnedColumns dari widths object */
export function decodePinned(widths?: Record<string, any>): string[] {
  if (!widths || !Array.isArray(widths.__pinned)) return [];
  return widths.__pinned as string[];
}

/** Decode widths numerik saja (tanpa __pinned) */
export function decodeWidths(widths?: Record<string, any>): Record<string, number> {
  if (!widths) return {};
  const result: Record<string, number> = {};
  for (const [k, v] of Object.entries(widths)) {
    if (k !== "__pinned" && typeof v === "number") result[k] = v;
  }
  return result;
}

const presetApi = {
  list: (scope: PresetScope): Promise<DBPreset[]> =>
    api.get<DBPreset[]>("/presets", { params: { scope } }).then(r => r.data),

  create: (
    scopeOrPayload: PresetScope | PresetCreatePayload,
    name?: string,
    columns?: string[],
    widths?: Record<string, any>,
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

  getEditableColumns: (scope: PresetScope = "engineer"): Promise<string[]> =>
    api.get<string[]>("/presets/editable-columns", { params: { scope } }).then(r => r.data),

  saveEditableColumns: (columns: string[], scope: PresetScope = "engineer"): Promise<void> =>
    api.put("/presets/editable-columns", { columns }, { params: { scope } }).then(() => undefined),
};

export default presetApi;