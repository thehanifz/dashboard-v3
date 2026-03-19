export type UserRole = "engineer" | "ptl" | "mitra";

export interface UserItem {
  id: string;
  username: string;
  nama_lengkap: string;
  role: UserRole | string;
  gsheet_url: string | null;
  is_active: boolean;
  created_at: string | null;
  created_by: string | null;
}

export interface UserListResponse {
  items: UserItem[];
}

export interface CreateUserPayload {
  username: string;
  password: string;
  nama_lengkap: string;
  role: UserRole;
  gsheet_url?: string | null;
}

export interface UpdateUserPayload {
  nama_lengkap: string;
  role: UserRole;
  gsheet_url?: string | null;
  is_active: boolean;
}

export interface ResetPasswordPayload {
  new_password: string;
}

function getBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL || "/api";
}

function getAccessToken() {
  return sessionStorage.getItem("dash_v3_at") || "";
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();

  const response = await fetch(`${getBaseUrl()}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    credentials: "include",
  });

  if (!response.ok) {
    let detail = "Request gagal";
    try {
      const data = await response.json();
      detail = data?.detail || detail;
    } catch {
      detail = response.statusText || detail;
    }
    throw new Error(detail);
  }

  return response.json();
}

export const adminApi = {
  async getUsers(): Promise<UserItem[]> {
    const data = await request<UserListResponse>("/admin/users", { method: "GET" });
    return data.items;
  },

  async createUser(payload: CreateUserPayload): Promise<UserItem> {
    return request<UserItem>("/admin/users", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateUser(id: string, payload: UpdateUserPayload): Promise<UserItem> {
    return request<UserItem>(`/admin/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async deactivateUser(id: string): Promise<UserItem> {
    return request<UserItem>(`/admin/users/${id}/deactivate`, { method: "POST" });
  },

  async resetPassword(id: string, payload: ResetPasswordPayload): Promise<UserItem> {
    return request<UserItem>(`/admin/users/${id}/reset-password`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
