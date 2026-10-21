// frontend/src/components/teskom/forms/FormFields.tsx
import { memo, useState, useEffect, useCallback } from "react";
import { Plus, X } from "lucide-react";
import teskomApi, { WakilUserRecord } from "../../../services/teskomApi";

interface Props {
  form: Record<string, string>;
  setField: (key: string, val: string) => void;
  tipe: string;
  showWakil: boolean;
  onShowWakilChange: (show: boolean) => void;
  onToast?: (msg: string, type?: "success" | "error") => void;
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

export default memo(function FormFields({ form, setField, tipe, showWakil, onShowWakilChange, onToast }: Props) {
  const [wakilList, setWakilList] = useState<WakilUserRecord[]>([]);
  const [selectedWakilId, setSelectedWakilId] = useState<string>("");
  const [loadingList, setLoadingList] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchWakilUsers = useCallback(async () => {
    setLoadingList(true);
    try {
      const data = await teskomApi.getWakilUsers();
      setWakilList(data || []);
    } catch {
      // silent fallback
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    if (showWakil) {
      void fetchWakilUsers();
    }
  }, [showWakil, fetchWakilUsers]);

  const handleSelectWakil = (id: string) => {
    setSelectedWakilId(id);
    if (!id) {
      // Auto kosongkan 4 field untuk input profil baru
      setField("nama_wakil_user", "");
      setField("jabatan_user", "");
      setField("no_hp_user", "");
      setField("alamat_kantor_user", "");
      return;
    }
    const item = wakilList.find((w) => String(w.id) === id);
    if (item) {
      setField("nama_wakil_user", item.nama_wakil_user || "");
      setField("jabatan_user", item.jabatan_user || "");
      setField("no_hp_user", item.no_hp_user || "");
      setField("alamat_kantor_user", item.alamat_kantor_user || "");
    }
  };

  const handleDeleteWakil = async () => {
    if (!selectedWakilId || isDeleting) return;
    const target = wakilList.find((w) => String(w.id) === selectedWakilId);
    if (!target) return;

    if (!window.confirm(`Hapus "${target.nama_wakil_user}" dari database?`)) return;

    setIsDeleting(true);
    try {
      await teskomApi.deleteWakilUser(target.id);
      setWakilList((prev) => prev.filter((w) => w.id !== target.id));
      setSelectedWakilId("");
      onToast?.("Data user berhasil dihapus dari database", "success");
    } catch (err: any) {
      onToast?.(err?.response?.data?.detail || "Gagal menghapus data user", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddWakil = async () => {
    const nama = form.nama_wakil_user?.trim();
    if (!nama) {
      onToast?.("Nama wakil user wajib diisi untuk disimpan", "error");
      return;
    }
    if (isSaving) return;

    setIsSaving(true);
    try {
      const saved = await teskomApi.createWakilUser({
        nama_wakil_user: nama,
        jabatan_user: form.jabatan_user?.trim() || "",
        no_hp_user: form.no_hp_user?.trim() || "",
        alamat_kantor_user: form.alamat_kantor_user?.trim() || "",
      });

      setWakilList((prev) => {
        // Filter out ID sama atau nama sama (case-insensitive) agar tidak dobel nama
        const next = [
          saved,
          ...prev.filter(
            (w) =>
              w.id !== saved.id &&
              w.nama_wakil_user.trim().toLowerCase() !== saved.nama_wakil_user.trim().toLowerCase()
          ),
        ];
        return next.sort((a, b) => a.nama_wakil_user.localeCompare(b.nama_wakil_user));
      });
      setSelectedWakilId(String(saved.id));
      onToast?.(`Data "${saved.nama_wakil_user}" berhasil disimpan`, "success");
    } catch (err: any) {
      onToast?.(err?.response?.data?.detail || "Gagal menyimpan data user", "error");
    } finally {
      setIsSaving(false);
    }
  };

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
          onChange={(e) => onShowWakilChange(e.target.checked)}
          className="w-4 h-4 cursor-pointer"
          style={{ accentColor: "var(--accent)" }}
        />
        <label htmlFor="toggle-wakil" className="text-xs cursor-pointer select-none"
          style={{ color: "var(--text-secondary)" }}>
          Isi data perwakilan user
        </label>
      </div>

      {showWakil && (
        <div className="space-y-3">
          {/* Toolbar simpel & kecil: Dropdown + Tombol X + Tombol Simpan */}
          <div className="flex flex-wrap items-center gap-2 p-2 rounded-lg border text-xs"
            style={{ background: "var(--bg-surface2)", borderColor: "var(--border)" }}>
            <span className="font-medium shrink-0" style={{ color: "var(--text-secondary)" }}>
              Profil Tersimpan:
            </span>
            <div className="flex items-center gap-1">
              <select
                value={selectedWakilId}
                onChange={(e) => handleSelectWakil(e.target.value)}
                disabled={loadingList}
                className="w-56 max-w-xs px-2.5 py-1 rounded-md text-xs border transition-colors"
                style={{
                  background: "var(--bg-surface)",
                  borderColor: "var(--border)",
                  color: "var(--text-primary)",
                  outline: "none",
                }}
              >
                <option value="">
                  {loadingList ? "Memuat..." : "-- [New] Input Baru --"}
                </option>
                {wakilList.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.nama_wakil_user} {w.jabatan_user ? `(${w.jabatan_user})` : ""}
                  </option>
                ))}
              </select>

              {/* Tombol X kecil di samping list */}
              {selectedWakilId && (
                <button
                  type="button"
                  onClick={handleDeleteWakil}
                  disabled={isDeleting}
                  title="Hapus profil dari database"
                  className="p-1 rounded text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="h-4 w-px mx-1 hidden sm:block" style={{ background: "var(--border)" }} />

            {/* Tombol Simpan Profil kecil */}
            <button
              type="button"
              onClick={handleAddWakil}
              disabled={isSaving || !form.nama_wakil_user?.trim()}
              title={form.nama_wakil_user?.trim() ? "Simpan data saat ini ke database" : "Isi Nama Wakil User terlebih dahulu"}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition-all"
              style={
                form.nama_wakil_user?.trim() && !isSaving
                  ? {
                      background: "var(--accent-soft)",
                      borderColor: "var(--accent)",
                      color: "var(--accent)",
                      cursor: "pointer",
                    }
                  : {
                      background: "transparent",
                      borderColor: "var(--border)",
                      color: "var(--text-muted)",
                      opacity: 0.5,
                      cursor: "not-allowed",
                    }
              }
            >
              <Plus className="w-3 h-3" />
              <span>{isSaving ? "Menyimpan..." : "Simpan Profil"}</span>
            </button>

            <span className="ml-auto text-[11px]" style={{ color: "var(--text-muted)" }}>
              {wakilList.length} profil
            </span>
          </div>

          {/* Baris 3: Form Input Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <InputField label="Nama Wakil User" value={form.nama_wakil_user}    onChange={(v) => setField("nama_wakil_user", v)}    placeholder="(kosong = spasi 15 karakter)" />
            <InputField label="Jabatan"         value={form.jabatan_user}       onChange={(v) => setField("jabatan_user", v)} />
            <InputField label="No. HP"          value={form.no_hp_user}         onChange={(v) => setField("no_hp_user", v)} />
            <InputField label="Alamat Kantor"   value={form.alamat_kantor_user} onChange={(v) => setField("alamat_kantor_user", v)} />
          </div>
        </div>
      )}
    </>
  );
});