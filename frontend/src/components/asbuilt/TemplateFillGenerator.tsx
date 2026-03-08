/**
 * TemplateFillGenerator.tsx
 * Dua mode:
 *   1. Standalone (Generate tab lama) — punya dropdown sendiri
 *   2. Embedded di Library — selectedTemplate dikontrol dari luar via props
 *
 * Saat selectedTemplate prop berubah → ikut pindah template tanpa dropdown sendiri.
 */
import { useState, useEffect, useRef } from "react";
import asbuiltApi from "../../services/asbuiltApi";
import { downloadSvgAsPng } from "../../utils/svgTopologyRenderer";

// ── Sub-komponen di LUAR agar tidak re-mount saat parent re-render ─────────────
function FieldInput({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-[11px] font-medium mb-1"
        style={{ color: "var(--text-secondary)" }}>
        {label.replace(/_/g, " ")}
      </label>
      <input
        type="text"
        value={value}
        placeholder={`Isi ${label.replace(/_/g, " ").toLowerCase()}`}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg text-xs border transition-colors"
        style={{
          background: "var(--bg-surface2)",
          border: "1px solid var(--border)",
          color: "var(--text-primary)",
          outline: "none",
        }}
        onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
        onBlur={(e)  => (e.target.style.borderColor = "var(--border)")}
      />
    </div>
  );
}

interface Props {
  onToast: (msg: string, type?: "success" | "error") => void;
  /** Jika diisi, dropdown template disembunyikan dan ikut nilai ini */
  selectedTemplate?: string;
  /** Callback saat preview URL berubah (mode embedded) */
  onPreviewUpdate?: (url: string | null) => void;
}

