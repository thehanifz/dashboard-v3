/**
 * services/settingsApi.ts
 * API client untuk endpoint /api/settings
 * Pakai axios instance (api.ts) agar token auto-refresh berjalan.
 */
import api from "./api";

export type DashboardSetting = {
  id:          number;
  key:         string;
  value:       string;
  value_type:  string;  // "string" | "number" | "boolean" | "json"
  category:    string;
  label:       string;
  description: string | null;
  is_editable: boolean;
  updated_by:  string | null;
  updated_at:  string | null;
};

// ── GET /api/settings — semua settings (butuh login) ─────────────────────
export async function fetchAllSettings(): Promise<DashboardSetting[]> {
  const { data } = await api.get<DashboardSetting[]>("/settings/");
  return data;
}

// ── PUT /api/settings/{key} — update satu setting (engineer) ───────────────
export async function updateSetting(
  key: string,
  value: string
): Promise<DashboardSetting> {
  const { data } = await api.put<DashboardSetting>(`/settings/${key}`, { value });
  return data;
}

// ── POST /api/settings/cache/invalidate — force reload cache ──────────────
export async function invalidateSettingsCache(): Promise<void> {
  await api.post("/settings/cache/invalidate");
}

// ── GET /api/settings/public — tanpa auth ───────────────────────────────
export async function fetchPublicSettings(): Promise<Record<string, unknown>> {
  const { data } = await api.get<Record<string, unknown>>("/settings/public");
  return data;
}

// ── Legacy: getAgingThresholds — baca dari public settings ─────────────────
export interface AgingThresholds {
  tier1: number;
  tier2: number;
  tier3: number;
}

export async function getAgingThresholds(): Promise<AgingThresholds> {
  const settings = await fetchPublicSettings();
  return {
    tier1: Number(settings["aging.tier1"] ?? 11),
    tier2: Number(settings["aging.tier2"] ?? 30),
    tier3: Number(settings["aging.tier3"] ?? 60),
  };
}
