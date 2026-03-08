import api from "./api";

const baiApi = {
  /**
   * Generate dokumen BAI dari data GSheet berdasarkan row_id.
   * @param rowId      - nomor baris di GSheet (dari record.row_id)
   * @param tanggalBai - format YYYY-MM-DD, opsional (default hari ini di backend)
   */
  generateBai: (rowId: number, tanggalBai?: string): Promise<Blob> =>
    api
      .post(
        `/bai/generate/${rowId}`,
        { tanggal_bai: tanggalBai || null },
        { responseType: "blob", timeout: 60000 }
      )
      .then((r) => r.data),
};

export default baiApi;