export default function TemplateFillGenerator({ onToast, selectedTemplate: externalSelected, onPreviewUpdate }: Props) {
  const embedded = !!externalSelected; // mode embedded = tidak tampilkan dropdown sendiri

  const [templates,   setTemplates]   = useState<string[]>([]);
  const [selected,    setSelected]    = useState(externalSelected || "");
  const [fields,      setFields]      = useState<string[]>([]);
  const [values,      setValues]      = useState<Record<string, string>>({});
  const [previewUrl,  setPreviewUrl]  = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [generating,  setGenerating]  = useState(false);
  const [downloading, setDownloading] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load list template (hanya untuk mode standalone) ─────────────────────
  useEffect(() => {
    if (embedded) return;
    setLoadingList(true);
    asbuiltApi.listTemplates()
      .then((list) => {
        setTemplates(list);
        if (list.length > 0) setSelected(list[0]);
      })
      .catch(() => onToast("Gagal memuat daftar template", "error"))
      .finally(() => setLoadingList(false));
  }, [embedded]);

  // ── Sync dari parent (mode embedded) ─────────────────────────────────────
  useEffect(() => {
    if (!embedded) return;
    if (externalSelected && externalSelected !== selected) {
      setSelected(externalSelected);
    }
  }, [externalSelected, embedded]);

  // ── Load fields saat template berubah ─────────────────────────────────────
  useEffect(() => {
    if (!selected) { setFields([]); setValues({}); setPreviewUrl(null); onPreviewUpdate?.(null); return; }
    asbuiltApi.getTemplateDetail(selected)
      .then((detail) => {
        setFields(detail.fields);
        setValues(Object.fromEntries(detail.fields.map((f) => [f, ""])));
        setPreviewUrl(null);
      })
      .catch(() => onToast("Gagal memuat field template", "error"));
  }, [selected]);

  // ── Auto preview (debounce 300ms) via useRef ───────────────────────────────
  const valuesRef = useRef(values);
  valuesRef.current = values;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  const triggerPreview = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const sel = selectedRef.current;
      const vals = valuesRef.current;
      if (!sel || Object.keys(vals).length === 0) return;
      setGenerating(true);
      try {
        const blob = await asbuiltApi.generateSVG(sel, vals);
        const newUrl = URL.createObjectURL(blob);
        setPreviewUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return newUrl; });
        onPreviewUpdate?.(newUrl);
      } catch {
        // silent
      } finally {
        setGenerating(false);
      }
    }, 300);
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  // Trigger preview saat values atau selected berubah
  useEffect(() => {
    if (selected && fields.length > 0) triggerPreview();
  }, [values, selected, fields.length]);

  // ── Update single field ───────────────────────────────────────────────────
  const updateField = (field: string, val: string) => {
    setValues((prev) => ({ ...prev, [field]: val }));
  };

  // ── Download SVG ──────────────────────────────────────────────────────────
  const handleDownloadSVG = () => {
    if (!previewUrl) return;
    const a = document.createElement("a");
    a.href = previewUrl;
    a.download = selected.replace(".svg", "_filled.svg");
    a.click();
  };

  // ── Download PNG ──────────────────────────────────────────────────────────
  const handleDownloadPNG = async () => {
    if (!previewUrl) return;
    setDownloading(true);
    try {
      const res  = await fetch(previewUrl);
      const text = await res.text();
      const parser = new DOMParser();
      const doc    = parser.parseFromString(text, "image/svg+xml");
      const svgEl  = doc.querySelector("svg") as SVGSVGElement | null;
      if (!svgEl) { onToast("Gagal parse SVG", "error"); return; }
      document.body.appendChild(svgEl);
      await downloadSvgAsPng(svgEl, selected.replace(".svg", "_filled.png"));
      document.body.removeChild(svgEl);
    } catch {
      onToast("Gagal download PNG", "error");
    } finally {
      setDownloading(false);
    }
  };

  // ── MODE EMBEDDED: hanya form field + download (preview ada di parent) ───────
  if (embedded) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Isi Field Template</h2>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
            {selected ? `${fields.length} field ditemukan` : "Pilih template dari dropdown di atas"}
          </p>
        </div>

        {/* Form Fields */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-3 space-y-3">
          {!selected ? (
            <div className="text-center mt-8" style={{ color: "var(--text-muted)" }}>
              <svg className="w-8 h-8 mx-auto mb-2 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-xs">Pilih template dari dropdown di atas</p>
            </div>
          ) : fields.length === 0 ? (
            <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
              <div className="spinner shrink-0" />
              Memuat field...
            </div>
          ) : (
            fields.map((field) => (
              <FieldInput
                key={field}
                label={field}
                value={values[field] || ""}
                onChange={(v) => updateField(field, v)}
              />
            ))
          )}
        </div>

        {/* Download buttons */}
        {previewUrl && (
          <div className="px-4 py-3 space-y-2 shrink-0" style={{ borderTop: "1px solid var(--border)" }}>
            <button onClick={handleDownloadSVG}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold"
              style={{ background: "var(--bg-surface2)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download SVG
            </button>
            <button onClick={handleDownloadPNG} disabled={downloading}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold text-white"
              style={{ background: "var(--accent)", opacity: downloading ? 0.6 : 1 }}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {downloading ? "Menyiapkan..." : "Download PNG"}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── MODE STANDALONE: form kiri + preview kanan ────────────────────────────
  return (
    <div className="flex h-full overflow-hidden">

      {/* Panel Kiri: Form Field */}
      <div className="w-72 shrink-0 flex flex-col overflow-hidden"
        style={{ borderRight: "1px solid var(--border)" }}>

        <div className="px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Template Fill</h2>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
            {selected ? `${fields.length} field ditemukan` : "Pilih template untuk memulai"}
          </p>
        </div>

        <div className="px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          <label className="block text-[11px] font-medium mb-1.5"
            style={{ color: "var(--text-secondary)" }}>Pilih Template</label>
          {loadingList ? (
            <div className="text-xs px-3 py-2 rounded-lg"
              style={{ background: "var(--bg-surface2)", color: "var(--text-muted)" }}>Memuat...</div>
          ) : templates.length === 0 ? (
            <div className="text-xs px-3 py-2 rounded-lg"
              style={{ background: "var(--bg-surface2)", color: "var(--text-muted)" }}>
              Belum ada template — upload di Library
            </div>
          ) : (
            <select value={selected} onChange={(e) => setSelected(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-xs border"
              style={{ background: "var(--bg-surface2)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none" }}>
              {templates.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-3 space-y-3">
          {!selected ? (
            <div className="text-center mt-8" style={{ color: "var(--text-muted)" }}>
              <p className="text-xs">Pilih template untuk melihat field</p>
            </div>
          ) : fields.length === 0 ? (
            <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
              <div className="spinner shrink-0" />Memuat field...
            </div>
          ) : (
            fields.map((field) => (
              <FieldInput key={field} label={field} value={values[field] || ""} onChange={(v) => updateField(field, v)} />
            ))
          )}
        </div>

        {previewUrl && (
          <div className="px-4 py-3 space-y-2 shrink-0" style={{ borderTop: "1px solid var(--border)" }}>
            <button onClick={handleDownloadSVG}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold"
              style={{ background: "var(--bg-surface2)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download SVG
            </button>
            <button onClick={handleDownloadPNG} disabled={downloading}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold text-white"
              style={{ background: "var(--accent)", opacity: downloading ? 0.6 : 1 }}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {downloading ? "Menyiapkan..." : "Download PNG"}
            </button>
          </div>
        )}
      </div>

      {/* Panel Kanan: Preview */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 py-3 shrink-0 flex items-center gap-3"
          style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Preview Hasil</h3>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              {generating ? "Memperbarui preview..." : previewUrl ? "Auto-update saat field diisi" : "Preview muncul setelah template dipilih"}
            </p>
          </div>
          {generating && <div className="spinner shrink-0" />}
        </div>
        <div className="flex-1 overflow-auto flex items-center justify-center p-4 custom-scrollbar"
          style={{ background: "var(--bg-surface2)" }}>
          {!selected ? (
            <div className="text-center" style={{ color: "var(--text-muted)" }}>
              <svg className="w-14 h-14 mx-auto mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm">Preview Template</p>
              <p className="text-xs mt-1">Pilih template dan isi field</p>
            </div>
          ) : previewUrl ? (
            <img src={previewUrl} alt="Preview" className="max-w-full max-h-full object-contain rounded-lg shadow-sm" />
          ) : (
            <div className="text-center" style={{ color: "var(--text-muted)" }}>
              <div className="spinner mx-auto mb-2" />
              <p className="text-xs">Memuat preview...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}