/**
 * services/settingsApi.ts
 * API client untuk endpoint /api/settings
 * Pakai axios instance (api.ts) agar token auto-refresh berjalan.
 */
import api, { getDeduped } from "./api";
import { getGlobal, setGlobal, delGlobal } from "./cacheStore";

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
  const { data } = await getDeduped<DashboardSetting[]>("/settings/");
  return data;
}

// ── PUT /api/settings/{key} — update satu setting (engineer) ────────────────────
export async function updateSetting(
  key: string,
  value: string
): Promise<DashboardSetting> {
  const { data } = await api.put<DashboardSetting>(`/settings/${key}`, { value });

  // The public settings cache is browser-global and has no TTL/versioning.
  // Clear it after a successful DB update so dashboards cannot keep using
  // the old threshold values.
  await clearPublicSettingsCache();

  return data;
}

// ── POST /api/settings/cache/invalidate — force reload cache ──────────────────
export async function invalidateSettingsCache(): Promise<void> {
  await api.post("/settings/cache/invalidate");
}

// ── GET /api/settings/public — tanpa auth ────────────────────────────────────
export async function fetchPublicSettings(forceNetwork = false): Promise<Record<string, unknown>> {
  if (!forceNetwork) {
    const cached = await getGlobal<Record<string, unknown>>("public-settings");
    if (cached) return cached;
  }
  const { data } = await getDeduped<Record<string, unknown>>("/settings/public");
  await setGlobal("public-settings", data);
  return data;
}

/** Refresh public configuration once during login/session initialization. */
export async function refreshPublicSettingsCache(): Promise<void> {
  await fetchPublicSettings(true);
}

export async function clearPublicSettingsCache(): Promise<void> {
  await delGlobal("public-settings");
}

// ── Legacy: getAgingThresholds — baca dari public settings ───────────────────
export interface AgingThresholds {
  tier1: number;
  tier2: number;
  tier3: number;
}

export async function getAgingThresholds(): Promise<AgingThresholds> {
  // Aging thresholds are authoritative DB settings. Do not read the
  // browser-cached public settings here, otherwise PTL can keep an older
  // value after Engineer changes the threshold.
  const settings = await fetchPublicSettings(true);
  const tier1 = Number(settings["aging.tier1"]);
  const tier2 = Number(settings["aging.tier2"]);
  const tier3 = Number(settings["aging.tier3"]);

  if (
    !Number.isFinite(tier1) ||
    !Number.isFinite(tier2) ||
    !Number.isFinite(tier3) ||
    tier1 <= 0 ||
    tier2 <= tier1 ||
    tier3 <= tier2
  ) {
    throw new Error("Invalid aging threshold settings");
  }

  return { tier1, tier2, tier3 };
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
  appName:     string;  // key: app_name     → "OverSee"
  appSubtitle: string;  // key: app_subtitle → "PA PLN ICONPLUS"
  appVersion:  string;  // key: app_version  → "3.2"
}

const APP_INFO_DEFAULTS: AppInfo = {
  appName:     import.meta.env.VITE_APP_NAME     ?? "OverSee",
  appSubtitle: import.meta.env.VITE_APP_SUBTITLE ?? "PA PLN ICONPLUS",
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


export async function updateAgingThresholds(
  thresholds: AgingThresholds
): Promise<AgingThresholds> {
  if (
    !Number.isFinite(thresholds.tier1) ||
    !Number.isFinite(thresholds.tier2) ||
    !Number.isFinite(thresholds.tier3) ||
    thresholds.tier1 <= 0 ||
    thresholds.tier2 <= thresholds.tier1 ||
    thresholds.tier3 <= thresholds.tier2
  ) {
    throw new Error("Invalid aging thresholds");
  }

  await Promise.all([
    updateSetting("aging.tier1", String(thresholds.tier1)),
    updateSetting("aging.tier2", String(thresholds.tier2)),
    updateSetting("aging.tier3", String(thresholds.tier3)),
  ]);

  return {
    tier1: thresholds.tier1,
    tier2: thresholds.tier2,
    tier3: thresholds.tier3,
  };
}
