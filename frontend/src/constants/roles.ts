/**
 * constants/roles.ts
 * Single source of truth untuk role definition.
 *
 * Import UserRole dari sini — bukan dari authStore —
 * untuk menghindari circular dependency.
 */

export type UserRole = "engineer" | "ptl" | "mitra" | "superuser";

/** Object helper untuk perbandingan role tanpa typo */
export const ROLES = {
  ENGINEER:  "engineer",
  PTL:       "ptl",
  MITRA:     "mitra",
  SUPERUSER: "superuser",
} as const satisfies Record<string, UserRole>;
