/**
 * services/settingsApi.ts
 * API client untuk endpoint /api/settings
 * Dipakai di SettingsPage.tsx (superadmin only)
 *
 * Menggantikan versi lama yang hanya handle AgingThresholds.
 */

const TOKEN_KEY = "dash_v3_at";

function getBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL || "/api";
}

function getToken() {
  return sessionStorage.getItem(TOKEN_KEY) ?? "";
}

export interface DashboardSetting {
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
}

// ── GET /api/settings — semua settings (butuh login) ───────────────────────
export async function fetchAllSettings(): Promise<DashboardSetting[]> {
  const res = await fetch(`${getBaseUrl()}/settings/`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error("Gagal memuat settings");
  return res.json();
}

// ── PUT /api/settings/{key} — update satu setting (superadmin only) ────────
export async function updateSetting(
  key: string,
  value: string
): Promise<DashboardSetting> {
  const res = await fetch(`${getBaseUrl()}/settings/${key}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ value }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Gagal menyimpan setting");
  }
  return res.json();
}

// ── POST /api/settings/cache/invalidate — force reload cache ──────────────
export async function invalidateSettingsCache(): Promise<void> {
  await fetch(`${getBaseUrl()}/settings/cache/invalidate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` },
  });
}
