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

// ── GET /api/settings — semua settings (butuh login) ─────────────────────────────
export async function fetchAllSettings(): Promise<DashboardSetting[]> {
  const { data } = await api.get<DashboardSetting[]>("/settings/");
  return data;
}

// ── PUT /api/settings/{key} — update satu setting (engineer) ────────────────────
export async function updateSetting(
  key: string,
  value: string
): Promise<DashboardSetting> {
  const { data } = await api.put<DashboardSetting>(`/settings/${key}`, { value });
  return data;
}

// ── POST /api/settings/cache/invalidate — force reload cache ──────────────────
export async function invalidateSettingsCache(): Promise<void> {
  await api.post("/settings/cache/invalidate");
}

// ── GET /api/settings/public — tanpa auth ────────────────────────────────────
export async function fetchPublicSettings(): Promise<Record<string, unknown>> {
  const { data } = await api.get<Record<string, unknown>>("/settings/public");
  return data;
}

// ── Legacy: getAgingThresholds — baca dari public settings ───────────────────
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

// ── getDashboardColumns — nama kolom GSheet untuk SummaryDashboard ─────────────
/**
 * Hanya menyimpan NAMA KOLOM GSheet — bukan nilai isi dropdown.
 * Nilai status (Done BAI, On Progress, dll) diambil dinamis dari data GSheet
 * oleh SummaryDashboard sendiri, tidak disimpan di DB.
 */
export interface DashboardColumns {
  colTglTerbit:       string;  // key: col_tgl_terbit        → "TGL TERBIT PA"
  colStatusPa:        string;  // key: col_status_pa         → "Status PA"
  colStatusPekerjaan: string;  // key: col_status_pekerjaan  → "Status Pekerjaan"
  colLayanan:         string;  // key: col_layanan           → "LAYANAN"
  colJenisMutasi:     string;  // key: col_jenis_mutasi      → "JENIS MUTASI"
}

/** Fallback default — dipakai jika API gagal atau key belum ada di DB */
const COLUMN_DEFAULTS: DashboardColumns = {
  colTglTerbit:       "TGL TERBIT PA",
  colStatusPa:        "Status PA",
  colStatusPekerjaan: "Status Pekerjaan",
  colLayanan:         "LAYANAN",
  colJenisMutasi:     "JENIS MUTASI",
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
    };
  } catch {
    return { ...COLUMN_DEFAULTS };
  }
}

// ── getDynamicTableConfig — kolom & config untuk DynamicTable ──────────────────
/**
 * Config untuk DynamicTable: kolom aksi (ID PA, NAMA PERUSAHAAN),
 * judul tabel, dan daftar kolom editable PTL.
 * Dibaca dari DB via public endpoint, fallback ke nilai default.
 */
export interface DynamicTableConfig {
  colIdPa:             string;   // key: col_id_pa             → "ID PA"
  colNamaPerusahaan:   string;   // key: col_nama_perusahaan   → "NAMA PERUSAHAAN"
  tableTitle:          string;   // key: table_title           → "Detail Pekerjaan"
  ptlEditableColumns:  string[]; // key: ptl_editable_columns  → ["STATUS","DETAIL","KETERANGAN"]
}

const DYNAMIC_TABLE_DEFAULTS: DynamicTableConfig = {
  colIdPa:            "ID PA",
  colNamaPerusahaan:  "NAMA PERUSAHAAN",
  tableTitle:         "Detail Pekerjaan",
  ptlEditableColumns: ["STATUS", "DETAIL", "KETERANGAN"],
};

export async function getDynamicTableConfig(): Promise<DynamicTableConfig> {
  try {
    const settings = await fetchPublicSettings();
    let ptlEditable = DYNAMIC_TABLE_DEFAULTS.ptlEditableColumns;
    const rawPtl = settings["ptl_editable_columns"];
    if (typeof rawPtl === "string") {
      try { ptlEditable = JSON.parse(rawPtl); } catch { /* pakai default */ }
    } else if (Array.isArray(rawPtl)) {
      ptlEditable = rawPtl as string[];
    }
    return {
      colIdPa:            String(settings["col_id_pa"]           ?? DYNAMIC_TABLE_DEFAULTS.colIdPa),
      colNamaPerusahaan:  String(settings["col_nama_perusahaan"] ?? DYNAMIC_TABLE_DEFAULTS.colNamaPerusahaan),
      tableTitle:         String(settings["table_title"]         ?? DYNAMIC_TABLE_DEFAULTS.tableTitle),
      ptlEditableColumns: ptlEditable,
    };
  } catch {
    return { ...DYNAMIC_TABLE_DEFAULTS };
  }
}

// ── getAppInfo — nama, subtitle, versi aplikasi untuk Sidebar ──────────────────
export interface AppInfo {
  appName:     string;  // key: app_name     → "Dashboard v3"
  appSubtitle: string;  // key: app_subtitle → "PA PLN Icon+"
  appVersion:  string;  // key: app_version  → "3.2"
}

const APP_INFO_DEFAULTS: AppInfo = {
  appName:     import.meta.env.VITE_APP_NAME     ?? "Dashboard v3",
  appSubtitle: import.meta.env.VITE_APP_SUBTITLE ?? "PA PLN Icon+",
  appVersion:  import.meta.env.VITE_APP_VERSION  ?? "3.2",
};

export async function getAppInfo(): Promise<AppInfo> {
  try {
    const settings = await fetchPublicSettings();
    return {
      appName:     String(settings["app_name"]     ?? APP_INFO_DEFAULTS.appName),
      appSubtitle: String(settings["app_subtitle"] ?? APP_INFO_DEFAULTS.appSubtitle),
      appVersion:  String(settings["app_version"]  ?? APP_INFO_DEFAULTS.appVersion),
    };
  } catch {
    return { ...APP_INFO_DEFAULTS };
  }
}
