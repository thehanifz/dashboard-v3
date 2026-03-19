/**
 * authStore.ts
 * State autentikasi. Access token disimpan di memory (bukan localStorage) — aman dari XSS.
 * Refresh token ada di httpOnly cookie, dihandle otomatis oleh browser.
 */
import { create } from "zustand";

export type UserRole = "engineer" | "ptl" | "mitra" | "superuser";

export interface AuthUser {
  username: string;
  nama_lengkap: string;
  role: UserRole;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;

  setAuth: (user: AuthUser, token: string) => void;
  setToken: (token: string) => void;
  clearAuth: () => void;
  isLoggedIn: () => boolean;
  hasRole: (...roles: UserRole[]) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,

  setAuth: (user, accessToken) => set({ user, accessToken }),
  setToken: (accessToken) => set({ accessToken }),
  clearAuth: () => set({ user: null, accessToken: null }),

  isLoggedIn: () => !!get().accessToken && !!get().user,
  hasRole: (...roles) => {
    const role = get().user?.role;
    return role ? roles.includes(role) : false;
  },
}));