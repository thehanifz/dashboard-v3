/**
 * TopologyDiagramGenerator.tsx
 * Split panel: kiri = form config, kanan = auto canvas
 * - Slider maxCols: nilai genap saja (2,4,6,8,10,12)
 * - Slider maxRows, gapY, gapX: tetap bisa custom
 * - Urutan slider: Max Kolom → Max Baris → Gap Vertikal → Gap Horizontal
 */
import { useState, useRef, useEffect } from "react";
import { renderTopology, downloadSvgAsPng, type TopologyInput } from "../../utils/svgTopologyRenderer";

const ICON_PC     = "/icons/icon_pc.png";
const ICON_ROUTER = "/icons/icon_router.png";

interface Props {
  onToast: (msg: string, type?: "success" | "error") => void;
}

function parseCSV(str: string): string[] {
  return str.split(",").map((s) => s.trim()).filter(Boolean);
}

// ── Sub-komponen di LUAR agar tidak re-mount ──────────────────────────────────

function Slider({ label, value, onChange, min, max }: {
  label: string; value: number; onChange: (v: number) => void; min: number; max: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{label}</span>
        <span className="text-[11px] font-bold px-1.5 py-0.5 rounded"
          style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>{value}</span>
      </div>
      <input
        type="range" min={min} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full cursor-pointer"
        style={{ accentColor: "var(--accent)" }}
      />
    </div>
  );
}

// Slider khusus nilai GENAP 2-12 (tanpa tick mark)
const EVEN_VALUES = [2, 4, 6, 8, 10, 12];
function SliderEven({ label, value, onChange }: {
  label: string; value: number; onChange: (v: number) => void;
}) {
  let idx = EVEN_VALUES.indexOf(value);
  if (idx < 0) idx = EVEN_VALUES.reduce((best, v, i) => Math.abs(v - value) < Math.abs(EVEN_VALUES[best] - value) ? i : best, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{label}</span>
        <span className="text-[11px] font-bold px-1.5 py-0.5 rounded"
          style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>{EVEN_VALUES[idx]}</span>
      </div>
      <input
        type="range" min={0} max={EVEN_VALUES.length - 1} value={idx} step={1}
        onChange={(e) => onChange(EVEN_VALUES[Number(e.target.value)])}
        className="w-full h-1.5 rounded-full cursor-pointer"
        style={{ accentColor: "var(--accent)" }}
      />
    </div>
  );
}

function TextInput({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <div>
      <label className="block text-[11px] font-medium mb-1"
        style={{ color: "var(--text-secondary)" }}>{label}</label>
      <input
        type="text" value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2.5 py-1.5 rounded-lg text-xs border"
        style={{ background: "var(--bg-surface2)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none" }}
        onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
        onBlur={(e)  => (e.target.style.borderColor = "var(--border)")}
      />
    </div>
  );
}

