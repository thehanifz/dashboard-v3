/**
 * constants/columns.ts
 * Single source of truth untuk nama kolom yang berulang dipakai
 * di renderCell, CellContent, StatusCell, dan filter logic.
 *
 * Nilai diambil dari environment variable (Vite).
 * Fallback hardcode hanya sebagai safety net — pastikan .env.local sudah diisi.
 */

export const STATUS_COL_PRIMARY: string =
  import.meta.env.VITE_STATUS_COL_PRIMARY ?? "Status Pekerjaan";

export const STATUS_COL_DETAIL: string =
  import.meta.env.VITE_STATUS_COL_DETAIL ?? "Detail Progres";
