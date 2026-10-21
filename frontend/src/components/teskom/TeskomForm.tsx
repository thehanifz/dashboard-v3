// frontend/src/components/teskom/TeskomForm.tsx
import { useState, useCallback, useEffect, useRef } from "react";
import AutoFillSearch from "./AutoFillSearch";
import PhotoUpload from "./PhotoUpload";
import FormFields from "./forms/FormFields";
import { FORM_REGISTRY, Tipe } from "./formRegistry";
import teskomApi, { AutoFillResult, autofillFromCache } from "../../services/teskomApi";
import { useAppStore } from "../../state/appStore";
import { useAuthStore } from "../../state/authStore";
import { getScoped, setScoped, delScoped } from "../../services/cacheStore";
import { getCurrentCacheScope } from "../../services/cacheScope";

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
const INITIAL_FORM: Record<string, string> = {
  tanggal_bai: "", nama_layanan: "", user: "", sid: "",
  bandwidth: "", peruntukan_layanan: "", no_pa: "",
  project_team: "", nama_wakil_user: "", jabatan_user: "",
  no_hp_user: "", alamat_kantor_user: "", vendor_instalasi: "",
  jarak_otdr: "", no_surat: "", tgl_surat: "",
  nama_t: "", perangkat_t: "", kanal_t: "",
  nama_o: "", perangkat_o: "", kanal_o: "",
};
const INITIAL_PHOTOS: Record<string, File | File[] | null> = {
  foto_asplan: null,
  foto_rack_pln_t: null, foto_perangkat_pln_t: null, foto_label_pln_t: null,
  foto_rack_icp_t: null, foto_perangkat_icp_t: null, foto_label_icp_t: null,
  foto_rack_pln_o: null, foto_perangkat_pln_o: null, foto_label_pln_o: null,
  foto_rack_icp_o: null, foto_perangkat_icp_o: null, foto_label_icp_o: null,
  foto_ping: null, foto_speedtest: null, foto_bert: null, foto_otdr: null,
};

interface TeskomDraft {
  kategori: string;
  tipe: Tipe;
  form: Record<string, string>;
  showWakil: boolean;
}

