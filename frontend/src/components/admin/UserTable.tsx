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
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-4 py-3 text-left font-medium">No</th>
              <th className="px-4 py-3 text-left font-medium">Username</th>
              <th className="px-4 py-3 text-left font-medium">Nama Lengkap</th>
              <th className="px-4 py-3 text-left font-medium">Role</th>
              <th className="px-4 py-3 text-left font-medium">GSheet URL</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Dibuat</th>
              <th className="px-4 py-3 text-left font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                  Belum ada user. Klik "Tambah User" untuk membuat akun baru.
                </td>
              </tr>
            ) : (
              users.map((user, index) => (
                <tr
                  key={user.id}
                  className="border-t border-slate-100 hover:bg-slate-50 transition"
                >
                  <td className="px-4 py-3 text-slate-500">{index + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {user.username}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{user.nama_lengkap}</td>
                  <td className="px-4 py-3">
                    <span
                      className={[
                        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                        user.role === "engineer"
                          ? "bg-sky-100 text-sky-700"
                          : user.role === "ptl"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-emerald-100 text-emerald-700",
                      ].join(" ")}
                    >
                      {roleLabel(user.role)}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-[220px]">
                    {user.gsheet_url ? (
                      <a
                        href={user.gsheet_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block truncate text-sky-600 underline hover:text-sky-800"
                        title={user.gsheet_url}
                      >
                        {user.gsheet_url}
                      </a>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={[
                        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                        user.is_active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-rose-100 text-rose-700",
                      ].join(" ")}
                    >
                      {user.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {formatDate(user.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => onEdit(user)}
                        className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs text-white hover:bg-sky-700 transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onResetPassword(user)}
                        className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs text-white hover:bg-amber-600 transition"
                      >
                        Reset PW
                      </button>
                      {user.is_active && (
                        <button
                          onClick={() => onDeactivate(user)}
                          className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs text-white hover:bg-rose-700 transition"
                        >
                          Nonaktifkan
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
