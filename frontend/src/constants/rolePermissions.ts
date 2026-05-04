/**
 * constants/rolePermissions.ts
 * Single source of truth untuk permission kolom per role.
 *
 * Mengapa file ini penting:
 *   - Sebelumnya logika "kolom apa yang boleh diedit" tersebar di:
 *     useCellEditor.ts, CellContent.tsx, StatusCell.tsx, dan komponen lain.
 *   - Sekarang satu tempat → maintenance O(1): ubah satu file, berlaku ke mana-mana.
 *
 * CATATAN PENTING:
 *   - Kolom di sini adalah nama DISPLAY (sama dengan header tabel / nama GSheet)
 *   - Untuk Engineer, editable columns diambil dari DB via AppearanceStore
 *     (bukan dari sini) — karena Engineer bisa custom kolom editable-nya.
 *   - Untuk PTL, ini adalah whitelist TAMBAHAN di atas yang dari DB.
 *   - Untuk Mitra, validasi utama ada di backend (mitra.py).
 *     Frontend cukup hide UI-nya, bukan enforce security.
 */
import type { UserRole } from "./roles";

/**
 * Kolom-kolom yang TIDAK BOLEH diedit oleh role apapun dari frontend.
 * Kolom ini bersifat computed, auto-filled, atau readonly by design.
 */
const READONLY_COLUMNS = new Set<string>([
  "ID PA",
  "ID PERMOHONAN",
  "SERVICE ID",
  "TGL TERBIT PA",
  "Aging PA",
  "Aging Non SC",
  "Aging SC",
  "Status PA",      // auto-fill dari sheet Opsi
  "Kategori PA",    // auto-fill dari sheet Opsi
]);

/**
 * Whitelist kolom editable per role (display name).
 * Engineer tidak di-define di sini — diambil dari DB.
 */
const PTL_EDITABLE_COLUMNS = new Set<string>([
  "Status Pekerjaan",
  "Detail Progres",
  "KETERANGAN UPDATE DETAIL",
  "PTL Update",
  "Nama PTL",
]);

const MITRA_EDITABLE_COLUMNS = new Set<string>([
  // Mitra tidak boleh edit dari frontend.
  // Kolom yang boleh diedit divalidasi di backend (mitra.py + DB config).
  // Set ini kosong intentional — jangan tambahkan kolom di sini.
]);

/** Map role → Set kolom editable (untuk kebutuhan generik) */
const ROLE_EDITABLE_MAP: Record<UserRole, Set<string>> = {
  engineer:  new Set(), // dynamic dari DB — lihat AppearanceStore
  ptl:       PTL_EDITABLE_COLUMNS,
  mitra:     MITRA_EDITABLE_COLUMNS,
  superuser: new Set(), // superuser boleh semua — cek via isSuperuser
};

export const ROLE_PERMISSIONS = {
  /** Kolom yang tidak boleh diedit oleh siapapun */
  readonlyColumns: READONLY_COLUMNS,

  /** Permission per role */
  ptl:   { editableColumns: PTL_EDITABLE_COLUMNS },
  mitra: { editableColumns: MITRA_EDITABLE_COLUMNS },

  /** Helper: dapatkan editable set untuk role tertentu */
  getEditableSet: (role: UserRole): Set<string> => ROLE_EDITABLE_MAP[role] ?? new Set(),
} as const;
