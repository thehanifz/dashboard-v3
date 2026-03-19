import api from "./api";

export interface RoleTableConfig {
  role: string;
  visible_columns: string[];
  editable_columns: string[];
  updated_by: string;
  updated_at: string | null;
}

export interface AvailableColumns {
  all_columns: string[];
  mitra_editable_whitelist: string[];
}

export const roleConfigApi = {
  async getConfig(role: string): Promise<RoleTableConfig> {
    const res = await api.get<RoleTableConfig>(`/role-config/${role}`);
    return res.data;
  },

  async updateConfig(
    role: string,
    payload: { visible_columns: string[]; editable_columns: string[] }
  ): Promise<RoleTableConfig> {
    const res = await api.put<RoleTableConfig>(`/role-config/${role}`, payload);
    return res.data;
  },

  async getAvailableColumns(): Promise<AvailableColumns> {
    const res = await api.get<AvailableColumns>("/role-config/columns");
    return res.data;
  },
};
