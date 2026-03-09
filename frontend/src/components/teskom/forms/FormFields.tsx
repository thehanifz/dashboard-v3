// frontend/src/components/teskom/forms/FormFields.tsx  ✏️ MODIFIED
import { memo, useState } from "react";

interface Props {
  form: Record<string, string>;
  setField: (key: string, val: string) => void;
  tipe: string;
}

const InputField = memo(({ label, value, onChange, type = "text", placeholder = "" }: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  type?: string;
  placeholder?: string;
}) => (
  <div>
    <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 rounded-lg text-sm border transition-colors"
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
));

// Divider bergaya eksisting — garis dengan label di tengah
const Divider = ({ label }: { label: string }) => (
  <div className="flex items-center gap-3 my-4">
    <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
    <span className="text-xs font-semibold uppercase tracking-wider shrink-0"
      style={{ color: "var(--text-muted)" }}>
      {label}
    </span>
    <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
  </div>
);

export default memo(function FormFields({ form, setField, tipe }: Props) {
  const [showWakil, setShowWakil] = useState(false);

  return (
    <>
      {/* ── Data Layanan ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <InputField label="No. PA *"           value={form.no_pa}              onChange={(v) => setField("no_pa", v)}              placeholder="A121101000105" />
        <InputField label="Service ID (SID)"   value={form.sid}                onChange={(v) => setField("sid", v)} />
        <InputField label="Nama Layanan"       value={form.nama_layanan}       onChange={(v) => setField("nama_layanan", v)} />
        <InputField label="Bandwidth"          value={form.bandwidth}          onChange={(v) => setField("bandwidth", v)}          placeholder="10 MBPS" />
        <InputField label="User / Pelanggan"   value={form.user}               onChange={(v) => setField("user", v)} />
        <InputField label="Peruntukan Layanan" value={form.peruntukan_layanan} onChange={(v) => setField("peruntukan_layanan", v)} />
        <InputField label="Tanggal BAI"        value={form.tanggal_bai}        onChange={(v) => setField("tanggal_bai", v)}        type="date" />
        <InputField label="No. Surat"          value={form.no_surat}           onChange={(v) => setField("no_surat", v)} />
        <InputField label="Tanggal Surat"      value={form.tgl_surat}          onChange={(v) => setField("tgl_surat", v)}          type="date" />
        <InputField label="Vendor Instalasi"   value={form.vendor_instalasi}   onChange={(v) => setField("vendor_instalasi", v)} />
        <InputField label="Project Team (PTL)" value={form.project_team}       onChange={(v) => setField("project_team", v)} />
        <InputField label="Jarak OTDR"         value={form.jarak_otdr}         onChange={(v) => setField("jarak_otdr", v)}         placeholder="1250 m" />
      </div>

      {/* ── Lokasi Terminating ── */}
      <Divider label="Lokasi Terminating" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <InputField label="Nama Lokasi T" value={form.nama_t}      onChange={(v) => setField("nama_t", v)} />
        <InputField label="Perangkat T"   value={form.perangkat_t} onChange={(v) => setField("perangkat_t", v)} />
        <InputField label="Kanal T"       value={form.kanal_t}     onChange={(v) => setField("kanal_t", v)} />
      </div>

      {/* ── Lokasi Originating (OT only) ── */}
      {tipe === "OT" && (
        <>
          <Divider label="Lokasi Originating" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <InputField label="Nama Lokasi O" value={form.nama_o}      onChange={(v) => setField("nama_o", v)} />
            <InputField label="Perangkat O"   value={form.perangkat_o} onChange={(v) => setField("perangkat_o", v)} />
            <InputField label="Kanal O"       value={form.kanal_o}     onChange={(v) => setField("kanal_o", v)} />
          </div>
        </>
      )}

      {/* ── Toggle Wakil User ── */}
      <Divider label="Informasi Wakil Pelanggan" />
      <div className="flex items-center gap-2 mb-3">
        <input
          type="checkbox"
          id="toggle-wakil"
          checked={showWakil}
          onChange={(e) => setShowWakil(e.target.checked)}
          className="w-4 h-4 cursor-pointer"
          style={{ accentColor: "var(--accent)" }}
        />
        <label htmlFor="toggle-wakil" className="text-xs cursor-pointer select-none"
          style={{ color: "var(--text-secondary)" }}>
          Isi data perwakilan user
        </label>
      </div>

      {showWakil && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InputField label="Nama Wakil User" value={form.nama_wakil_user}    onChange={(v) => setField("nama_wakil_user", v)}    placeholder="(kosong = spasi 15 karakter)" />
          <InputField label="Jabatan"         value={form.jabatan_user}       onChange={(v) => setField("jabatan_user", v)} />
          <InputField label="No. HP"          value={form.no_hp_user}         onChange={(v) => setField("no_hp_user", v)} />
          <InputField label="Alamat Kantor"   value={form.alamat_kantor_user} onChange={(v) => setField("alamat_kantor_user", v)} />
        </div>
      )}
    </>
  );
});