const DRAFT_KEY = "teskom-form-draft-v1";
const DRAFT_PHOTOS_KEY = "teskom-form-photos-v1";

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
  const [draftReady, setDraftReady] = useState(false);
  const [draftTouched, setDraftTouched] = useState(false);
  const [draftStatus, setDraftStatus] = useState("Memulihkan draft...");
  const [resetKey, setResetKey] = useState(0);
  const [showWakil, setShowWakil] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const draftRevision = useRef(0);

  // Role-aware autofill: ptl → autofillPtl, engineer/mitra → autofill
  const { user } = useAuthStore();
  const isPtl    = user?.role === "ptl";

  // Autofill dari tabel dashboard (deep-link)
  const teskomAutofillId     = useAppStore((s) => s.teskomAutofillId);
  const teskomAutofillData   = useAppStore((s) => s.teskomAutofillData);
  const teskomAutofillSource = useAppStore((s) => s.teskomAutofillSource);
  const setTeskomAutofill    = useAppStore((s) => s.setTeskomAutofill);

  const supportedTipe = FORM_REGISTRY[kategori]?.supportedTipe ?? ["T", "OT"];
  const activeTipe: Tipe = supportedTipe.includes(tipe) ? tipe : FORM_REGISTRY[kategori].defaultTipe;

  const [form, setFormState] = useState<Record<string, string>>(INITIAL_FORM);
  const [photos, setPhotos] = useState<Record<string, File | File[] | null>>(INITIAL_PHOTOS);

  // IndexedDB can retain File objects, so selected photos survive navigation and reload too.
  useEffect(() => {
    let cancelled = false;
    const scope = getCurrentCacheScope();
    if (!scope) {
      setDraftStatus("Draft tidak tersedia");
      setDraftReady(true);
      return () => { cancelled = true; };
    }

    void Promise.all([
      getScoped<TeskomDraft>(DRAFT_KEY, scope),
      getScoped<Record<string, File | File[] | null>>(DRAFT_PHOTOS_KEY, scope),
    ]).then(([draft, savedPhotos]) => {
      if (cancelled) return;
      if (draft) {
        setKategori(FORM_REGISTRY[draft.kategori] ? draft.kategori : initialKategori);
        setTipe(draft.tipe === "T" || draft.tipe === "OT" ? draft.tipe : FORM_REGISTRY[initialKategori].defaultTipe);
        setFormState({ ...INITIAL_FORM, ...draft.form });
        setShowWakil(draft.showWakil === true);
        setDraftTouched(true);
        setDraftStatus("Draft dipulihkan");
      } else {
        setDraftStatus("Draft belum dibuat");
      }
      if (savedPhotos) {
        setPhotos({ ...INITIAL_PHOTOS, ...savedPhotos });
        setDraftTouched(true);
        setDraftStatus("Draft dipulihkan");
      }
      setDraftReady(true);
    }).catch(() => {
      if (cancelled) return;
      setDraftStatus("Draft tidak dapat dibaca");
      setDraftReady(true);
    });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!draftReady || !draftTouched) return;
    const scope = getCurrentCacheScope();
    if (!scope) return;
    const revision = ++draftRevision.current;
    setDraftStatus("Menyimpan draft...");
    void setScoped<TeskomDraft>(DRAFT_KEY, scope, { kategori, tipe: activeTipe, form, showWakil })
      .then(() => {
        if (draftRevision.current === revision) setDraftStatus("Draft tersimpan otomatis");
      })
      .catch(() => {
        if (draftRevision.current === revision) setDraftStatus("Gagal menyimpan draft");
      });
  }, [draftReady, draftTouched, kategori, activeTipe, form, showWakil]);

  useEffect(() => {
    if (!draftReady || !draftTouched) return;
    const scope = getCurrentCacheScope();
    if (!scope) return;
    void setScoped(DRAFT_PHOTOS_KEY, scope, photos).catch(() => {
      setDraftStatus("Gagal menyimpan foto draft");
    });
  }, [draftReady, draftTouched, photos]);

  const setField = useCallback((key: string, val: string) => {
    setDraftTouched(true);
    setFormState((p) => ({ ...p, [key]: val }));
  }, []);

  const onPhotoChange = useCallback((key: string, val: File | File[] | null) => {
    setDraftTouched(true);
    setPhotos((p) => ({ ...p, [key]: val }));
  }, []);

  const handleKategoriChange = (newKategori: string) => {
    setDraftTouched(true);
    setKategori(newKategori);
    setTipe(FORM_REGISTRY[newKategori].defaultTipe);
  };

  const clearStoredDraft = async () => {
    const scope = getCurrentCacheScope();
    if (!scope) return true;
    try {
      await Promise.all([
        delScoped(DRAFT_KEY, scope),
        delScoped(DRAFT_PHOTOS_KEY, scope),
      ]);
      return true;
    } catch {
      return false;
    }
  };

  const resetForm = () => {
    draftRevision.current += 1;
    setDraftTouched(false);
    setKategori(initialKategori);
    setTipe(FORM_REGISTRY[initialKategori].defaultTipe);
    setFormState(INITIAL_FORM);
    setPhotos(INITIAL_PHOTOS);
    setShowWakil(false);
    setActiveTab(TABS[0].id);
    setResetKey((current) => current + 1);
    setDraftStatus("Draft direset");
  };

  const resetDraft = async () => {
    if (!(await clearStoredDraft())) {
      onToast("Draft gagal dihapus dari penyimpanan", "error");
      return;
    }
    resetForm();
  };

  const handleAutofill = useCallback((data: AutoFillResult["autofill"]) => {
    setDraftTouched(true);
    setFormState((prev) => ({
      ...prev,
      no_pa:            data.no_pa            ?? "",
      sid:              data.sid              ?? "",
      user:             data.user             ?? "",
      nama_layanan:     data.nama_layanan     ?? "",
      bandwidth:        data.bandwidth        ?? "",
      no_surat:         data.no_surat         ?? "",
      vendor_instalasi: data.vendor_instalasi ?? "",
      project_team:     data.project_team     ?? "",
      nama_t:           data.nama_t           ?? "",
      nama_o:           data.nama_o           ?? "",
      // alamat_kantor_user sengaja tidak diisi dari autofill
    }));
  }, []);

  // ── Autofill berdasarkan role saat halaman dibuka dari tabel ──
  useEffect(() => {
    if (!draftReady || !teskomAutofillId) return;

    let cancelled = false;
    const idPa = teskomAutofillId;
    const cachedData = teskomAutofillData;
    const cachedSource = teskomAutofillSource;

    // Reset store state agar tidak terpanggil ganda
    setTeskomAutofill(null);

    const applyAutofill = async () => {
      // 1. Coba dari cache lokal row tabel terlebih dahulu
      if (cachedData) {
        try {
          const result = autofillFromCache(cachedData, cachedSource || (isPtl ? "ptl" : "records"));
          if (!cancelled) {
            handleAutofill(result.autofill);
            onToast(`Data "${idPa}" berhasil dimuat dari tabel`, "success");
            return;
          }
        } catch {
          // fallback ke API call di bawah
        }
      }

      // 2. Fallback: panggil API autofill persis seperti AutoFillSearch
      try {
        const result = isPtl
          ? await teskomApi.autofillPtl(idPa)
          : await teskomApi.autofill(idPa, "TERMINATING");

        if (!cancelled) {
          handleAutofill(result.autofill);
          onToast(`Data "${idPa}" berhasil dimuat`, "success");
        }
      } catch (err: any) {
        if (!cancelled) {
          const msg = err?.response?.data?.detail || `Data "${idPa}" tidak dapat dimuat`;
          onToast(msg, "error");
        }
      }
    };

    void applyAutofill();

    return () => {
      cancelled = true;
    };
  }, [draftReady, teskomAutofillId, teskomAutofillData, teskomAutofillSource, isPtl, handleAutofill, setTeskomAutofill, onToast]);

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

  if (!draftReady) {
    return (
      <div className="flex h-full items-center justify-center text-sm" style={{ color: "var(--text-muted)" }}>
        Memulihkan draft Teskom...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ color: "var(--text-primary)" }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div>
          <h2 className="font-bold text-base">Form Test Commissioning</h2>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
            {isPtl ? "Sumber data: GSheet PTL" : "Sumber data: database"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-[11px]" style={{ color: "var(--text-muted)" }}>{draftStatus}</span>
          <button onClick={() => void resetDraft()} disabled={generating}
            className="px-3 py-2 rounded-lg text-xs font-semibold border"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)", opacity: generating ? 0.6 : 1 }}>
            Reset
          </button>
          <button onClick={handleGenerate} disabled={generating}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: "var(--accent)", opacity: generating ? 0.6 : 1 }}>
            {generating ? "Membuat dokumen..." : "Generate DOCX"}
          </button>
        </div>
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
          <AutoFillSearch key={resetKey} onAutofill={handleAutofill} onToast={onToast} />
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
          <FormFields key={resetKey} form={form} setField={setField} tipe={activeTipe}
            showWakil={showWakil} onShowWakilChange={setShowWakil} onToast={onToast} />
        </div>

        {/* Section 3: Dokumentasi */}
        <div id="section-dokumentasi">
          <Divider label="Foto As-Plan" />
          <PhotoUpload
            key={`asplan-${resetKey}`}
            slots={[{ key: "foto_asplan", label: "Foto As-Plan (bisa multiple)", multiple: true }]}
            files={photos} onChange={onPhotoChange} cols={3}
          />

          <Divider label={judulT} />
          <PhotoUpload key={`foto-t-${resetKey}`} slots={FOTO_T} files={photos} onChange={onPhotoChange} cols={3} />

          {activeTipe === "OT" && (
            <>
              <Divider label={judulO} />
              <PhotoUpload key={`foto-o-${resetKey}`} slots={FOTO_O} files={photos} onChange={onPhotoChange} cols={3} />
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
