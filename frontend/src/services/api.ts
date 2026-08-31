/**
 * services/api.ts
 * Axios instance dengan interceptor auth.
 * Import authStore langsung — tidak pakai require() karena tidak support di browser (ESM).
 */
import axios, { AxiosInstance } from "axios";
import { useAuthStore } from "../state/authStore";

const api: AxiosInstance = axios.create({
  baseURL: "/api",
  timeout: 60000, // 60 detik — untuk load data 18MB pertama kali
  withCredentials: true,
});

// ── Request: inject access token ──────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

// ── Response: auto refresh saat 401 ──────────────────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((p) => error ? p.reject(error) : p.resolve(token!));
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (useAuthStore.getState().isLoggingOut) {
      return Promise.reject(error);
    }

    if (
      originalRequest.url?.includes("/auth/login") ||
      originalRequest.url?.includes("/auth/refresh") ||
      originalRequest.url?.includes("/auth/me") ||
      originalRequest.url?.includes("/auth/logout")
    ) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
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
      // Logout selalu menang sebelum refresh dimulai.
      if (useAuthStore.getState().isLoggingOut) {
        throw new axios.CanceledError("Logout sedang diproses");
      }

      const { data } = await api.post<{ access_token: string }>("/auth/refresh");

      // Refresh bisa selesai bersamaan dengan klik Logout. Jangan hidupkan
      // kembali token yang baru saja dinyatakan tidak valid oleh user.
      if (useAuthStore.getState().isLoggingOut) {
        throw new axios.CanceledError("Logout sedang diproses");
      }

      const newToken = data.access_token;
      useAuthStore.getState().setToken(newToken);
      originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
      processQueue(null, newToken);
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      if (!useAuthStore.getState().isLoggingOut) {
        useAuthStore.getState().clearAuth();
        window.location.href = "/";
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;