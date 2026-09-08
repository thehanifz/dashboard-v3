/**
 * pages/SettingsPage.tsx
 * Halaman pengaturan dashboard.
 * Dapat diakses oleh role superuser dan engineer.
 * Menampilkan semua settings dari tabel dashboard_settings di DB,
 * dikelompokkan per category, dan bisa diedit inline.
 */
import { useEffect, useState } from "react";
import { useAuthStore } from "../state/authStore";
import { useAppStore } from "../state/appStore";
import {
  fetchAllSettings,
  updateSetting,
  invalidateSettingsCache,
  type DashboardSetting,
} from "../services/settingsApi";

const CATEGORY_LABEL: Record<string, string> = {
  aging:   "⏱ Threshold Aging",
  app:     "🏷 Aplikasi",
  columns: "📋 Nama Kolom GSheet",
};

/** Role yang diizinkan mengakses halaman ini */
const ALLOWED_ROLES = ["superuser", "engineer"];

export default function SettingsPage() {
  const { user, hasRole }   = useAuthStore();
  const isSuperuser = user?.role === "superuser";
  const { setPage }         = useAppStore();

  const [settings, setSettings]   = useState<DashboardSetting[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [editKey, setEditKey]     = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving]       = useState(false);
  const [saveMsg, setSaveMsg]     = useState("");
  const [cacheMsg, setCacheMsg]   = useState("");

  // Guard — hanya superuser atau engineer
  useEffect(() => {
    if (!ALLOWED_ROLES.some(r => hasRole(r))) {
      setPage("dashboard");
    }
  }, [hasRole, setPage]);

  // Load semua settings saat mount
  useEffect(() => {
    setLoading(true);
    fetchAllSettings()
      .then(setSettings)
      .catch((e) => {
        const status = e?.response?.status;
        setError(status === 403
          ? "Akun ini tidak memiliki akses untuk membaca Pengaturan."
          : e?.message || "Gagal memuat pengaturan.");
      })
      .finally(() => setLoading(false));
  }, []);

  // Kelompokkan settings per category
  const grouped = settings.reduce<Record<string, DashboardSetting[]>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});

  function startEdit(s: DashboardSetting) {
    setEditKey(s.key);
    setEditValue(s.value);
    setSaveMsg("");
  }

  function cancelEdit() {
    setEditKey(null);
    setEditValue("");
  }

  async function saveEdit(key: string) {
    setSaving(true);
    setSaveMsg("");
    try {
      const updated = await updateSetting(key, editValue);
      setSettings((prev) =>
        prev.map((s) => (s.key === key ? updated : s))
      );
      setEditKey(null);
      setSaveMsg(`✅ '${key}' berhasil disimpan`);
      setTimeout(() => setSaveMsg(""), 3000);
    } catch (e: any) {
      setSaveMsg(`❌ ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleInvalidateCache() {
    setCacheMsg("Memuat ulang cache...");
    try {
      await invalidateSettingsCache();
      setCacheMsg("✅ Cache berhasil di-reload");
    } catch {
      setCacheMsg("❌ Gagal reload cache");
    }
    setTimeout(() => setCacheMsg(""), 3000);
  }

  if (!ALLOWED_ROLES.some(r => hasRole(r))) return null;

  return (
    <div className="min-h-full overflow-y-auto" style={{ background: "var(--bg-app)", color: "var(--text-primary)" }}>
      <div
        className="sticky top-0 z-10 flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6"
        style={{ background: "color-mix(in srgb, var(--bg-app) 92%, transparent)", borderColor: "var(--border)", backdropFilter: "blur(10px)" }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <button onClick={() => setPage("dashboard")} className="shrink-0 text-sm transition hover:opacity-80" style={{ color: "var(--text-muted)" }}>
            ← Kembali
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold sm:text-xl">⚙️ Pengaturan Dashboard</h1>
            {isSuperuser && <p className="mt-0.5 text-[11px]" style={{ color: "var(--text-muted)" }}>Mode baca untuk Superuser</p>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {saveMsg && <span className="text-xs sm:text-sm" style={{ color: saveMsg.startsWith("❌") ? "#ef4444" : "#16a34a" }}>{saveMsg}</span>}
          {!isSuperuser && (
            <button onClick={handleInvalidateCache} className="rounded-lg px-3 py-2 text-xs font-medium transition hover:opacity-90" style={{ background: "var(--bg-surface2)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
              🔄 Reload Cache
            </button>
          )}
          {cacheMsg && <span className="text-xs" style={{ color: "var(--accent)" }}>{cacheMsg}</span>}
        </div>
      </div>

      <div className="w-full max-w-4xl space-y-6 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        {loading && (
          <div className="rounded-xl border px-4 py-3 text-sm" style={{ background: "var(--bg-surface)", borderColor: "var(--border)", color: "var(--text-muted)" }}>
            Memuat settings...
          </div>
        )}
        {error && (
          <div className="rounded-xl border px-4 py-3 text-sm" style={{ background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.3)", color: "#ef4444" }}>
            ❌ {error}
          </div>
        )}

        {Object.entries(grouped).map(([category, items]) => (
          <section key={category}>
            <div className="mb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                {CATEGORY_LABEL[category] ?? category}
              </h2>
            </div>
            <div className="overflow-hidden rounded-2xl border shadow-sm" style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
              {items.map((s, index) => (
                <div key={s.key} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:gap-5" style={{ borderTop: index ? "1px solid var(--border)" : undefined }}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{s.label}</p>
                    {s.description && <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{s.description}</p>}
                    <p className="mt-1 break-all font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>{s.key}</p>
                  </div>

                  <div className="w-full sm:w-auto sm:min-w-[280px] sm:max-w-[46%]">
                    {editKey === s.key && !isSuperuser ? (
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <input
                          className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2"
                          style={{ background: "var(--bg-surface2)", borderColor: "var(--accent)", color: "var(--text-primary)" }}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") saveEdit(s.key); if (e.key === "Escape") cancelEdit(); }}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button onClick={() => saveEdit(s.key)} disabled={saving} className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 sm:flex-none">{saving ? "..." : "Simpan"}</button>
                          <button onClick={cancelEdit} className="flex-1 rounded-lg px-3 py-2 text-xs font-medium sm:flex-none" style={{ background: "var(--bg-surface2)", color: "var(--text-secondary)" }}>Batal</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <span className="min-w-0 flex-1 break-words rounded-lg px-3 py-2 font-mono text-xs" style={{ background: "var(--bg-surface2)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                          {s.value || "—"}
                        </span>
                        {s.is_editable && !isSuperuser && (
                          <button onClick={() => startEdit(s)} className="shrink-0 rounded-lg px-2 py-2 text-sm transition hover:opacity-80" style={{ color: "var(--text-muted)" }} title="Edit">✏️</button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        {!loading && settings.length > 0 && (
          <p className="pb-4 text-[11px]" style={{ color: "var(--text-muted)" }}>
            Total {settings.length} settings. {isSuperuser ? "Superuser dapat melihat konfigurasi tanpa mengubah nilainya." : "Perubahan berlaku setelah disimpan."}
          </p>
        )}
      </div>
    </div>
  );
}
