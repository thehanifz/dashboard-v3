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

export type UserRole = "engineer" | "ptl" | "mitra" | "superuser";

export interface AuthUser {
  username:     string;
  nama_lengkap: string;
  role:         UserRole;
}

const TOKEN_KEY = "dash_v3_at";
const USER_KEY  = "dash_v3_user";

const storedToken = sessionStorage.getItem(TOKEN_KEY) ?? null;
const storedUser  = (() => {
  try {
    const raw = sessionStorage.getItem(USER_KEY);
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
  hasRole:    (...roles: UserRole[]) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user:        storedUser,
  accessToken: storedToken,

  setAuth: (user, accessToken) => {
    sessionStorage.setItem(TOKEN_KEY, accessToken);
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ user, accessToken });

    // Load preset & editable columns dari DB setelah login
    setTimeout(() => {
      const role = user.role;
      usePresetStore.getState().loadFromDB();

      if (role === "ptl") {
        usePTLPresetStore.getState().loadFromDB();
      }

      if (role === "engineer") {
        useAppearanceStore.getState().loadEditableColumnsFromDB();
      }
    }, 100);
  },

  setToken: (accessToken) => {
    sessionStorage.setItem(TOKEN_KEY, accessToken);
    set({ accessToken });
  },

  clearAuth: () => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    set({ user: null, accessToken: null });
  },

  isLoggedIn: () => !!get().accessToken && !!get().user,

  hasRole: (...roles) => {
    const role = get().user?.role;
    return role ? roles.includes(role) : false;
  },
}));