/**
 * authApi.ts
 * Semua pemanggilan API terkait autentikasi.
 */
import api from "./api";

export interface LoginResponse {
  access_token: string;
  token_type: string;
  username: string;
  role: string;
  nama_lengkap: string;
}

export const authApi = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const res = await api.post<LoginResponse>("/auth/login", { username, password });
    return res.data;
  },

  logout: async (): Promise<void> => {
    await api.post("/auth/logout");
  },

  refresh: async (): Promise<{ access_token: string }> => {
    const res = await api.post<{ access_token: string }>("/auth/refresh");
    return res.data;
  },

  me: async () => {
    const res = await api.get("/auth/me");
    return res.data;
  },
};