import api, { getDeduped } from "./api";

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

export interface WakilUserRecord {
  id: number;
  nama_wakil_user: string;
  jabatan_user: string;
  no_hp_user: string;
  alamat_kantor_user: string;
  created_at?: string;
  updated_at?: string;
}

export interface WakilUserIn {
  nama_wakil_user: string;
  jabatan_user?: string;
  no_hp_user?: string;
  alamat_kantor_user?: string;
}

export type TeskomCacheSource = "records" | "ptl";

function parseBandwidth(keterangan: string): string {
  if (!keterangan) return "";
  const match = keterangan.match(/BANDWIDTH:\s*(\S+(?:\s+\S+)?)/i);
  if (!match) return "";
  const value = match[1];
  const normalized = value.match(/^(\d+(?:\.\d+)?)\s*(MBPS|GBPS|KBPS)?$/i);
  return normalized
    ? `${normalized[1]} ${(normalized[2] || "MBPS").toUpperCase()}`
    : "";
}

export function formatPtlName(raw: string): string {
  if (!raw) return "";
  const nameOnly = raw.split("|")[0].trim();
  return nameOnly
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Mapping row yang sudah ada di cache dashboard → payload autofill Teskom.
 * Tidak melakukan network request.
 */
export function autofillFromCache(
  data: Record<string, string>,
  source: TeskomCacheSource = "records"
): AutoFillResult {
  const isPtl = source === "ptl";
  const idPa = data["ID PA"] || "";

  return {
    ok: true,
    id_pa: idPa,
    row_id: Number(data["__row_id"] || 0),
    autofill: {
      no_pa: idPa,
      no_pa_raw: idPa,
      sid: data["SERVICE ID"] || "",
      user: isPtl ? (data["NAMA PERUSAHAAN"] || "") : (data["NAMA CUSTOMER"] || ""),
      nama_layanan: isPtl ? (data["LAYANAN"] || "") : (data["NAMA PRODUK"] || ""),
      bandwidth: isPtl
        ? (data["BANDWIDTH"] || parseBandwidth(data["KETERANGAN"] || ""))
        : (data["BANDWIDTH"] || ""),
      no_surat: isPtl ? (data["No Surat Permohonan"] || "") : (data["ID PERMOHONAN"] || ""),
      vendor_instalasi: isPtl ? (data["MITRA TERMINATING"] || "") : "",
      project_team: formatPtlName(isPtl ? (data["PTL TERMINATING"] || "") : (data["Nama PTL"] || "")),
      nama_t: isPtl ? (data["ALAMAT TERMINATING"] || "") : (data["ALAMAT"] || ""),
      nama_o: isPtl ? (data["ALAMAT ORIGINATING"] || "") : "",
      alamat_kantor_user: isPtl ? (data["ALAMAT TERMINATING"] || "") : (data["ALAMAT"] || ""),
      tgl_terbit_pa: isPtl ? (data["TGL TERBIT PA"] || "") : (data["TGL TERBIT PA"] || ""),
    },
  };
}

const teskomApi = {
  /** Autofill dari database (engineer / mitra role). node: TERMINATING | ORIGINATING */
  autofill: (idPa: string, node: string = "TERMINATING"): Promise<AutoFillResult> =>
    api
      .get(`/teskom/autofill/${encodeURIComponent(idPa)}`, { params: { node } })
      .then((r) => r.data),

  /** Autofill dari GSheet PTL milik sendiri (ptl role). */
  autofillPtl: (idPa: string): Promise<AutoFillResult> =>
    getDeduped(`/teskom/autofill-ptl/${encodeURIComponent(idPa)}`).then((r) => r.data),

  generateDoc: (formData: FormData): Promise<Blob> =>
    api
      .post("/teskom/generate", formData, {
        responseType: "blob",
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60000,
      })
      .then((r) => r.data),

  /** Daftar wakil user (perwakilan pelanggan) milik user yang login */
  getWakilUsers: (): Promise<WakilUserRecord[]> =>
    api.get("/teskom/wakil-users").then((r) => r.data),

  /** Simpan wakil user baru ke database */
  createWakilUser: (data: WakilUserIn): Promise<WakilUserRecord> =>
    api.post("/teskom/wakil-users", data).then((r) => r.data),

  /** Hapus wakil user dari database berdasarkan ID */
  deleteWakilUser: (id: number): Promise<{ ok: boolean; message: string }> =>
    api.delete(`/teskom/wakil-users/${id}`).then((r) => r.data),
};

export default teskomApi;
