/**
 * profileApi.ts
 * API calls untuk halaman profil user.
 */
import api from "./api";

export interface ProfileData {
  username:          string;
  nama_lengkap:      string;
  role:              string;
  is_active:         boolean;
  gsheet_url:        string | null;
  gsheet_sheet_name: string | null;
  created_at:        string | null;
  created_by:        string | null;
}

export const profileApi = {
  getMe: async (): Promise<ProfileData> => {
    const res = await api.get<ProfileData>("/profile/me");
    return res.data;
  },

  changePassword: async (payload: {
    current_password: string;
    new_password:     string;
    confirm_password: string;
  }): Promise<{ ok: boolean; message: string }> => {
    const res = await api.put("/profile/password", payload);
    return res.data;
  },

  updateGSheet: async (payload: {
    gsheet_url:        string | null;
    gsheet_sheet_name: string | null;
  }): Promise<{ ok: boolean }> => {
    const res = await api.put("/profile/gsheet", payload);
    return res.data;
  },
};
