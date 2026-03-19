import { useEffect, useState } from "react";
import type { CreateUserPayload, UpdateUserPayload, UserItem, UserRole } from "../../services/adminApi";

type Props = {
  mode: "create" | "edit";
  open: boolean;
  user?: UserItem | null;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateUserPayload | UpdateUserPayload) => Promise<void>;
};

export default function UserFormModal({ mode, open, user, loading, onClose, onSubmit }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [namaLengkap, setNamaLengkap] = useState("");
  const [role, setRole] = useState<UserRole>("engineer");
  const [gsheetUrl, setGsheetUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && user) {
      setUsername(user.username);
      setPassword("");
      setNamaLengkap(user.nama_lengkap);
      setRole((user.role as UserRole) || "engineer");
      setGsheetUrl(user.gsheet_url || "");
      setIsActive(user.is_active);
      setError("");
      return;
    }

    setUsername("");
    setPassword("");
    setNamaLengkap("");
    setRole("engineer");
    setGsheetUrl("");
    setIsActive(true);
    setError("");
  }, [mode, open, user]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!namaLengkap.trim()) {
      setError("Nama lengkap wajib diisi");
      return;
    }

    if (role === "ptl" && !gsheetUrl.trim()) {
      setError("GSheet URL wajib diisi untuk role PTL");
      return;
    }

    if (mode === "create") {
      if (!username.trim()) {
        setError("Username wajib diisi");
        return;
      }
      if (password.length < 8) {
        setError("Password minimal 8 karakter");
        return;
      }

      await onSubmit({
        username: username.trim(),
        password,
        nama_lengkap: namaLengkap.trim(),
        role,
        gsheet_url: role === "ptl" ? gsheetUrl.trim() : null,
      });
      return;
    }

    await onSubmit({
      nama_lengkap: namaLengkap.trim(),
      role,
      gsheet_url: role === "ptl" ? gsheetUrl.trim() : null,
      is_active: isActive,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-slate-800">
            {mode === "create" ? "Tambah User" : "Edit User"}
          </h2>
          <p className="text-sm text-slate-500">
            {mode === "create"
              ? "Buat akun user baru."
              : "Ubah data user. Username tidak bisa diubah."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "create" ? (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium">Username</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2"
                  placeholder="misal: ptl_asep"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2"
                  placeholder="minimal 8 karakter"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="mb-1 block text-sm font-medium">Username</label>
              <input
                value={username}
                disabled
                className="w-full rounded-lg border bg-slate-100 px-3 py-2"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium">Nama Lengkap</label>
            <input
              value={namaLengkap}
              onChange={(e) => setNamaLengkap(e.target.value)}
              className="w-full rounded-lg border px-3 py-2"
              placeholder="Harus sesuai dengan data di GSheet"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full rounded-lg border px-3 py-2"
            >
              <option value="engineer">Engineer</option>
              <option value="ptl">PTL</option>
              <option value="mitra">Mitra</option>
            </select>
          </div>

          {role === "ptl" && (
            <div>
              <label className="mb-1 block text-sm font-medium">GSheet URL</label>
              <input
                value={gsheetUrl}
                onChange={(e) => setGsheetUrl(e.target.value)}
                className="w-full rounded-lg border px-3 py-2"
                placeholder="https://docs.google.com/spreadsheets/..."
              />
            </div>
          )}

          {mode === "edit" && (
            <div className="flex items-center gap-2">
              <input
                id="is_active"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <label htmlFor="is_active" className="text-sm">
                User aktif
              </label>
            </div>
          )}

          {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border px-4 py-2 text-slate-700"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-sky-600 px-4 py-2 text-white hover:bg-sky-700 disabled:opacity-60"
            >
              {loading ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
