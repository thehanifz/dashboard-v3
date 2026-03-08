import { useState } from "react";
import BaiConfirmModal from "./BaiConfirmModal";

interface Props {
  rowId: number;
  idPa: string;
  namaPerusahaan: string;
  onToast: (msg: string, type?: "success" | "error") => void;
}

export default function BaiActionButton({ rowId, idPa, namaPerusahaan, onToast }: Props) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setShowModal(true); }}
        title={`Generate BAI — ${idPa}`}
        className="flex items-center justify-center w-6 h-6 rounded-md transition-all"
        style={{ color: "var(--text-muted)" }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = "var(--accent-soft)";
          (e.currentTarget as HTMLElement).style.color = "var(--accent)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = "transparent";
          (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
        }}
      >
        {/* Icon dokumen / BAI */}
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </button>

      {showModal && (
        <BaiConfirmModal
          rowId={rowId}
          idPa={idPa}
          namaPerusahaan={namaPerusahaan}
          onClose={() => setShowModal(false)}
          onToast={onToast}
        />
      )}
    </>
  );
}