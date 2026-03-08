/**
 * TemplateLibrary.tsx
 * Split panel:
 *   Kiri  = dropdown list template + tombol Upload & Hapus (manajemen file saja)
 *   Kanan = auto preview SVG raw saat template dipilih
 *
 * Tidak ada form field isian di sini — itu ada di TemplateFillGenerator.
 */
import { useState, useEffect } from "react";
import asbuiltApi from "../../services/asbuiltApi";

interface Props {
  onToast: (msg: string, type?: "success" | "error") => void;
  selectedTemplate?: string;
  onSelectTemplate?: (filename: string) => void;
}

export default function TemplateLibrary({ onToast, selectedTemplate: externalSelected, onSelectTemplate }: Props) {
  const [templates,    setTemplates]    = useState<string[]>([]);
  const [selected,     setSelected]     = useState("");

  // Sync ke parent jika ada onSelectTemplate
  const handleSelect = (filename: string) => {
    setSelected(filename);
    onSelectTemplate?.(filename);
  };
  const [previewUrl,   setPreviewUrl]   = useState<string | null>(null);
  const [loadingList,  setLoadingList]  = useState(false);
  const [uploading,    setUploading]    = useState(false);
  const [deleting,     setDeleting]     = useState(false);
  const [confirmDel,   setConfirmDel]   = useState(false);
  const [showUpload,   setShowUpload]   = useState(false);
  const [dragOver,     setDragOver]     = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);

  // ── Fetch list ────────────────────────────────────────────────────────────
  const fetchTemplates = async () => {
    setLoadingList(true);
    try {
      const list = await asbuiltApi.listTemplates();
      setTemplates(list);
      if (list.length > 0) { const def = list[0]; setSelected((prev) => prev || def); onSelectTemplate?.(def); }
    } catch {
      onToast("Gagal memuat daftar template", "error");
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => { fetchTemplates(); }, []);

  // ── Auto preview raw SVG saat template dipilih ────────────────────────────
  useEffect(() => {
    if (!selected) { setPreviewUrl(null); return; }
    let cancelled = false;
    asbuiltApi.generateSVG(selected, {})
      .then((blob) => {
        if (cancelled) return;
        setPreviewUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(blob); });
      })
      .catch(() => { if (!cancelled) setPreviewUrl(null); });
    return () => { cancelled = true; };
  }, [selected]);

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!fileToUpload) return;
    setUploading(true);
    try {
      const res = await asbuiltApi.uploadTemplate(fileToUpload);
      onToast(`Upload berhasil! ${res.fields.length} field ditemukan`, "success");
      setShowUpload(false);
      setFileToUpload(null);
      await fetchTemplates();
      handleSelect(fileToUpload.name);
    } catch (err: any) {
      onToast(err?.response?.data?.detail || "Gagal upload template", "error");
    } finally {
      setUploading(false);
    }
  };

  // ── Hapus ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      await asbuiltApi.deleteTemplate(selected);
      onToast(`Template "${selected}" dihapus`, "success");
      setConfirmDel(false);
      const newList = templates.filter((t) => t !== selected);
      setTemplates(newList);
      handleSelect(newList[0] || "");
      setPreviewUrl(null);
    } catch {
      onToast("Gagal menghapus template", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith(".svg")) setFileToUpload(file);
    else onToast("Hanya file .svg yang diizinkan", "error");
  };

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Panel Kiri: Manajemen Template ── */}
      <div className="w-72 shrink-0 flex flex-col overflow-hidden"
        style={{ borderRight: "1px solid var(--border)" }}>

        {/* Header */}
        <div className="px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Library Template</h2>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
            {templates.length} template tersedia
          </p>
        </div>

        {/* ── Bagian ATAS: Tombol Upload + Hapus ── */}
        <div className="px-4 py-3 space-y-2.5 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex gap-2">
            <button
              onClick={() => setShowUpload(true)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white"
              style={{ background: "var(--accent)" }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Upload SVG
            </button>
            <button
              onClick={() => selected && setConfirmDel(true)}
              disabled={!selected}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-opacity"
              style={{
                background: "var(--bg-surface2)",
                border: "1px solid var(--border)",
                color: "#ef4444",
                opacity: !selected ? 0.4 : 1,
              }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Hapus
            </button>
          </div>
        </div>

        {/* ── Bagian BAWAH: List template (scrollable) ── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-2 space-y-1">
          {loadingList ? (
            <div className="text-xs px-2 py-3 text-center" style={{ color: "var(--text-muted)" }}>Memuat...</div>
          ) : templates.length === 0 ? (
            <div className="text-xs px-2 py-3 text-center" style={{ color: "var(--text-muted)" }}>
              Belum ada template.<br />Klik Upload SVG untuk menambahkan.
            </div>
          ) : (
            templates.map((t) => (
              <button
                key={t}
                onClick={() => handleSelect(t)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left transition-all"
                style={{
                  background: selected === t ? "var(--accent)" : "var(--bg-surface2)",
                  color: selected === t ? "#fff" : "var(--text-primary)",
                  border: `1px solid ${selected === t ? "var(--accent)" : "var(--border)"}`,
                }}
                onMouseEnter={(e) => { if (selected !== t) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)"; }}
                onMouseLeave={(e) => { if (selected !== t) (e.currentTarget as HTMLElement).style.background = "var(--bg-surface2)"; }}
              >
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="truncate">{t}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Panel Kanan: Auto Preview SVG Raw ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 py-3 shrink-0 flex items-center gap-3"
          style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Preview Template</h3>
            <p className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>
              {selected ? `${selected} — tampil otomatis saat dipilih` : "Pilih template untuk preview"}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-auto flex items-center justify-center p-4 custom-scrollbar"
          style={{ background: "var(--bg-surface2)" }}>
          {!selected ? (
            <div className="text-center" style={{ color: "var(--text-muted)" }}>
              <svg className="w-14 h-14 mx-auto mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm">Pilih template dari dropdown</p>
              <p className="text-xs mt-1">Preview akan muncul di sini</p>
            </div>
          ) : previewUrl ? (
            <img
              src={previewUrl}
              alt="Preview Template"
              className="max-w-full max-h-full object-contain rounded-lg shadow-sm"
            />
          ) : (
            <div className="text-center" style={{ color: "var(--text-muted)" }}>
              <div className="spinner mx-auto mb-2" />
              <p className="text-xs">Memuat preview...</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal Upload ── */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowUpload(false); setFileToUpload(null); } }}
        >
          <div className="rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Upload Template SVG</h3>
              <button onClick={() => { setShowUpload(false); setFileToUpload(null); }}
                style={{ color: "var(--text-muted)" }}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById("svgFileInput")?.click()}
              className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all mb-4"
              style={{
                borderColor: dragOver ? "var(--accent)" : "var(--border)",
                background:  dragOver ? "var(--accent-soft)" : "var(--bg-surface2)",
                color: "var(--text-muted)",
              }}
            >
              <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <p className="text-sm">
                {fileToUpload ? `✅ ${fileToUpload.name}` : "Drop file .svg atau klik untuk pilih"}
              </p>
              <p className="text-xs mt-1">Wajib memiliki placeholder {"{field_...}"}</p>
              <input id="svgFileInput" type="file" accept=".svg" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) setFileToUpload(f); }} />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setShowUpload(false); setFileToUpload(null); }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm"
                style={{ background: "var(--bg-surface2)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
              >Batal</button>
              <button
                onClick={handleUpload}
                disabled={!fileToUpload || uploading}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity"
                style={{ background: "var(--accent)", opacity: !fileToUpload || uploading ? 0.5 : 1 }}
              >{uploading ? "Mengupload..." : "Upload"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Konfirmasi Hapus ── */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="rounded-2xl shadow-2xl p-6 w-full max-w-xs mx-4"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "#fee2e2" }}>
                <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Hapus Template?</p>
                <p className="text-xs truncate max-w-[170px]" style={{ color: "var(--text-muted)" }}>{selected}</p>
              </div>
            </div>
            <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
              Template yang dihapus tidak bisa dikembalikan.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDel(false)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm"
                style={{ background: "var(--bg-surface2)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
              >Batal</button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: "#ef4444", opacity: deleting ? 0.6 : 1 }}
              >{deleting ? "Menghapus..." : "Ya, Hapus"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}