function TextArea({ label, hint, value, onChange, placeholder, rows }: {
  label: string; hint?: string; value: string; onChange: (v: string) => void;
  placeholder: string; rows: number;
}) {
  return (
    <div>
      <label className="block text-[11px] font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
        {label}
        {hint && <span className="ml-1 font-normal" style={{ color: "var(--text-muted)" }}>{hint}</span>}
      </label>
      <textarea
        value={value} placeholder={placeholder} rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2.5 py-1.5 rounded-lg text-xs border resize-none"
        style={{ background: "var(--bg-surface2)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none" }}
        onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
        onBlur={(e)  => (e.target.style.borderColor = "var(--border)")}
      />
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function TopologyDiagramGenerator({ onToast }: Props) {
  const [title,          setTitle]          = useState("TOPOLOGI JARINGAN");
  const [serviceName,    setServiceName]    = useState("");
  const [locOri,         setLocOri]         = useState("");
  const [locTermi,       setLocTermi]       = useState("");
  const [mainNodesCSV,   setMainNodesCSV]   = useState("");
  const [backupNodesCSV, setBackupNodesCSV] = useState("");
  const [mode,           setMode]           = useState<"ring" | "linear">("linear");
  const [maxCols,        setMaxCols]        = useState(8);
  const maxRows = 1;
  const [gapY,           setGapY]           = useState(100);
  const [gapX,           setGapX]           = useState(120);
  const [hasContent,     setHasContent]     = useState(false);
  const [downloading,    setDownloading]    = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ref selalu up-to-date tanpa masuk dependency useEffect
  const stateRef = useRef({ title, serviceName, locOri, locTermi, mainNodesCSV, backupNodesCSV, mode, maxCols, gapY, gapX });
  stateRef.current = { title, serviceName, locOri, locTermi, mainNodesCSV, backupNodesCSV, mode, maxCols, gapY, gapX };

  const triggerRender = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const s = stateRef.current;
      const input: TopologyInput = {
        title:       s.title,
        serviceName: s.serviceName,
        locOri:      s.locOri,
        locTermi:    s.locTermi,
        mainNodes:   parseCSV(s.mainNodesCSV),
        backupNodes: parseCSV(s.backupNodesCSV),
        mode:        s.mode,
        config: { maxCols: s.maxCols, maxRows: s.maxRows, gapX: s.gapX, gapY: s.gapY },
      };
      if (input.mainNodes.length < 2) return;
      if (canvasRef.current) {
        renderTopology(input, canvasRef.current, ICON_PC, ICON_ROUTER);
        setHasContent(true);
      }
    }, 150);
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  // Wrapper set: update state + trigger render
  const set = {
    title:          (v: string)          => { setTitle(v);          triggerRender(); },
    serviceName:    (v: string)          => { setServiceName(v);    triggerRender(); },
    locOri:         (v: string)          => { setLocOri(v);         triggerRender(); },
    locTermi:       (v: string)          => { setLocTermi(v);       triggerRender(); },
    mainNodesCSV:   (v: string)          => { setMainNodesCSV(v);   triggerRender(); },
    backupNodesCSV: (v: string)          => { setBackupNodesCSV(v); triggerRender(); },
    mode:           (v: "ring"|"linear") => { setMode(v);           triggerRender(); },
    maxCols:        (v: number)          => { setMaxCols(v);        triggerRender(); },
    gapY:           (v: number)          => { setGapY(v);           triggerRender(); },
    gapX:           (v: number)          => { setGapX(v);           triggerRender(); },
  };

  const handleDownload = async () => {
    const svgEl = canvasRef.current?.querySelector("svg") as SVGSVGElement | null;
    if (!svgEl) { onToast("Isi minimal 2 main node untuk generate diagram", "error"); return; }
    setDownloading(true);
    try {
      await downloadSvgAsPng(svgEl, `Topologi_${serviceName || "Network"}.png`);
    } catch {
      onToast("Gagal download PNG", "error");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex h-full gap-0 overflow-hidden">

      {/* ── Panel Kiri ── */}
      <div className="w-72 shrink-0 flex flex-col overflow-hidden"
        style={{ borderRight: "1px solid var(--border)" }}>

        <div className="px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Topology Generator</h2>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>Generate diagram jaringan dari node</p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-3 space-y-4">

          {/* Info Diagram */}
          <section className="space-y-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Info Diagram</p>
            <TextInput label="Judul"             value={title}       onChange={set.title}       placeholder="TOPOLOGI JARINGAN" />
            <TextInput label="Nama Layanan"       value={serviceName} onChange={set.serviceName} placeholder="SCADA 104" />
            <TextInput label="Lokasi Originating" value={locOri}      onChange={set.locOri}      placeholder="GITET GANDUL" />
            <TextInput label="Lokasi Terminating" value={locTermi}    onChange={set.locTermi}    placeholder="GITET SAGULING" />
          </section>

          {/* Mode Toggle */}
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Mode Topologi</p>
            <div className="flex items-center gap-3">
              <span className="text-xs" style={{ color: mode === "linear" ? "var(--accent)" : "var(--text-muted)" }}>Linear</span>
              <button
                onClick={() => set.mode(mode === "ring" ? "linear" : "ring")}
                className="relative w-10 h-5 rounded-full transition-colors shrink-0"
                style={{ background: mode === "ring" ? "var(--accent)" : "var(--border)" }}
              >
                <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                  style={{ left: mode === "ring" ? "calc(100% - 18px)" : "2px" }} />
              </button>
              <span className="text-xs" style={{ color: mode === "ring" ? "var(--accent)" : "var(--text-muted)" }}>Ring</span>
            </div>
          </section>

          {/* Node Input */}
          <section className="space-y-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Node Input</p>
            <TextArea label="Main Nodes" hint="(pisahkan koma, min 2)"
              value={mainNodesCSV} onChange={set.mainNodesCSV}
              placeholder="CIBATU, TASIK, GARUT, CIAMIS" rows={3} />
            {mode === "ring" && (
              <TextArea label="Backup Nodes" hint="(ring mode)"
                value={backupNodesCSV} onChange={set.backupNodesCSV}
                placeholder="BANJAR, MAJENAYA" rows={2} />
            )}
          </section>

          {/* Layout Config */}
          <section className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Layout Config</p>
            <SliderEven label="Max Kolom"           value={maxCols} onChange={set.maxCols} />
            <Slider     label="Gap Vertikal (px)"   value={gapY}    onChange={set.gapY}    min={50} max={250} />
            <Slider     label="Gap Horizontal (px)" value={gapX}    onChange={set.gapX}    min={50} max={250} />
          </section>
        </div>

        {/* Download */}
        <div className="px-4 py-3 shrink-0" style={{ borderTop: "1px solid var(--border)" }}>
          <button
            onClick={handleDownload}
            disabled={downloading || !hasContent}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold text-white transition-opacity"
            style={{ background: "var(--accent)", opacity: downloading || !hasContent ? 0.5 : 1 }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {downloading ? "Menyiapkan PNG..." : "Download PNG"}
          </button>
        </div>
      </div>

      {/* ── Panel Kanan: Canvas ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Canvas Topologi</h3>
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            {hasContent ? "Auto-update saat input berubah" : "Isi minimal 2 main node untuk generate"}
          </p>
        </div>

        <div className="flex-1 overflow-auto flex items-center justify-center custom-scrollbar"
          style={{ background: "var(--bg-surface2)" }}>
          {!hasContent && (
            <div className="text-center pointer-events-none" style={{ color: "var(--text-muted)" }}>
              <svg className="w-14 h-14 mx-auto mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                  d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
              </svg>
              <p className="text-sm">Canvas Topologi</p>
              <p className="text-xs mt-1">Isi form di kiri untuk mulai</p>
            </div>
          )}
          <div ref={canvasRef} className={hasContent ? "w-full h-full p-2" : "hidden"} />
        </div>
      </div>
    </div>
  );
}