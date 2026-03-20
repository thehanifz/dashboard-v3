/**
 * ProfilePage.tsx
 * Halaman profil untuk semua role termasuk superuser.
 * Data dari /api/profile/me — superuser return dari token, user biasa dari DB.
 */
import { useEffect, useState } from "react";
import { profileApi, ProfileData } from "../services/profileApi";
import { authApi } from "../services/authApi";
import { useAuthStore } from "../state/authStore";
import { useAppStore } from "../state/appStore";

const ROLE_LABEL: Record<string, string> = {
  engineer:  "Engineer",
  ptl:       "PTL",
  mitra:     "Mitra",
  superuser: "Superuser",
};
const ROLE_COLOR: Record<string, string> = {
  engineer:  "#2563eb",
  ptl:       "#7c3aed",
  mitra:     "#059669",
  superuser: "#d97706",
};

export default function ProfilePage() {
  const { user, clearAuth }   = useAuthStore();
  const { setPage }           = useAppStore();

  const [profile, setProfile]           = useState<ProfileData | null>(null);
  const [loading, setLoading]           = useState(true);
  const [loggingOut, setLoggingOut]     = useState(false);

  // Password form
  const [curPwd, setCurPwd]         = useState("");
  const [newPwd, setNewPwd]         = useState("");
  const [conPwd, setConPwd]         = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError]     = useState("");
  const [pwdSuccess, setPwdSuccess] = useState("");

  // GSheet form (PTL only)
  const [gsheetUrl, setGsheetUrl]     = useState("");
  const [gsheetSheet, setGsheetSheet] = useState("");
  const [gsLoading, setGsLoading]     = useState(false);
  const [gsError, setGsError]         = useState("");
  const [gsSuccess, setGsSuccess]     = useState("");

  useEffect(() => {
    profileApi.getMe()
      .then((data) => {
        setProfile(data);
        setGsheetUrl(data.gsheet_url ?? "");
        setGsheetSheet(data.gsheet_sheet_name ?? "");
      })
      .catch(() => {
        // Fallback ke data dari authStore jika API gagal
        if (user) {
          setProfile({
            username:          user.username,
            nama_lengkap:      user.nama_lengkap,
            role:              user.role,
            is_active:         true,
            gsheet_url:        null,
            gsheet_sheet_name: null,
            created_at:        null,
            created_by:        null,
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try { await authApi.logout(); } catch {}
    clearAuth();
    window.location.href = "/";
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(""); setPwdSuccess("");
    setPwdLoading(true);
    try {
      const res = await profileApi.changePassword({
        current_password: curPwd,
        new_password:     newPwd,
        confirm_password: conPwd,
      });
      setPwdSuccess(res.message);
      setCurPwd(""); setNewPwd(""); setConPwd("");
      setTimeout(() => handleLogout(), 2000);
    } catch (err: any) {
      setPwdError(err?.response?.data?.detail ?? "Gagal mengubah password");
    } finally {
      setPwdLoading(false);
    }
  };

  const handleUpdateGSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    setGsError(""); setGsSuccess("");
    setGsLoading(true);
    try {
      await profileApi.updateGSheet({
        gsheet_url:        gsheetUrl.trim() || null,
        gsheet_sheet_name: gsheetSheet.trim() || null,
      });
      setGsSuccess("GSheet info berhasil disimpan");
    } catch (err: any) {
      setGsError(err?.response?.data?.detail ?? "Gagal menyimpan");
    } finally {
      setGsLoading(false);
    }
  };

  const isSuperuser = user?.role === "superuser";
  const role        = profile?.role ?? user?.role ?? "engineer";
  const roleLabel   = ROLE_LABEL[role] ?? role;
  const roleColor   = ROLE_COLOR[role] ?? "#2563eb";
  const namaLengkap = profile?.nama_lengkap ?? user?.nama_lengkap ?? "—";
  const username    = profile?.username ?? user?.username ?? "—";

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: "var(--bg-app)" }}>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Memuat profil...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto" style={{ background: "var(--bg-app)" }}>
      <div className="max-w-2xl mx-auto p-6 space-y-5">

        {/* Header */}
        {!isSuperuser && (
          <button onClick={() => setPage("dashboard")}
            className="flex items-center gap-2 text-sm font-medium"
            style={{ color: "var(--text-secondary)" }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Kembali
          </button>
        )}

        {/* Info Akun */}
        <div className="rounded-2xl border p-6" style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white shrink-0 shadow-sm"
              style={{ background: roleColor }}>
              {namaLengkap.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
                {namaLengkap}
              </h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>@{username}</span>
                <span className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-lg"
                  style={{ background: `${roleColor}18`, color: roleColor }}>
                  {roleLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Detail grid */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            {[
              { label: "Username",    value: username },
              { label: "Status",      value: profile?.is_active ? "Aktif" : "Nonaktif" },
              { label: "Dibuat oleh", value: profile?.created_by ?? "—" },
              {
                label: "Bergabung",
                value: profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
                  : "—"
              },
            ].map((item) => (
              <div key={item.label} className="rounded-xl p-3"
                style={{ background: "var(--bg-surface2)", border: "1px solid var(--border)" }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  {item.label}
                </p>
                <p className="text-sm font-medium mt-0.5" style={{ color: "var(--text-primary)" }}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* GSheet — PTL only */}
        {role === "ptl" && (
          <div className="rounded-2xl border p-6" style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
            <h2 className="text-sm font-bold mb-4" style={{ color: "var(--text-primary)" }}>Google Sheet</h2>
            {gsError && <Alert type="error" msg={gsError} />}
            {gsSuccess && <Alert type="success" msg={gsSuccess} />}
            <form onSubmit={handleUpdateGSheet} className="space-y-4">
              <Field label="URL Google Sheet">
                <input type="url" value={gsheetUrl} onChange={e => setGsheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }} />
              </Field>
              <Field label="Nama Sheet">
                <input type="text" value={gsheetSheet} onChange={e => setGsheetSheet(e.target.value)}
                  placeholder="RAW"
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }} />
              </Field>
              <Btn loading={gsLoading} label="Simpan GSheet" loadingLabel="Menyimpan..." />
            </form>
          </div>
        )}

        {/* Ganti Password — non-superuser only */}
        {!isSuperuser && (
          <div className="rounded-2xl border p-6" style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
            <h2 className="text-sm font-bold mb-4" style={{ color: "var(--text-primary)" }}>Ganti Password</h2>
            {pwdError && <Alert type="error" msg={pwdError} />}
            {pwdSuccess && <Alert type="success" msg={`${pwdSuccess} Mengalihkan ke login...`} />}
            <form onSubmit={handleChangePassword} className="space-y-4">
              <Field label="Password Saat Ini">
                <input type="password" value={curPwd} onChange={e => setCurPwd(e.target.value)} required
                  placeholder="••••••••"
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }} />
              </Field>
              <Field label="Password Baru">
                <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} required
                  placeholder="Min. 8 karakter"
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }} />
              </Field>
              <Field label="Konfirmasi Password Baru">
                <input type="password" value={conPwd} onChange={e => setConPwd(e.target.value)} required
                  placeholder="Ulangi password baru"
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }} />
              </Field>
              <Btn loading={pwdLoading || !!pwdSuccess} label="Ganti Password" loadingLabel="Menyimpan..." />
            </form>
          </div>
        )}

        {/* Logout */}
        <div className="rounded-2xl border p-6" style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
          <h2 className="text-sm font-bold mb-1" style={{ color: "var(--text-primary)" }}>Keluar</h2>
          <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
            Sesi kamu akan diakhiri dan kamu perlu login ulang.
          </p>
          <button onClick={handleLogout} disabled={loggingOut}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ background: loggingOut ? "var(--text-muted)" : "#ef4444", cursor: loggingOut ? "not-allowed" : "pointer" }}>
            {loggingOut ? "Keluar..." : "Logout"}
          </button>
        </div>

      </div>
    </div>
  );
}

// ── Helper components ─────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Btn({ loading, label, loadingLabel }: { loading: boolean; label: string; loadingLabel: string }) {
  return (
    <button type="submit" disabled={loading}
      className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
      style={{ background: loading ? "var(--text-muted)" : "var(--accent)", cursor: loading ? "not-allowed" : "pointer" }}>
      {loading ? loadingLabel : label}
    </button>
  );
}

function Alert({ type, msg }: { type: "error" | "success"; msg: string }) {
  const colors = type === "error"
    ? { bg: "rgba(239,68,68,0.08)", text: "#ef4444", border: "rgba(239,68,68,0.3)" }
    : { bg: "rgba(16,185,129,0.08)", text: "#10b981", border: "rgba(16,185,129,0.3)" };
  return (
    <div className="mb-3 rounded-xl px-4 py-3 text-sm border"
      style={{ background: colors.bg, color: colors.text, borderColor: colors.border }}>
      {msg}
    </div>
  );
}