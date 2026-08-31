/**
 * authStore.ts
 * Access token disimpan di sessionStorage (cepat, tidak persisten lintas browser session).
 * Refresh token disimpan aman oleh backend di httpOnly cookie dan dipakai untuk
 * memulihkan session saat browser/tab dibuka kembali.
 */
import { create } from "zustand";
import { usePresetStore } from "./presetStore";
import { usePTLPresetStore } from "./ptlPresetStore";
import { useAppearanceStore } from "./appearanceStore";
import { useTaskStore } from "./taskStore";
import { SESSION_ACCESS_TOKEN, SESSION_USER } from "../constants/storageKeys";
import { ROLES } from "../constants/roles";

export type { UserRole } from "../constants/roles";
export type { UserRole as AuthUserRole } from "../constants/roles";

export interface AuthUser {
  username: string;
  nama_lengkap: string;
  role: import("../constants/roles").UserRole;
}

const storedToken = sessionStorage.getItem(SESSION_ACCESS_TOKEN) ?? null;
const storedUser = (() => {
  try {
    const raw = sessionStorage.getItem(SESSION_USER);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
})();

interface RefreshResponse {
  access_token: string;
  token_type?: string;
  username: string;
  role: string;
  nama_lengkap: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  authReady: boolean;

  setAuth: (user: AuthUser, token: string) => void;
  setToken: (token: string) => void;
  clearAuth: () => void;
  initializeSession: () => Promise<void>;
  isLoggedIn: () => boolean;
  hasRole: (...roles: import("../constants/roles").UserRole[]) => boolean;
}

let initializePromise: Promise<void> | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: storedUser,
  accessToken: storedToken,
  authReady: !!storedToken && !!storedUser,

  setAuth: (user, accessToken) => {
    sessionStorage.setItem(SESSION_ACCESS_TOKEN, accessToken);
    sessionStorage.setItem(SESSION_USER, JSON.stringify(user));
    set({ user, accessToken, authReady: true });

    // Load preset & editable columns dari DB setelah login / session recovery.
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

  initializeSession: async () => {
    if (initializePromise) return initializePromise;

    initializePromise = (async () => {
      // Existing tab/session masih punya access token + user. Tidak perlu
      // melakukan refresh tanpa alasan; interceptor akan refresh bila expired.
      if (get().accessToken && get().user) {
        set({ authReady: true });
        return;
      }

      try {
        // Dynamic import menghindari circular dependency:
        // authApi -> api -> authStore.
        const { authApi } = await import("../services/authApi");
        const response: RefreshResponse = await authApi.refresh();
        const user: AuthUser = {
          username: response.username,
          nama_lengkap: response.nama_lengkap,
          role: response.role as AuthUser["role"],
        };
        get().setAuth(user, response.access_token);
      } catch {
        get().clearAuth();
        set({ authReady: true });
      }
    })().finally(() => {
      initializePromise = null;
    });

    return initializePromise;
  },

  isLoggedIn: () => !!get().accessToken && !!get().user,

  hasRole: (...roles) => {
    const role = get().user?.role;
    return role ? roles.includes(role) : false;
  },
}));
