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
      .catch((e) => setError(e.message))
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
    <div className="flex flex-col h-full bg-gray-950 text-white overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPage("dashboard")}
            className="text-gray-400 hover:text-white transition text-sm"
          >
            ← Kembali
          </button>
          <h1 className="text-xl font-bold text-white">⚙️ Pengaturan Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          {saveMsg && (
            <span className="text-sm text-green-400">{saveMsg}</span>
          )}
          <button
            onClick={handleInvalidateCache}
            className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1.5 rounded transition"
          >
            🔄 Reload Cache
          </button>
          {cacheMsg && (
            <span className="text-xs text-blue-400">{cacheMsg}</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-6 space-y-8 max-w-3xl">
        {loading && (
          <p className="text-gray-400 text-sm">Memuat settings...</p>
        )}
        {error && (
          <p className="text-red-400 text-sm">❌ {error}</p>
        )}

        {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              {CATEGORY_LABEL[category] ?? category}
            </h2>
            <div className="bg-gray-900 rounded-xl border border-gray-800 divide-y divide-gray-800">
              {items.map((s) => (
                <div key={s.key} className="px-4 py-3 flex items-start gap-4">
                  {/* Label & deskripsi */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{s.label}</p>
                    {s.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{s.description}</p>
                    )}
                    <p className="text-xs text-gray-600 mt-0.5 font-mono">{s.key}</p>
                  </div>

                  {/* Value / edit */}
                  <div className="flex items-center gap-2 shrink-0">
                    {editKey === s.key ? (
                      <>
                        <input
                          className="bg-gray-800 border border-blue-500 text-white text-sm rounded px-2 py-1 w-40 focus:outline-none"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit(s.key);
                            if (e.key === "Escape") cancelEdit();
                          }}
                          autoFocus
                        />
                        <button
                          onClick={() => saveEdit(s.key)}
                          disabled={saving}
                          className="text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-2 py-1 rounded transition"
                        >
                          {saving ? "..." : "✔"}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded transition"
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-sm text-gray-200 font-mono bg-gray-800 px-2 py-1 rounded">
                          {s.value}
                        </span>
                        {s.is_editable && (
                          <button
                            onClick={() => startEdit(s)}
                            className="text-xs text-gray-400 hover:text-blue-400 transition px-1"
                            title="Edit"
                          >
                            ✏️
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Footer info */}
        {!loading && settings.length > 0 && (
          <p className="text-xs text-gray-600">
            Total {settings.length} settings. Perubahan berlaku real-time setelah disimpan (cache TTL 5 menit).
          </p>
        )}
      </div>
    </div>
  );
}
