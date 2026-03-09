// frontend/src/components/teskom/TeskomForm.tsx  ✏️ MODIFIED
import { useState, useCallback, useEffect, useRef } from "react";
import AutoFillSearch from "./AutoFillSearch";
import PhotoUpload from "./PhotoUpload";
import FormFields from "./forms/FormFields";
import { FORM_REGISTRY, Tipe } from "./formRegistry";
import teskomApi, { AutoFillResult } from "../../services/teskomApi";

interface Props {
  onToast: (msg: string, type?: "success" | "error") => void;
}

const TABS = [
  { id: "section-layanan",     label: "Layanan" },
  { id: "section-info",        label: "Info Umum" },
  { id: "section-dokumentasi", label: "Dokumentasi" },
  { id: "section-hasil",       label: "Hasil Test" },
];

const kategoriList = Object.entries(FORM_REGISTRY);
const initialKategori = kategoriList[0][0];

// Divider bergaya eksisting
const Divider = ({ label }: { label: string }) => (
  <div className="flex items-center gap-3 my-4">
    <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
    <span className="text-xs font-semibold uppercase tracking-wider shrink-0"
      style={{ color: "var(--accent)" }}>
      {label}
    </span>
    <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
  </div>
);

export default function TeskomForm({ onToast }: Props) {
  const [kategori, setKategori]     = useState(initialKategori);
  const [tipe, setTipe]             = useState<Tipe>(FORM_REGISTRY[initialKategori].defaultTipe);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab]   = useState(TABS[0].id);
  const scrollRef = useRef<HTMLDivElement>(null);

  const supportedTipe = FORM_REGISTRY[kategori]?.supportedTipe ?? ["T", "OT"];
  const activeTipe: Tipe = supportedTipe.includes(tipe) ? tipe : FORM_REGISTRY[kategori].defaultTipe;

  const [form, setFormState] = useState<Record<string, string>>({
    tanggal_bai: "", nama_layanan: "", user: "", sid: "",
    bandwidth: "", peruntukan_layanan: "", no_pa: "",
    project_team: "", nama_wakil_user: "", jabatan_user: "",
    no_hp_user: "", alamat_kantor_user: "", vendor_instalasi: "",
    jarak_otdr: "", no_surat: "", tgl_surat: "",
    nama_t: "", perangkat_t: "", kanal_t: "",
    nama_o: "", perangkat_o: "", kanal_o: "",
  });

  const [photos, setPhotos] = useState<Record<string, File | File[] | null>>({
    foto_asplan: null,
    foto_rack_pln_t: null, foto_perangkat_pln_t: null, foto_label_pln_t: null,
    foto_rack_icp_t: null, foto_perangkat_icp_t: null, foto_label_icp_t: null,
    foto_rack_pln_o: null, foto_perangkat_pln_o: null, foto_label_pln_o: null,
    foto_rack_icp_o: null, foto_perangkat_icp_o: null, foto_label_icp_o: null,
    foto_ping: null, foto_speedtest: null, foto_bert: null, foto_otdr: null,
  });

  const setField = useCallback((key: string, val: string) =>
    setFormState((p) => ({ ...p, [key]: val })), []);

  const onPhotoChange = useCallback((key: string, val: File | File[] | null) =>
    setPhotos((p) => ({ ...p, [key]: val })), []);

  const handleKategoriChange = (newKategori: string) => {
    setKategori(newKategori);
    setTipe(FORM_REGISTRY[newKategori].defaultTipe);
  };

  // Fix #1 — alamat_kantor_user tidak ikut autofill
  const handleAutofill = useCallback((data: AutoFillResult["autofill"]) => {
    setFormState((prev) => ({
      ...prev,
      no_pa:            data.no_pa            || prev.no_pa,
      sid:              data.sid              || prev.sid,
      user:             data.user             || prev.user,
      nama_layanan:     data.nama_layanan     || prev.nama_layanan,
      bandwidth:        data.bandwidth        || prev.bandwidth,
      no_surat:         data.no_surat         || prev.no_surat,
      vendor_instalasi: data.vendor_instalasi || prev.vendor_instalasi,
      project_team:     data.project_team     || prev.project_team,
      nama_t:           data.nama_t           || prev.nama_t,
      nama_o:           data.nama_o           || prev.nama_o,
      // alamat_kantor_user sengaja tidak diisi dari autofill
    }));
  }, []);

  // IntersectionObserver — tab aktif ikut scroll
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveTab(entry.target.id);
        });
      },
      { root: container, threshold: 0.2 }
    );
    TABS.forEach(({ id }) => {
      const el = container.querySelector(`#${id}`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    const container = scrollRef.current;
    const el = container?.querySelector(`#${id}`) as HTMLElement | null;
    if (el && container) container.scrollTo({ top: el.offsetTop - 8, behavior: "smooth" });
  };

  const handleGenerate = async () => {
    if (!form.no_pa) { onToast("No. PA wajib diisi", "error"); return; }
    setGenerating(true);
    try {
      const fd = new FormData();
      fd.append("tipe", activeTipe);
      fd.append("kategori_layanan", kategori);
      Object.entries(form).forEach(([k, v]) => {
        if (k === "nama_wakil_user") {
          fd.append(k, v.trim() || " ".repeat(15));
        } else if (v) {
          fd.append(k, v);
        }
      });
      Object.entries(photos).forEach(([k, v]) => {
        if (!v) return;
        if (Array.isArray(v)) v.forEach((f) => fd.append(k, f));
        else fd.append(k, v);
      });
      const blob = await teskomApi.generateDoc(fd);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `BAI_BATC_${(form.no_pa || "dokumen").replace(/\//g, "-")}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      onToast("Dokumen berhasil digenerate!", "success");
    } catch (err: any) {
      onToast(err?.response?.data?.detail || "Gagal generate dokumen", "error");
    } finally {
      setGenerating(false);
    }
  };

  // Fix #3 — judul dokumentasi dinamis dari nama lokasi
  const judulT = form.nama_t ? `Dokumentasi Termi (${form.nama_t})` : "Foto Dokumentasi Terminating";
  const judulO = form.nama_o ? `Dokumentasi Ori (${form.nama_o})`   : "Foto Dokumentasi Originating";

  const FOTO_T = [
    { key: "foto_rack_pln_t",      label: "Rack PLN" },
    { key: "foto_perangkat_pln_t", label: "Perangkat PLN" },
    { key: "foto_label_pln_t",     label: "Label PLN" },
    { key: "foto_rack_icp_t",      label: "Rack ICP" },
    { key: "foto_perangkat_icp_t", label: "Perangkat ICP" },
    { key: "foto_label_icp_t",     label: "Label ICP" },
  ];
  const FOTO_O = [
    { key: "foto_rack_pln_o",      label: "Rack PLN" },
    { key: "foto_perangkat_pln_o", label: "Perangkat PLN" },
    { key: "foto_label_pln_o",     label: "Label PLN" },
    { key: "foto_rack_icp_o",      label: "Rack ICP" },
    { key: "foto_perangkat_icp_o", label: "Perangkat ICP" },
    { key: "foto_label_icp_o",     label: "Label ICP" },
  ];

  const SpecificForm = FORM_REGISTRY[kategori]?.component;

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ color: "var(--text-primary)" }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h2 className="font-bold text-base">Form Test Commissioning</h2>
        <button onClick={handleGenerate} disabled={generating}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: "var(--accent)", opacity: generating ? 0.6 : 1 }}>
          {generating ? "Membuat dokumen..." : "Generate DOCX"}
        </button>
      </div>

      {/* ── Sticky Tabs ── */}
      <div className="flex gap-1 mb-3 shrink-0 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => scrollToSection(tab.id)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all"
            style={activeTab === tab.id
              ? { background: "var(--accent)", color: "#fff" }
              : { background: "var(--bg-surface2)", color: "var(--text-secondary)", border: "1px solid var(--border)" }
            }>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Scrollable Content ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto pr-1">

        {/* Section 1: Layanan */}
        <div id="section-layanan">
          <AutoFillSearch onAutofill={handleAutofill} onToast={onToast} />
          <div className="grid grid-cols-2 gap-4 mb-2">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                Kategori Layanan
              </label>
              <select value={kategori} onChange={(e) => handleKategoriChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm border"
                style={{ background: "var(--bg-surface2)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
                {kategoriList.map(([key, entry]) => (
                  <option key={key} value={key}>{entry.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Tipe</label>
              <div className="flex gap-2">
                {(["T", "OT"] as Tipe[]).map((t) => {
                  const disabled = !supportedTipe.includes(t);
                  return (
                    <button key={t} onClick={() => !disabled && setTipe(t)} disabled={disabled}
                      className="flex-1 py-2 rounded-lg text-sm font-medium border transition-all"
                      style={activeTipe === t
                        ? { background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)" }
                        : { background: "var(--bg-surface2)", color: disabled ? "var(--text-muted)" : "var(--text-secondary)",
                            border: "1px solid var(--border)", opacity: disabled ? 0.4 : 1,
                            cursor: disabled ? "not-allowed" : "pointer" }
                      }>
                      {t === "T" ? "Terminating" : "OT (O+T)"}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Info Umum */}
        <div id="section-info">
          <Divider label="Info Umum" />
          <FormFields form={form} setField={setField} tipe={activeTipe} />
        </div>

        {/* Section 3: Dokumentasi */}
        <div id="section-dokumentasi">
          <Divider label="Foto As-Plan" />
          <PhotoUpload
            slots={[{ key: "foto_asplan", label: "Foto As-Plan (bisa multiple)", multiple: true }]}
            files={photos} onChange={onPhotoChange} cols={3}
          />

          {/* Fix #3 — judul dinamis dari nama lokasi */}
          <Divider label={judulT} />
          <PhotoUpload slots={FOTO_T} files={photos} onChange={onPhotoChange} cols={3} />

          {activeTipe === "OT" && (
            <>
              <Divider label={judulO} />
              <PhotoUpload slots={FOTO_O} files={photos} onChange={onPhotoChange} cols={3} />
            </>
          )}
        </div>

        {/* Section 4: Hasil Test */}
        <div id="section-hasil">
          <Divider label="Foto Hasil Test" />
          {SpecificForm && (
            <SpecificForm
              photos={photos}
              onPhotoChange={onPhotoChange}
              form={form}
              setField={setField}
            />
          )}
        </div>

        <div className="pb-8" />
      </div>
    </div>
  );
}