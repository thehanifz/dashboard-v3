import api from "./api";

const baiApi = {
  /** Generate BAI dari GSheet Engineer (engineer role). */
  generateBai: (rowId: number, tanggalBai?: string): Promise<Blob> =>
    api
      .post(
        `/bai/generate/${rowId}`,
        { tanggal_bai: tanggalBai || null },
        { responseType: "blob", timeout: 60000 }
      )
      .then((r) => r.data),

  /** Generate BAI dari GSheet PTL milik sendiri (ptl role). */
  generateBaiPtl: (rowId: number, tanggalBai?: string): Promise<Blob> =>
    api
      .post(
        `/bai/generate-ptl/${rowId}`,
        { tanggal_bai: tanggalBai || null },
        { responseType: "blob", timeout: 60000 }
      )
      .then((r) => r.data),
};

export default baiApi;