/**
 * authStore.ts
 * Access token disimpan di sessionStorage — survive page reload,
 * hilang saat tab/browser ditutup. Refresh token di httpOnly cookie.
 *
 * Setelah login (setAuth), otomatis load preset & editableColumns dari DB.
 */
import { create } from "zustand";
import { usePresetStore } from "./presetStore";
import { usePTLPresetStore } from "./ptlPresetStore";
import { useAppearanceStore } from "./appearanceStore";
import { useTaskStore } from "./taskStore";
import { SESSION_ACCESS_TOKEN, SESSION_USER } from "../constants/storageKeys";
import { ROLES } from "../constants/roles";

// Re-export agar kode yang sudah import dari authStore tidak perlu diubah
export type { UserRole } from "../constants/roles";
export type { UserRole as AuthUserRole } from "../constants/roles";

export interface AuthUser {
  username:     string;
  nama_lengkap: string;
  role:         import("../constants/roles").UserRole;
}

const storedToken = sessionStorage.getItem(SESSION_ACCESS_TOKEN) ?? null;
const storedUser  = (() => {
  try {
    const raw = sessionStorage.getItem(SESSION_USER);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch { return null; }
})();

interface AuthState {
  user:        AuthUser | null;
  accessToken: string | null;

  setAuth:    (user: AuthUser, token: string) => void;
  setToken:   (token: string) => void;
  clearAuth:  () => void;
  isLoggedIn: () => boolean;
  hasRole:    (...roles: import("../constants/roles").UserRole[]) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user:        storedUser,
  accessToken: storedToken,

  setAuth: (user, accessToken) => {
    sessionStorage.setItem(SESSION_ACCESS_TOKEN, accessToken);
    sessionStorage.setItem(SESSION_USER, JSON.stringify(user));
    set({ user, accessToken });

    // Load preset & editable columns dari DB setelah login
    setTimeout(() => {
      const role = user.role;
      usePresetStore.getState().loadFromDB();

      if (role === ROLES.PTL) {
        usePTLPresetStore.getState().loadFromDB();
      }

      if (role === ROLES.ENGINEER) {
        useAppearanceStore.getState().loadEditableColumnsFromDB();
      }
    }, 100);
  },

  setToken: (accessToken) => {
    sessionStorage.setItem(SESSION_ACCESS_TOKEN, accessToken);
    set({ accessToken });
  },

  clearAuth: () => {
    sessionStorage.removeItem(SESSION_ACCESS_TOKEN);
    sessionStorage.removeItem(SESSION_USER);
    useTaskStore.getState().resetLoadedFlag();
    set({ user: null, accessToken: null });
  },

  isLoggedIn: () => !!get().accessToken && !!get().user,

  hasRole: (...roles) => {
    const role = get().user?.role;
    return role ? roles.includes(role) : false;
  },
}));
