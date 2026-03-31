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

// ── GET /api/settings — semua settings (butuh login) ──────────────────────────────────
export async function fetchAllSettings(): Promise<DashboardSetting[]> {
  const { data } = await api.get<DashboardSetting[]>("/settings/");
  return data;
}

// ── PUT /api/settings/{key} — update satu setting (engineer) ─────────────────────────
export async function updateSetting(
  key: string,
  value: string
): Promise<DashboardSetting> {
  const { data } = await api.put<DashboardSetting>(`/settings/${key}`, { value });
  return data;
}

// ── POST /api/settings/cache/invalidate — force reload cache ────────────────────────
export async function invalidateSettingsCache(): Promise<void> {
  await api.post("/settings/cache/invalidate");
}

// ── GET /api/settings/public — tanpa auth ─────────────────────────────────────────
export async function fetchPublicSettings(): Promise<Record<string, unknown>> {
  const { data } = await api.get<Record<string, unknown>>("/settings/public");
  return data;
}

// ── Legacy: getAgingThresholds — baca dari public settings ───────────────────────────
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

// ── getDashboardColumns — kolom & nilai status untuk SummaryDashboard ────────────────
/**
 * Semua nama kolom GSheet dan nilai status yang dipakai SummaryDashboard.
 * Dibaca dari DB (settings kategori `columns`) via endpoint public.
 * Setiap field punya fallback string agar tidak crash jika key belum ada di DB.
 *
 * Cara menambah key baru:
 *   1. Tambah row di tabel dashboard_settings (atau seed SQL)
 *   2. Tambah field baru di DashboardColumns di sini
 *   3. Pakai di komponen via useDashboardColumns()
 */
export interface DashboardColumns {
  // Kolom GSheet
  colTglTerbit:       string;  // key: col_tgl_terbit   → "TGL TERBIT PA"
  colStatusPa:        string;  // key: col_status_pa    → "Status PA"
  colStatusPekerjaan: string;  // key: col_status_pekerjaan → "Status Pekerjaan"
  colLayanan:         string;  // key: col_layanan      → "LAYANAN"
  colJenisMutasi:     string;  // key: col_jenis_mutasi → "JENIS MUTASI"
  // Nilai status (isi sel, bukan nama kolom)
  valStatusDone:      string;  // key: val_status_done     → "Done BAI"
  valStatusProgress:  string;  // key: val_status_progress → "On Progress"
  valStatusCancel:    string;  // key: val_status_cancel   → "PA Cancel"
}

/** Fallback default — dipakai jika API gagal atau key belum ada di DB */
const COLUMN_DEFAULTS: DashboardColumns = {
  colTglTerbit:       "TGL TERBIT PA",
  colStatusPa:        "Status PA",
  colStatusPekerjaan: "Status Pekerjaan",
  colLayanan:         "LAYANAN",
  colJenisMutasi:     "JENIS MUTASI",
  valStatusDone:      "Done BAI",
  valStatusProgress:  "On Progress",
  valStatusCancel:    "PA Cancel",
};

/**
 * Ambil konfigurasi kolom dashboard dari DB (via public endpoint, tanpa auth).
 * Fallback ke COLUMN_DEFAULTS jika key tidak ada atau API gagal.
 */
export async function getDashboardColumns(): Promise<DashboardColumns> {
  try {
    const settings = await fetchPublicSettings();
    return {
      colTglTerbit:       String(settings["col_tgl_terbit"]       ?? COLUMN_DEFAULTS.colTglTerbit),
      colStatusPa:        String(settings["col_status_pa"]        ?? COLUMN_DEFAULTS.colStatusPa),
      colStatusPekerjaan: String(settings["col_status_pekerjaan"] ?? COLUMN_DEFAULTS.colStatusPekerjaan),
      colLayanan:         String(settings["col_layanan"]          ?? COLUMN_DEFAULTS.colLayanan),
      colJenisMutasi:     String(settings["col_jenis_mutasi"]     ?? COLUMN_DEFAULTS.colJenisMutasi),
      valStatusDone:      String(settings["val_status_done"]      ?? COLUMN_DEFAULTS.valStatusDone),
      valStatusProgress:  String(settings["val_status_progress"]  ?? COLUMN_DEFAULTS.valStatusProgress),
      valStatusCancel:    String(settings["val_status_cancel"]    ?? COLUMN_DEFAULTS.valStatusCancel),
    };
  } catch {
    // Jika API gagal, pakai fallback — dashboard tetap bisa tampil
    return { ...COLUMN_DEFAULTS };
  }
}
