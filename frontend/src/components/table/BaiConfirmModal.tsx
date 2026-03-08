import { useState } from "react";
import baiApi from "../../services/baiApi";

interface Props {
  rowId: number;
  idPa: string;
  namaPerusahaan: string;
  onClose: () => void;
  onToast: (msg: string, type?: "success" | "error") => void;
}

export default function BaiConfirmModal({ rowId, idPa, namaPerusahaan, onClose, onToast }: Props) {
  const today = new Date().toISOString().split("T")[0];
  const [tanggal, setTanggal]     = useState(today);
  const [loading, setLoading]     = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const blob     = await baiApi.generateBai(rowId, tanggal);
      const url      = URL.createObjectURL(blob);
      const a        = document.createElement("a");
      a.href         = url;
      a.download     = `BAI_${idPa.replace(/\//g, "-")}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      onToast(`BAI ${idPa} berhasil digenerate!`, "success");
      onClose();
    } catch (err: any) {
      // Cek apakah error response berupa blob (karena responseType: blob)
      if (err?.response?.data instanceof Blob) {
        const text = await err.response.data.text();
        try {
          const json = JSON.parse(text);
          onToast(json.detail || "Gagal generate BAI", "error");
        } catch {
          onToast("Gagal generate BAI", "error");
        }
      } else {
        onToast(err?.response?.data?.detail || "Gagal generate BAI", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "var(--accent-soft)" }}>
            <svg className="w-5 h-5" style={{ color: "var(--accent)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Generate BAI</h3>
            <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{namaPerusahaan || idPa}</p>
          </div>
          <button onClick={onClose} className="ml-auto shrink-0 p-1 rounded-lg transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-surface2)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Info PA */}
        <div className="px-3 py-2.5 rounded-lg mb-4 text-xs"
          style={{ background: "var(--bg-surface2)", border: "1px solid var(--border)" }}>
          <span style={{ color: "var(--text-muted)" }}>No. PA: </span>
          <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{idPa}</span>
        </div>

        {/* Input Tanggal BAI */}
        <div className="mb-5">
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
            Tanggal BAI
            <span className="ml-1.5 font-normal" style={{ color: "var(--text-muted)" }}>(opsional — default hari ini)</span>
          </label>
          <input
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm border transition-colors"
            style={{
              background: "var(--bg-surface2)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              outline: "none",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
            style={{ background: "var(--bg-surface2)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
          >
            Batal
          </button>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity"
            style={{ background: "var(--accent)", opacity: loading ? 0.7 : 1 }}
          >
            {loading ? (
              <><span className="spinner" /> Membuat...</>
            ) : (
              <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> Ya, Generate</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}