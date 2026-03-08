import { useState } from "react";
import AutoFillSearch from "./AutoFillSearch";
import PhotoUpload from "./PhotoUpload";
import teskomApi, { AutoFillResult } from "../../services/teskomApi";

interface Props {
  onToast: (msg: string, type?: "success" | "error") => void;
}

type Tipe = "T" | "OT";
type Kategori = "CC_TDM" | "CC_IP" | "DARK_FIBER";

const KATEGORI_LABELS: Record<Kategori, string> = {
  CC_TDM: "Clear Channel TDM",
  CC_IP: "Clear Channel IP",
  DARK_FIBER: "Dark Fiber",
};

export default function TeskomForm({ onToast }: Props) {
  const [tipe, setTipe]           = useState<Tipe>("T");
  const [kategori, setKategori]   = useState<Kategori>("CC_IP");
  const [generating, setGenerating] = useState(false);

  const [form, setForm] = useState({
    tanggal_bai: "", nama_layanan: "", user: "", sid: "",
    bandwidth: "", peruntukan_layanan: "", no_pa: "",
    project_team: "", nama_wakil_user: "", jabatan_user: "",
    no_hp_user: "", alamat_kantor_user: "", vendor_instalasi: "",
    jarak_otdr: "", no_surat: "", tgl_surat: "",
    nama_t: "", perangkat_t: "", kanal_t: "",
    nama_o: "", perangkat_o: "", kanal_o: "",
  });

  const [photos, setPhotos] = useState<Record<string, File | File[] | null>>({
    foto_asplan: null, foto_rack_pln_t: null, foto_perangkat_pln_t: null,
    foto_label_pln_t: null, foto_rack_icp_t: null, foto_perangkat_icp_t: null,
    foto_label_icp_t: null, foto_rack_pln_o: null, foto_perangkat_pln_o: null,
    foto_label_pln_o: null, foto_rack_icp_o: null, foto_perangkat_icp_o: null,
    foto_label_icp_o: null, foto_ping: null, foto_speedtest: null,
    foto_bert: null, foto_otdr: null,
  });

  const setField = (key: string, val: string) => setForm((prev) => ({ ...prev, [key]: val }));

  const handleAutofill = (data: AutoFillResult["autofill"]) => {
    setForm((prev) => ({
      ...prev,
      no_pa:              data.no_pa || prev.no_pa,
      sid:                data.sid || prev.sid,
      user:               data.user || prev.user,
      nama_layanan:       data.nama_layanan || prev.nama_layanan,
      bandwidth:          data.bandwidth || prev.bandwidth,
      no_surat:           data.no_surat || prev.no_surat,
      vendor_instalasi:   data.vendor_instalasi || prev.vendor_instalasi,
      project_team:       data.project_team || prev.project_team,
      nama_t:             data.nama_t || prev.nama_t,
      nama_o:             data.nama_o || prev.nama_o,
      alamat_kantor_user: data.alamat_kantor_user || prev.alamat_kantor_user,
    }));
  };

  const handleGenerate = async () => {
    if (!form.no_pa) { onToast("No. PA wajib diisi", "error"); return; }
    setGenerating(true);
    try {
      const fd = new FormData();
      fd.append("tipe", tipe);
      fd.append("kategori_layanan", kategori);
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });

      // Append photos
      Object.entries(photos).forEach(([k, v]) => {
        if (!v) return;
        if (Array.isArray(v)) {
          v.forEach((f) => fd.append(k, f));
        } else {
          fd.append(k, v);
        }
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

  const InputField = ({ label, fkey, type = "text", placeholder = "" }: { label: string; fkey: string; type?: string; placeholder?: string }) => (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>{label}</label>
      <input
        type={type}
        value={(form as any)[fkey]}
        onChange={(e) => setField(fkey, e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg text-sm border transition-colors"
        style={{ background: "var(--bg-surface2)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none" }}
        onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
        onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
      />
    </div>
  );

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-xs font-bold uppercase tracking-wider pt-4 pb-2 border-t" style={{ color: "var(--accent)", borderColor: "var(--border)" }}>{children}</h3>
  );

  const FOTO_T = [
    { key: "foto_rack_pln_t",       label: "Rack PLN Terminating" },
    { key: "foto_perangkat_pln_t",  label: "Perangkat PLN Terminating" },
    { key: "foto_label_pln_t",      label: "Label PLN Terminating" },
    { key: "foto_rack_icp_t",       label: "Rack ICP Terminating" },
    { key: "foto_perangkat_icp_t",  label: "Perangkat ICP Terminating" },
    { key: "foto_label_icp_t",      label: "Label ICP Terminating" },
  ];

  const FOTO_O = [
    { key: "foto_rack_pln_o",       label: "Rack PLN Originating" },
    { key: "foto_perangkat_pln_o",  label: "Perangkat PLN Originating" },
    { key: "foto_label_pln_o",      label: "Label PLN Originating" },
    { key: "foto_rack_icp_o",       label: "Rack ICP Originating" },
    { key: "foto_perangkat_icp_o",  label: "Perangkat ICP Originating" },
    { key: "foto_label_icp_o",      label: "Label ICP Originating" },
  ];

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ color: "var(--text-primary)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-base">Form Test Commissioning</h2>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: "var(--accent)", opacity: generating ? 0.6 : 1 }}
        >
          {generating ? (
            <span className="spinner" />
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          )}
          {generating ? "Membuat dokumen..." : "Generate DOCX"}
        </button>
      </div>

      {/* Auto-fill */}
      <AutoFillSearch onAutofill={handleAutofill} onToast={onToast} />

      {/* Tipe & Kategori */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Tipe</label>
          <div className="flex gap-2">
            {(["T", "OT"] as Tipe[]).map((t) => (
              <button key={t} onClick={() => setTipe(t)}
                className="flex-1 py-2 rounded-lg text-sm font-medium border transition-all"
                style={tipe === t
                  ? { background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)" }
                  : { background: "var(--bg-surface2)", color: "var(--text-secondary)", border: "1px solid var(--border)" }
                }
              >{t === "T" ? "Terminating" : "OT (O+T)"}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Kategori Layanan</label>
          <select
            value={kategori}
            onChange={(e) => setKategori(e.target.value as Kategori)}
            className="w-full px-3 py-2 rounded-lg text-sm border"
            style={{ background: "var(--bg-surface2)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          >
            {(Object.entries(KATEGORI_LABELS) as [Kategori, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Layanan */}
      <SectionTitle>Data Layanan</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <InputField label="No. PA *" fkey="no_pa" placeholder="A121101000105" />
        <InputField label="Service ID (SID)" fkey="sid" />
        <InputField label="Nama Layanan" fkey="nama_layanan" />
        <InputField label="Bandwidth" fkey="bandwidth" placeholder="10 MBPS" />
        <InputField label="User / Pelanggan" fkey="user" />
        <InputField label="Peruntukan Layanan" fkey="peruntukan_layanan" />
        <InputField label="Tanggal BAI" fkey="tanggal_bai" type="date" />
        <InputField label="No. Surat Permohonan" fkey="no_surat" />
        <InputField label="Tanggal Surat" fkey="tgl_surat" type="date" />
        <InputField label="Vendor Instalasi" fkey="vendor_instalasi" />
        <InputField label="Project Team (PTL)" fkey="project_team" />
        {kategori === "DARK_FIBER" && <InputField label="Jarak OTDR (km)" fkey="jarak_otdr" />}
      </div>

      {/* Data User */}
      <SectionTitle>Data Perwakilan User</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <InputField label="Nama Wakil User" fkey="nama_wakil_user" />
        <InputField label="Jabatan" fkey="jabatan_user" />
        <InputField label="No. HP" fkey="no_hp_user" />
        <InputField label="Alamat Kantor" fkey="alamat_kantor_user" />
      </div>

      {/* Data Lokasi Terminating */}
      <SectionTitle>Lokasi Terminating</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <InputField label="Nama Lokasi T" fkey="nama_t" />
        <InputField label="Perangkat T" fkey="perangkat_t" />
        <InputField label="Kanal T" fkey="kanal_t" />
      </div>

      {/* Data Lokasi Originating (hanya OT) */}
      {tipe === "OT" && (
        <>
          <SectionTitle>Lokasi Originating</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <InputField label="Nama Lokasi O" fkey="nama_o" />
            <InputField label="Perangkat O" fkey="perangkat_o" />
            <InputField label="Kanal O" fkey="kanal_o" />
          </div>
        </>
      )}

      {/* Foto As-Plan */}
      <SectionTitle>Foto As-Plan</SectionTitle>
      <PhotoUpload
        slots={[{ key: "foto_asplan", label: "Foto As-Plan (bisa multiple)", multiple: true }]}
        files={photos}
        onChange={(k, v) => setPhotos((p) => ({ ...p, [k]: v }))}
      />

      {/* Foto Dokumentasi Terminating */}
      <SectionTitle>Foto Dokumentasi Terminating</SectionTitle>
      <PhotoUpload slots={FOTO_T} files={photos} onChange={(k, v) => setPhotos((p) => ({ ...p, [k]: v }))} />

      {/* Foto Dokumentasi Originating */}
      {tipe === "OT" && (
        <>
          <SectionTitle>Foto Dokumentasi Originating</SectionTitle>
          <PhotoUpload slots={FOTO_O} files={photos} onChange={(k, v) => setPhotos((p) => ({ ...p, [k]: v }))} />
        </>
      )}

      {/* Foto Hasil Test */}
      <SectionTitle>Foto Hasil Test</SectionTitle>
      {kategori === "CC_TDM" && (
        <PhotoUpload
          slots={[{ key: "foto_bert", label: "Foto BERT (bisa multiple)", multiple: true }]}
          files={photos}
          onChange={(k, v) => setPhotos((p) => ({ ...p, [k]: v }))}
        />
      )}
      {kategori === "CC_IP" && (
        <PhotoUpload
          slots={[{ key: "foto_ping", label: "Foto Ping" }, { key: "foto_speedtest", label: "Foto Speedtest" }]}
          files={photos}
          onChange={(k, v) => setPhotos((p) => ({ ...p, [k]: v }))}
        />
      )}
      {kategori === "DARK_FIBER" && (
        <PhotoUpload
          slots={[{ key: "foto_otdr", label: "Foto OTDR (bisa multiple)", multiple: true }]}
          files={photos}
          onChange={(k, v) => setPhotos((p) => ({ ...p, [k]: v }))}
        />
      )}

      <div className="pb-8" />
    </div>
  );
}
