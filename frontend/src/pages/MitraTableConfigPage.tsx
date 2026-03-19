/**
 * MitraTableConfigPage.tsx
 * Halaman Engineer untuk konfigurasi tabel Mitra.
 */
import { useEffect, useState } from "react";
import { roleConfigApi } from "../services/roleConfigApi";
import { useAppStore } from "../state/appStore";

export default function MitraTableConfigPage() {
  const [allColumns, setAllColumns]     = useState<string[]>([]);
  const [whitelist, setWhitelist]       = useState<string[]>([]);
  const [visibleCols, setVisibleCols]   = useState<string[]>([]);
  const [editableCols, setEditableCols] = useState<string[]>([]);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState("");
  const [successMsg, setSuccessMsg]     = useState("");
  const [dragOver, setDragOver]         = useState<number | null>(null);

  const { setPage } = useAppStore();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const [cols, config] = await Promise.all([
        roleConfigApi.getAvailableColumns(),
        roleConfigApi.getConfig("mitra"),
      ]);
      setAllColumns(cols.all_columns);
      setWhitelist(cols.mitra_editable_whitelist);
      setVisibleCols(config.visible_columns);
      setEditableCols(config.editable_columns);
    } catch (err: any) {
      const msg = err?.response?.data?.detail;
      setError(typeof msg === "string" ? msg : msg ? JSON.stringify(msg) : "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  const toggleVisible = (col: string) => {
    const isCurrentlyVisible = visibleCols.includes(col);
    if (isCurrentlyVisible) {
      setVisibleCols((prev) => prev.filter((c) => c !== col));
      setEditableCols((prev) => prev.filter((c) => c !== col));
    } else {
      setVisibleCols((prev) => [...prev, col]);
    }
  };

  const toggleEditable = (col: string) => {
    setEditableCols((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndex = Number(e.dataTransfer.getData("text/plain"));
    if (sourceIndex === targetIndex) return;
    const updated = [...visibleCols];
    const [moved] = updated.splice(sourceIndex, 1);
    updated.splice(targetIndex, 0, moved);
    setVisibleCols(updated);
    setDragOver(null);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccessMsg("");
      await roleConfigApi.updateConfig("mitra", {
        visible_columns: visibleCols,
        editable_columns: editableCols,
      });
      setSuccessMsg("Konfigurasi berhasil disimpan!");
      setTimeout(() => setPage("dashboard"), 1500);
    } catch (err: any) {
      const msg = err?.response?.data?.detail;
      setError(typeof msg === "string" ? msg : msg ? JSON.stringify(msg) : "Gagal menyimpan konfigurasi");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-sm" style={{ color: "var(--text-secondary)" }}>
        Memuat konfigurasi...
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
          Pengaturan Tabel Mitra
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Atur kolom yang tampil dan bisa diedit oleh Mitra. Drag baris untuk mengatur urutan kolom.
        </p>
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm border"
          style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444", borderColor: "rgba(239,68,68,0.3)" }}>
          {error}
        </div>
      )}
      {successMsg && (
        <div className="rounded-xl px-4 py-3 text-sm border"
          style={{ background: "rgba(16,185,129,0.08)", color: "#10b981", borderColor: "rgba(16,185,129,0.3)" }}>
          {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Panel 1 — Kolom yang Tampil */}
        <div className="rounded-2xl border p-5 space-y-4"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
          <div>
            <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
              Kolom yang Tampil
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              Centang kolom yang ingin ditampilkan ke Mitra. Drag untuk mengatur urutan.
            </p>
          </div>

          <div className="space-y-1 max-h-96 overflow-y-auto custom-scrollbar pr-1">
            {allColumns.length === 0 && (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Tidak ada kolom tersedia.
              </p>
            )}
            {allColumns.map((col) => {
              const isChecked    = visibleCols.includes(col);
              const visibleIndex = visibleCols.indexOf(col);
              return (
                <div
                  key={col}
                  draggable={isChecked}
                  onDragStart={(e) => isChecked && handleDragStart(e, visibleIndex)}
                  onDragOver={(e) => { e.preventDefault(); if (isChecked) setDragOver(visibleIndex); }}
                  onDrop={(e) => isChecked && handleDrop(e, visibleIndex)}
                  onDragLeave={() => setDragOver(null)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition select-none"
                  style={{
                    background: dragOver === visibleIndex && isChecked
                      ? "var(--accent-soft)"
                      : isChecked ? "var(--bg-app)" : "transparent",
                    border: "1px solid",
                    borderColor: isChecked ? "var(--border)" : "transparent",
                    cursor: isChecked ? "grab" : "default",
                  }}
                >
                  {isChecked && (
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24"
                      stroke="currentColor" strokeWidth={2} style={{ color: "var(--text-muted)" }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
                    </svg>
                  )}
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleVisible(col)}
                    className="rounded shrink-0"
                  />
                  <span className="truncate flex-1"
                    style={{ color: isChecked ? "var(--text-primary)" : "var(--text-muted)" }}>
                    {col}
                  </span>
                  {isChecked && (
                    <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
                      #{visibleIndex + 1}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {visibleCols.length} kolom dipilih
          </p>
        </div>

        {/* Panel 2 — Kolom yang Bisa Diedit */}
        <div className="rounded-2xl border p-5 space-y-4"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
          <div>
            <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
              Kolom yang Bisa Diedit Mitra
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              Hanya dari whitelist developer. Kolom harus tampil dulu agar bisa diedit.
            </p>
          </div>

          <div className="space-y-1">
            {whitelist.length === 0 && (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Whitelist kosong — set <code>MITRA_EDITABLE_WHITELIST</code> di .env backend.
              </p>
            )}
            {whitelist.map((col) => {
              const isVisible  = visibleCols.includes(col);
              const isEditable = editableCols.includes(col);
              return (
                <div
                  key={col}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm"
                  style={{
                    background: isEditable ? "var(--bg-app)" : "transparent",
                    border: "1px solid",
                    borderColor: isEditable ? "var(--border)" : "transparent",
                    opacity: isVisible ? 1 : 0.4,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isEditable}
                    disabled={!isVisible}
                    onChange={() => toggleEditable(col)}
                    className="rounded shrink-0"
                    title={!isVisible ? "Aktifkan kolom ini di panel kiri terlebih dahulu" : undefined}
                  />
                  <span className="flex-1 truncate"
                    style={{ color: isEditable ? "var(--text-primary)" : "var(--text-muted)" }}>
                    {col}
                  </span>
                  {!isVisible && (
                    <span className="text-xs shrink-0" style={{ color: "#f59e0b" }}>
                      Belum tampil
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {editableCols.length} kolom bisa diedit
          </p>
        </div>
      </div>

      {/* Preview urutan kolom */}
      {visibleCols.length > 0 && (
        <div className="rounded-2xl border p-5 space-y-3"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
          <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
            Preview Urutan Kolom
          </h2>
          <div className="flex flex-wrap gap-2">
            {visibleCols.map((col, i) => {
              const isEdit = editableCols.includes(col);
              return (
                <span
                  key={col}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium"
                  style={{
                    background: isEdit ? "var(--accent-soft)" : "var(--bg-app)",
                    color: isEdit ? "var(--accent)" : "var(--text-secondary)",
                    border: "1px solid",
                    borderColor: isEdit ? "var(--accent)" : "var(--border)",
                  }}
                >
                  <span style={{ color: "var(--text-muted)" }}>{i + 1}.</span>
                  {col}
                  {isEdit && (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24"
                      stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  )}
                </span>
              );
            })}
          </div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Kolom dengan ikon pensil = bisa diedit Mitra.
          </p>
        </div>
      )}

      {/* Tombol Action */}
      <div className="flex gap-3 pb-6">
        <button
          onClick={() => setPage("dashboard")}
          className="btn-ghost rounded-xl px-4 py-2.5 text-sm"
        >
          ← Kembali
        </button>
        <button
          onClick={loadData}
          disabled={loading || saving}
          className="btn-ghost rounded-xl px-4 py-2.5 text-sm"
        >
          Reset
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl px-6 py-2.5 text-sm font-medium text-white transition"
          style={{
            background: saving ? "var(--text-muted)" : "var(--accent)",
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "Menyimpan..." : "Simpan Konfigurasi"}
        </button>
      </div>
    </div>
  );
}
