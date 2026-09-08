import type { ReactNode } from "react";
import type { UserItem } from "../../services/adminApi";

type Props = {
  users: UserItem[];
  onEdit: (user: UserItem) => void;
  onResetPassword: (user: UserItem) => void;
  onDeactivate: (user: UserItem) => void;
};

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return isNaN(date.getTime()) ? value : date.toLocaleString("id-ID");
}

function roleLabel(role: string) {
  if (role === "ptl") return "PTL";
  if (role === "mitra") return "Mitra";
  if (role === "engineer") return "Engineer";
  return role;
}

export default function UserTable({ users, onEdit, onResetPassword, onDeactivate }: Props) {
  const emptyState = (
    <div
      className="rounded-xl border px-4 py-10 text-center text-sm"
      style={{ background: "var(--bg-surface2)", borderColor: "var(--border)", color: "var(--text-muted)" }}
    >
      Belum ada user. Klik "Tambah User" untuk membuat akun baru.
    </div>
  );

  if (users.length === 0) return emptyState;

  return (
    <>
      {/* Desktop / tablet */}
      <div
        className="hidden md:block overflow-hidden rounded-2xl border shadow-sm"
        style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
      >
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-sm">
            <thead style={{ background: "var(--bg-surface2)", color: "var(--text-secondary)" }}>
              <tr>
                {['No', 'Username', 'Nama Lengkap', 'Role', 'GSheet URL', 'Status', 'Dibuat', 'Aksi'].map((label) => (
                  <th key={label} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user, index) => (
                <tr
                  key={user.id}
                  className="border-t transition-colors hover:bg-slate-50/70 dark:hover:bg-white/5"
                  style={{ borderColor: "var(--border)" }}
                >
                  <td className="px-4 py-3" style={{ color: "var(--text-muted)" }}>{index + 1}</td>
                  <td className="px-4 py-3 font-medium" style={{ color: "var(--text-primary)" }}>{user.username}</td>
                  <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{user.nama_lengkap}</td>
                  <td className="px-4 py-3">
                    <RolePill role={user.role} />
                  </td>
                  <td className="px-4 py-3 max-w-[280px]">
                    {user.gsheet_url ? (
                      <a
                        href={user.gsheet_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block truncate underline hover:opacity-80"
                        style={{ color: "var(--accent)" }}
                        title={user.gsheet_url}
                      >
                        {user.gsheet_url}
                      </a>
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>Belum dikonfigurasi</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><StatusPill active={user.is_active} /></td>
                  <td className="px-4 py-3" style={{ color: "var(--text-muted)" }}>{formatDate(user.created_at)}</td>
                  <td className="px-4 py-3"><ActionButtons user={user} onEdit={onEdit} onResetPassword={onResetPassword} onDeactivate={onDeactivate} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden space-y-3">
        {users.map((user, index) => (
          <article
            key={user.id}
            className="rounded-2xl border p-4 shadow-sm"
            style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[11px] shrink-0" style={{ color: "var(--text-muted)" }}>#{index + 1}</span>
                  <p className="truncate text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{user.username}</p>
                </div>
                <p className="mt-1 truncate text-sm" style={{ color: "var(--text-secondary)" }}>{user.nama_lengkap}</p>
              </div>
              <div className="shrink-0"><RolePill role={user.role} /></div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <InfoItem label="Status"><StatusPill active={user.is_active} /></InfoItem>
              <InfoItem label="Dibuat"><span>{formatDate(user.created_at)}</span></InfoItem>
              <InfoItem label="GSheet" className="col-span-2">
                {user.gsheet_url ? (
                  <a href={user.gsheet_url} target="_blank" rel="noopener noreferrer" className="block truncate underline" style={{ color: "var(--accent)" }} title={user.gsheet_url}>
                    Terhubung · buka GSheet
                  </a>
                ) : (
                  <span style={{ color: "var(--text-muted)" }}>Belum dikonfigurasi</span>
                )}
              </InfoItem>
            </div>

            <div className="mt-4 border-t pt-3" style={{ borderColor: "var(--border)" }}>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Aksi</p>
              <ActionButtons user={user} onEdit={onEdit} onResetPassword={onResetPassword} onDeactivate={onDeactivate} mobile />
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function RolePill({ role }: { role: string }) {
  return (
    <span className={[
      "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold",
      role === "engineer" ? "bg-sky-100 text-sky-700" : role === "ptl" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700",
    ].join(" ")}>{roleLabel(role)}</span>
  );
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span className={[
      "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold",
      active ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700",
    ].join(" ")}>{active ? "Aktif" : "Nonaktif"}</span>
  );
}

function InfoItem({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 rounded-xl border px-3 py-2.5 ${className}`} style={{ borderColor: "var(--border)", background: "var(--bg-surface2)", color: "var(--text-secondary)" }}>
      <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</p>
      <div className="mt-1 min-w-0 text-xs">{children}</div>
    </div>
  );
}

function ActionButtons({ user, onEdit, onResetPassword, onDeactivate, mobile = false }: Props & { user: UserItem; mobile?: boolean }) {
  return (
    <div className={mobile ? "grid grid-cols-2 gap-2" : "flex flex-wrap gap-2"}>
      <button onClick={() => onEdit(user)} className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-medium text-white hover:bg-sky-700 transition">Edit</button>
      <button onClick={() => onResetPassword(user)} className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-medium text-white hover:bg-amber-600 transition">Reset PW</button>
      {user.is_active && (
        <button onClick={() => onDeactivate(user)} className={mobile ? "col-span-2 rounded-lg bg-rose-600 px-3 py-2 text-xs font-medium text-white hover:bg-rose-700 transition" : "rounded-lg bg-rose-600 px-3 py-2 text-xs font-medium text-white hover:bg-rose-700 transition"}>Nonaktifkan</button>
      )}
    </div>
  );
}
