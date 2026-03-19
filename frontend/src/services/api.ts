/**
 * services/api.ts
 * Axios instance dengan interceptor:
 * - Request: inject Authorization header dari authStore
 * - Response: 401 → coba refresh token → retry request → kalau gagal redirect ke /login
 */
import axios, { AxiosInstance } from "axios";

const api: AxiosInstance = axios.create({
  baseURL: "/api",
  timeout: 15000,
  withCredentials: true, // kirim httpOnly cookie (refresh token) otomatis
});

// ── Request interceptor: inject access token ──────────────────────────────────
api.interceptors.request.use((config) => {
  // Import lazy untuk hindari circular dependency
  const { useAuthStore } = require("../state/authStore");
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: auto refresh saat 401 ───────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((p) => {
    if (error) p.reject(error);
    else p.resolve(token!);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Kalau bukan 401, atau sudah pernah retry, langsung throw
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Kalau endpoint /auth/login atau /auth/refresh yang 401 — langsung ke login
    if (
      originalRequest.url?.includes("/auth/login") ||
      originalRequest.url?.includes("/auth/refresh")
    ) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Antri request yang masuk saat refresh sedang berjalan
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (token) => {
            originalRequest.headers["Authorization"] = `Bearer ${token}`;
            resolve(api(originalRequest));
          },
          reject,
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { data } = await api.post<{ access_token: string }>("/auth/refresh");
      const newToken = data.access_token;

      const { useAuthStore } = require("../state/authStore");
      useAuthStore.getState().setToken(newToken);

      originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
      processQueue(null, newToken);
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      // Refresh gagal — paksa logout dan redirect ke login
      const { useAuthStore } = require("../state/authStore");
      useAuthStore.getState().clearAuth();
      window.location.href = "/login";
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;