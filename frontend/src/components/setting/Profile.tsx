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
  const [passwordOpen, setPasswordOpen] = useState(false);
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
      <div className="w-full max-w-5xl mx-auto px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
        <header className="mb-5 sm:mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--text-muted)" }}>Akun</p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>Profil & keamanan</h1>
          <p className="mt-1.5 text-sm" style={{ color: "var(--text-secondary)" }}>Kelola informasi akun, keamanan, dan akses Anda.</p>
        </header>

        <section className="rounded-3xl border overflow-hidden shadow-sm" style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
          <div className="p-5 sm:p-7 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-bold text-white shrink-0 shadow-sm" style={{ background: roleColor }}>{namaLengkap.charAt(0).toUpperCase()}</div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl sm:text-2xl font-bold truncate" style={{ color: "var(--text-primary)" }}>{namaLengkap}</h2>
              <p className="mt-0.5 text-sm" style={{ color: "var(--text-secondary)" }}>@{username}</p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <Badge color={roleColor}>{roleLabel}</Badge>
                <Badge color={profile?.is_active ? "#059669" : "#dc2626"} soft={profile?.is_active ? "rgba(16,185,129,.10)" : "rgba(239,68,68,.10)"}>
                  <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5" style={{ background: profile?.is_active ? "#10b981" : "#ef4444" }} />
                  {profile?.is_active ? "Akun aktif" : "Akun nonaktif"}
                </Badge>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 p-3 sm:p-4 border-t" style={{ borderColor: "var(--border)", background: "var(--bg-surface2)" }}>
            <Meta label="Username" value={username} />
            <Meta label="Role" value={roleLabel} />
            <Meta label="Dibuat oleh" value={profile?.created_by ?? "—"} />
            <Meta label="Bergabung" value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—"} />
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 mt-4 sm:mt-5">
          <section className="rounded-3xl border p-5 sm:p-6" style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
            <SectionTitle eyebrow="Akun" title="Informasi akun" description="Ringkasan identitas dan status akun Anda." />
            <div className="space-y-0 mt-5">
              <InfoRow label="Nama lengkap" value={namaLengkap} />
              <InfoRow label="Username" value={`@${username}`} />
              <InfoRow label="Role" value={roleLabel} />
              <InfoRow label="Status" value={profile?.is_active ? "Aktif" : "Nonaktif"} />
            </div>
          </section>

          <section className="rounded-3xl border p-5 sm:p-6" style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
            <SectionTitle eyebrow="Keamanan" title="Password" description="Gunakan password yang kuat untuk menjaga keamanan akun." />
            <div className="mt-5 rounded-2xl border p-4" style={{ background: "var(--bg-surface2)", borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Password akun</p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{isSuperuser ? "Penggantian password dikelola oleh administrator." : "Ubah password secara berkala untuk menjaga keamanan."}</p>
                </div>
                {!isSuperuser && <button type="button" onClick={() => setPasswordOpen(v => !v)} className="shrink-0 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white" style={{ background: "var(--accent)" }}>{passwordOpen ? "Tutup" : "Ganti Password"}</button>}
              </div>
              {!isSuperuser && passwordOpen && (
                <form onSubmit={handleChangePassword} className="mt-4 pt-4 border-t space-y-3" style={{ borderColor: "var(--border)" }}>
                  {pwdError && <Alert type="error" msg={pwdError} />}
                  {pwdSuccess && <Alert type="success" msg={`${pwdSuccess} Mengalihkan ke login...`} />}
                  <Field label="Password Saat Ini"><PasswordInput value={curPwd} onChange={setCurPwd} placeholder="••••••••" /></Field>
                  <Field label="Password Baru"><PasswordInput value={newPwd} onChange={setNewPwd} placeholder="Min. 8 karakter" /></Field>
                  <Field label="Konfirmasi Password Baru"><PasswordInput value={conPwd} onChange={setConPwd} placeholder="Ulangi password baru" /></Field>
                  <button type="submit" disabled={pwdLoading || !!pwdSuccess} className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: pwdLoading || pwdSuccess ? "var(--text-muted)" : "var(--accent)" }}>{pwdLoading ? "Menyimpan..." : "Simpan Password"}</button>
                </form>
              )}
            </div>
          </section>
        </div>

        {role === "ptl" && <section className="rounded-3xl border p-5 sm:p-6 mt-4 sm:mt-5" style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
          <SectionTitle eyebrow="Integrasi" title="Google Sheet PTL" description="Hubungkan spreadsheet yang digunakan untuk data PTL." />
          <div className="mt-5">
            {gsError && <Alert type="error" msg={gsError} />}
            {gsSuccess && <Alert type="success" msg={gsSuccess} />}
            {gsCreatedCols.length > 0 && <div className="mb-4 rounded-2xl p-3.5 border" style={{ background: "rgba(16,185,129,.08)", borderColor: "rgba(16,185,129,.3)" }}><p className="text-xs font-semibold" style={{ color: "#059669" }}>Kolom otomatis dibuat: {gsCreatedCols.join(", ")}</p></div>}
            {gsNeedShare && <div className="mb-4 rounded-2xl p-3.5 border" style={{ background: "rgba(245,158,11,.08)", borderColor: "rgba(245,158,11,.3)" }}><p className="text-xs font-semibold" style={{ color: "#d97706" }}>GSheet perlu dibagikan ke service account sebagai Editor.</p>{gsServiceEmail && <code className="block mt-2 text-xs break-all" style={{ color: "#b45309" }}>{gsServiceEmail}</code>}</div>}
            <form onSubmit={handleUpdateGSheet} className="space-y-3">
              <Field label="URL Google Sheet"><TextInput type="url" value={gsheetUrl} onChange={setGsheetUrl} placeholder="https://docs.google.com/spreadsheets/d/..." /></Field>
              <Field label="Nama Sheet"><TextInput type="text" value={gsheetSheet} onChange={setGsheetSheet} placeholder="RAW" /></Field>
              <button type="submit" disabled={gsLoading} className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: gsLoading ? "var(--text-muted)" : "var(--accent)" }}>{gsLoading ? "Menyimpan..." : "Simpan GSheet"}</button>
            </form>
          </div>
        </section>}

        <section className="rounded-3xl border p-5 sm:p-6 mt-4 sm:mt-5" style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
          <SectionTitle eyebrow="Zona akun" title="Sesi" description="Keluar dari akun pada perangkat ini." />
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Anda perlu login kembali untuk mengakses dashboard.</p>
            <button type="button" onClick={handleLogout} disabled={loggingOut} className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-semibold border" style={{ color: loggingOut ? "var(--text-muted)" : "#dc2626", borderColor: loggingOut ? "var(--border)" : "rgba(220,38,38,.25)", background: loggingOut ? "transparent" : "rgba(220,38,38,.06)" }}>{loggingOut ? "Keluar..." : "Logout"}</button>
          </div>
        </section>
      </div>
    </div>
  );
}

function SectionTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div>
    <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--text-muted)" }}>{eyebrow}</p>
    <h2 className="text-base sm:text-lg font-bold mt-1" style={{ color: "var(--text-primary)" }}>{title}</h2>
    <p className="text-xs sm:text-sm mt-1" style={{ color: "var(--text-secondary)" }}>{description}</p>
  </div>;
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl p-3 border min-w-0" style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
    <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</p>
    <p className="text-xs sm:text-sm font-medium mt-1 truncate" style={{ color: "var(--text-primary)" }} title={value}>{value}</p>
  </div>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4 py-2.5 border-b last:border-b-0" style={{ borderColor: "var(--border)" }}>
    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</span>
    <span className="text-sm font-medium text-right truncate" style={{ color: "var(--text-primary)" }} title={value}>{value}</span>
  </div>;
}

function Badge({ children, color, soft }: { children: React.ReactNode; color: string; soft?: string }) {
  return <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-lg" style={{ background: soft ?? `${color}18`, color }}>{children}</span>;
}

function TextInput({ type, value, onChange, placeholder }: { type: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none" style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }} />;
}

function PasswordInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <input type="password" value={value} onChange={e => onChange(e.target.value)} required className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none" style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }} placeholder={placeholder} />;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div><label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>{label}</label>{children}</div>; }
function Btn({ loading, label, loadingLabel }: { loading: boolean; label: string; loadingLabel: string }) { return <button type="submit" disabled={loading} className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: loading ? "var(--text-muted)" : "var(--accent)" }}>{loading ? loadingLabel : label}</button>; }
function Alert({ type, msg }: { type: "error" | "success"; msg: string }) { const c = type === "error" ? { bg: "rgba(239,68,68,.08)", text: "#ef4444", border: "rgba(239,68,68,.3)" } : { bg: "rgba(16,185,129,.08)", text: "#10b981", border: "rgba(16,185,129,.3)" }; return <div className="mb-3 rounded-xl px-4 py-3 text-sm border" style={{ background: c.bg, color: c.text, borderColor: c.border }}>{msg}</div>; }
