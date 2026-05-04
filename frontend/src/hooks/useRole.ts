/**
 * hooks/useRole.ts
 * Abstraksi role & permission di atas authStore.
 *
 * Gunakan hook ini di seluruh komponen — bukan akses authStore.user.role langsung.
 * Keuntungan:
 *   1. Perubahan nama role cukup di constants/roles.ts
 *   2. Logika canEditColumn terpusat di constants/rolePermissions.ts
 *   3. Komponen tidak perlu tahu detail struktur authStore
 *
 * Contoh pemakaian:
 *   const { isEngineer, canEditColumn } = useRole();
 *   if (!canEditColumn(col)) return null;
 */
import { useAuthStore } from "../state/authStore";
import { useAppearanceStore } from "../state/appearanceStore";
import { ROLES, type UserRole } from "../constants/roles";
import { ROLE_PERMISSIONS } from "../constants/rolePermissions";

export interface UseRoleReturn {
  /** Role string mentah dari user yang login, null jika belum login */
  role: UserRole | null;

  // ── Shorthand boolean per role ──────────────────────────────────────
  isEngineer:  boolean;
  isPtl:       boolean;
  isMitra:     boolean;
  isSuperuser: boolean;

  /**
   * Cek apakah user boleh edit kolom tertentu.
   * Engineer: cek editableColumns dari DB (AppearanceStore)
   * PTL:      cek ROLE_PERMISSIONS.ptl.editableColumns (static whitelist)
   * Mitra:    selalu false dari frontend — validasi di backend
   * Superuser: semua kolom boleh
   */
  canEditColumn: (col: string, ptlEditableSet?: Set<string>) => boolean;

  /**
   * Cek apakah role user termasuk dalam daftar role yang diizinkan.
   * Gunakan untuk guard fitur/halaman.
   * Contoh: hasAnyRole("engineer", "superuser")
   */
  hasAnyRole: (...roles: UserRole[]) => boolean;
}

export function useRole(): UseRoleReturn {
  const { user, hasRole } = useAuthStore();
  const editableColumns   = useAppearanceStore(s => s.editableColumns);

  const role = user?.role ?? null;

  const isEngineer  = role === ROLES.ENGINEER;
  const isPtl       = role === ROLES.PTL;
  const isMitra     = role === ROLES.MITRA;
  const isSuperuser = role === ROLES.SUPERUSER;

  function canEditColumn(col: string, ptlEditableSet?: Set<string>): boolean {
    if (!role) return false;

    // Superuser boleh edit semua kolom
    if (isSuperuser) return true;

    // Kolom yang tidak pernah boleh diedit dari frontend (readonly universal)
    if (ROLE_PERMISSIONS.readonlyColumns.has(col)) return false;

    if (isEngineer) {
      // Engineer: kolom editable diatur dari DB via AppearanceStore
      return editableColumns.includes(col);
    }

    if (isPtl) {
      // PTL: cek static whitelist dulu, lalu cek ptlEditableSet dari DB
      const inStaticList = ROLE_PERMISSIONS.ptl.editableColumns.has(col);
      const inDynamicSet = ptlEditableSet ? ptlEditableSet.has(col) : false;
      return inStaticList || inDynamicSet;
    }

    // Mitra: tidak boleh edit dari frontend (validasi ownership ada di backend)
    return false;
  }

  function hasAnyRole(...roles: UserRole[]): boolean {
    return hasRole(...roles);
  }

  return {
    role,
    isEngineer,
    isPtl,
    isMitra,
    isSuperuser,
    canEditColumn,
    hasAnyRole,
  };
}
