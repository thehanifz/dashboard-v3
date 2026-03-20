import api from "./api";

export interface AutoFillResult {
  ok: boolean;
  id_pa: string;
  row_id: number;
  autofill: {
    no_pa: string;
    no_pa_raw: string;       // ← tambah
    sid: string;
    user: string;
    nama_layanan: string;
    bandwidth: string;
    no_surat: string;
    vendor_instalasi: string;
    project_team: string;
    nama_t: string;
    nama_o: string;
    alamat_kantor_user: string;
    tgl_terbit_pa: string;
  };
}

const teskomApi = {
  /** Autofill dari GSheet Engineer (engineer / mitra role). */
  autofill: (idPa: string): Promise<AutoFillResult> =>
    api.get(`/teskom/autofill/${encodeURIComponent(idPa)}`).then((r) => r.data),

  /** Autofill dari GSheet PTL milik sendiri (ptl role). */
  autofillPtl: (idPa: string): Promise<AutoFillResult> =>
    api.get(`/teskom/autofill-ptl/${encodeURIComponent(idPa)}`).then((r) => r.data),

  generateDoc: (formData: FormData): Promise<Blob> =>
    api
      .post("/teskom/generate", formData, {
        responseType: "blob",
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60000,
      })
      .then((r) => r.data),
};

export default teskomApi;