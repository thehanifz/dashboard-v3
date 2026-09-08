import { useEffect, useState } from "react";
import { profileApi, ProfileData } from "../../services/profileApi";
import { authApi } from "../../services/authApi";
import { useAuthStore } from "../../state/authStore";

const ROLE_LABEL: Record<string, string> = { engineer: "Engineer", ptl: "PTL", mitra: "Mitra", superuser: "Superuser" };
const ROLE_COLOR: Record<string, string> = { engineer: "#2563eb", ptl: "#7c3aed", mitra: "#059669", superuser: "#d97706" };

export default function Profile() {
  const { user, beginLogout, clearAuth } = useAuthStore();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [curPwd, setCurPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [conPwd, setConPwd] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState("");
  const [gsheetUrl, setGsheetUrl] = useState("");
  const [gsheetSheet, setGsheetSheet] = useState("");
  const [gsLoading, setGsLoading] = useState(false);
  const [gsError, setGsError] = useState("");
  const [gsSuccess, setGsSuccess] = useState("");
  const [gsNeedShare, setGsNeedShare] = useState(false);
  const [gsServiceEmail, setGsServiceEmail] = useState("");
  const [gsCreatedCols, setGsCreatedCols] = useState<string[]>([]);

  useEffect(() => {
    profileApi.getMe().then(data => {
      setProfile(data);
      setGsheetUrl(data.gsheet_url ?? "");
      setGsheetSheet(data.gsheet_sheet_name ?? "");
    }).catch(() => {
      if (user) setProfile({ username: user.username, nama_lengkap: user.nama_lengkap, role: user.role, is_active: true, gsheet_url: null, gsheet_sheet_name: null, created_at: null, created_by: null });
    }).finally(() => setLoading(false));
  }, [user]);

  const handleLogout = async () => {
    setLoggingOut(true);
    beginLogout();
    try { await authApi.logout(); } catch { /* local logout continues */ }
    clearAuth();
    window.location.href = "/";
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault(); setPwdError(""); setPwdSuccess(""); setPwdLoading(true);
    try {
      const res = await profileApi.changePassword({ current_password: curPwd, new_password: newPwd, confirm_password: conPwd });
      setPwdSuccess(res.message); setCurPwd(""); setNewPwd(""); setConPwd("");
      setTimeout(() => handleLogout(), 2000);
    } catch (err: any) { setPwdError(err?.response?.data?.detail ?? "Gagal mengubah password"); }
    finally { setPwdLoading(false); }
  };

  const handleUpdateGSheet = async (e: React.FormEvent) => {
    e.preventDefault(); setGsError(""); setGsSuccess(""); setGsNeedShare(false); setGsCreatedCols([]); setGsLoading(true);
    try {
      const res = await profileApi.updateGSheet({ gsheet_url: gsheetUrl.trim() || null, gsheet_sheet_name: gsheetSheet.trim() || null });
      setGsServiceEmail(res.service_email ?? "");
      if (res.need_share) setGsNeedShare(true);
      else { setGsCreatedCols(res.created_columns ?? []); setGsSuccess("GSheet info berhasil disimpan"); }
    } catch (err: any) { setGsError(err?.response?.data?.detail ?? "Gagal menyimpan"); }
    finally { setGsLoading(false); }
  };

  const isSuperuser = user?.role === "superuser";
  const role = profile?.role ?? user?.role ?? "engineer";
  const roleLabel = ROLE_LABEL[role] ?? role;
  const roleColor = ROLE_COLOR[role] ?? "#2563eb";
  const namaLengkap = profile?.nama_lengkap ?? user?.nama_lengkap ?? "—";
  const username = profile?.username ?? user?.username ?? "—";

  if (loading) return <div className="h-full flex items-center justify-center" style={{ background: "var(--bg-app)" }}><p className="text-sm" style={{ color: "var(--text-muted)" }}>Memuat profil...</p></div>;

  return (
    <div className="min-h-full" style={{ background: "var(--bg-app)" }}>
      <div className="w-full max-w-4xl mx-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-8 space-y-4 sm:space-y-5">
        <div className="flex items-center gap-3">
          <div><p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Akun</p><h1 className="text-xl sm:text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Profil & keamanan</h1></div>
        </div>

        <section className="rounded-3xl border overflow-hidden" style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
          <div className="p-4 sm:p-6 flex items-start gap-3 sm:gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-xl sm:text-2xl font-bold text-white shrink-0 shadow-sm" style={{ background: roleColor }}>{namaLengkap.charAt(0).toUpperCase()}</div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-bold truncate" style={{ color: "var(--text-primary)" }}>{namaLengkap}</h2>
              <p className="text-xs sm:text-sm mt-0.5 truncate" style={{ color: "var(--text-secondary)" }}>@{username}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2"><span className="text-[11px] font-semibold px-2 py-1 rounded-lg" style={{ background: `${roleColor}18`, color: roleColor }}>{roleLabel}</span><span className="text-[11px] font-semibold px-2 py-1 rounded-lg" style={{ background: profile?.is_active ? "rgba(16,185,129,.10)" : "rgba(239,68,68,.10)", color: profile?.is_active ? "#059669" : "#dc2626" }}>{profile?.is_active ? "Aktif" : "Nonaktif"}</span></div>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 p-3 sm:p-4 border-t" style={{ borderColor: "var(--border)", background: "var(--bg-surface2)" }}>
            {[{ l: "Username", v: username }, { l: "Status", v: profile?.is_active ? "Aktif" : "Nonaktif" }, { l: "Dibuat oleh", v: profile?.created_by ?? "—" }, { l: "Bergabung", v: profile?.created_at ? new Date(profile.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—" }].map(x => <div key={x.l} className="rounded-xl p-2.5 sm:p-3 border" style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}><p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{x.l}</p><p className="text-xs sm:text-sm font-medium mt-1 truncate" style={{ color: "var(--text-primary)" }}>{x.v}</p></div>)}
          </div>
        </section>


        {role === "ptl" && <section className="rounded-3xl border p-4 sm:p-6" style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
          <h2 className="text-sm font-bold mb-4" style={{ color: "var(--text-primary)" }}>Google Sheet PTL</h2>
          {gsError && <Alert type="error" msg={gsError} />}{gsSuccess && <Alert type="success" msg={gsSuccess} />}
          {gsCreatedCols.length > 0 && <div className="mb-4 rounded-xl p-3" style={{ background: "rgba(16,185,129,.08)", border: "1px solid rgba(16,185,129,.3)" }}><p className="text-xs font-semibold" style={{ color: "#059669" }}>Kolom otomatis dibuat: {gsCreatedCols.join(", ")}</p></div>}
          {gsNeedShare && <div className="mb-4 rounded-xl p-3" style={{ background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.3)" }}><p className="text-xs font-semibold" style={{ color: "#d97706" }}>GSheet perlu dibagikan ke service account sebagai Editor.</p>{gsServiceEmail && <code className="block mt-2 text-xs break-all" style={{ color: "#b45309" }}>{gsServiceEmail}</code>}</div>}
          <form onSubmit={handleUpdateGSheet} className="space-y-3"><Field label="URL Google Sheet"><input type="url" value={gsheetUrl} onChange={e => setGsheetUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..." className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }} /></Field><Field label="Nama Sheet"><input type="text" value={gsheetSheet} onChange={e => setGsheetSheet(e.target.value)} placeholder="RAW" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }} /></Field><Btn loading={gsLoading} label="Simpan GSheet" loadingLabel="Menyimpan..." /></form>
        </section>}

        {!isSuperuser && <section className="rounded-3xl border p-4 sm:p-6" style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}><h2 className="text-sm font-bold mb-4" style={{ color: "var(--text-primary)" }}>Ganti Password</h2>{pwdError && <Alert type="error" msg={pwdError} />}{pwdSuccess && <Alert type="success" msg={`${pwdSuccess} Mengalihkan ke login...`} />}<form onSubmit={handleChangePassword} className="space-y-3"><Field label="Password Saat Ini"><input type="password" value={curPwd} onChange={e => setCurPwd(e.target.value)} required className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }} placeholder="••••••••" /></Field><Field label="Password Baru"><input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} required className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }} placeholder="Min. 8 karakter" /></Field><Field label="Konfirmasi Password Baru"><input type="password" value={conPwd} onChange={e => setConPwd(e.target.value)} required className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }} placeholder="Ulangi password baru" /></Field><Btn loading={pwdLoading || !!pwdSuccess} label="Ganti Password" loadingLabel="Menyimpan..." /></form></section>}

        <section className="rounded-3xl border p-4 sm:p-6" style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}><h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Sesi</h2><p className="text-xs mt-1 mb-4" style={{ color: "var(--text-muted)" }}>Keluar dari akun pada perangkat ini.</p><button onClick={handleLogout} disabled={loggingOut} className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: loggingOut ? "var(--text-muted)" : "#ef4444" }}>{loggingOut ? "Keluar..." : "Logout"}</button></section>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div><label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>{label}</label>{children}</div>; }
function Btn({ loading, label, loadingLabel }: { loading: boolean; label: string; loadingLabel: string }) { return <button type="submit" disabled={loading} className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: loading ? "var(--text-muted)" : "var(--accent)" }}>{loading ? loadingLabel : label}</button>; }
function Alert({ type, msg }: { type: "error" | "success"; msg: string }) { const c = type === "error" ? { bg: "rgba(239,68,68,.08)", text: "#ef4444", border: "rgba(239,68,68,.3)" } : { bg: "rgba(16,185,129,.08)", text: "#10b981", border: "rgba(16,185,129,.3)" }; return <div className="mb-3 rounded-xl px-4 py-3 text-sm border" style={{ background: c.bg, color: c.text, borderColor: c.border }}>{msg}</div>; }
