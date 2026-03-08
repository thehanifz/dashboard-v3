import { useState } from "react";
import teskomApi, { AutoFillResult } from "../../services/teskomApi";

interface Props {
  onAutofill: (data: AutoFillResult["autofill"]) => void;
  onToast: (msg: string, type?: "success" | "error") => void;
}

export default function AutoFillSearch({ onAutofill, onToast }: Props) {
  const [query, setQuery]   = useState("");
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      const result = await teskomApi.autofill(trimmed);
      onAutofill(result.autofill);
      onToast(`Data ID PA "${trimmed}" berhasil dimuat dari GSheet`, "success");
    } catch (err: any) {
      const msg = err?.response?.data?.detail || `ID PA "${trimmed}" tidak ditemukan`;
      onToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 rounded-xl mb-4" style={{ background: "var(--accent-soft)", border: "1px solid var(--accent)" }}>
      <div className="flex items-center gap-2 mb-2">
        <svg className="w-4 h-4 shrink-0" style={{ color: "var(--accent)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span className="text-sm font-semibold" style={{ color: "var(--accent)" }}>Auto-fill dari GSheet</span>
      </div>
      <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
        Masukkan ID PA untuk mengisi form secara otomatis dari data GSheet.
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Contoh: A121101000105"
          className="flex-1 px-3 py-2 rounded-lg text-sm border"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
            outline: "none",
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
        />
        <button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity"
          style={{ background: "var(--accent)", opacity: loading || !query.trim() ? 0.5 : 1 }}
        >
          {loading ? "Mencari..." : "Cari"}
        </button>
      </div>
    </div>
  );
}
