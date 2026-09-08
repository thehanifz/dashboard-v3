/**
 * constants/storageKeys.ts
 * Single source of truth untuk semua key sessionStorage & localStorage.
 *
 * Aturan penamaan:
 *   SESSION_*  — sessionStorage (hilang saat tab ditutup)
 *   STORAGE_*  — localStorage   (persisten lintas sesi)
 */

// sessionStorage — auth
export const SESSION_ACCESS_TOKEN = "dash_v3_at";
export const SESSION_USER         = "dash_v3_user";
export const SESSION_LOGOUT_INTENT = "dash_v3_logout_intent";

// localStorage — table settings (page size, halaman aktif per role)
export const STORAGE_TABLE_SETTINGS = "dash_v3_table_settings";
