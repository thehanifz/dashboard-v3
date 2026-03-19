import { useEffect, useState } from "react";
import type { UserItem } from "../../services/adminApi";

type Props = {
  open: boolean;
  user: UserItem | null;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (newPassword: string) => Promise<void>;
};

export default function ResetPasswordModal({ open, user, loading, onClose, onSubmit }: Props) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setNewPassword("");
      setConfirmPassword("");
      setError("");
    }
  }, [open]);

  if (!open || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("Password minimal 8 karakter");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password tidak sama");
      return;
    }

    await onSubmit(newPassword);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-slate-800">Reset Password</h2>
        <p className="mt-1 text-sm text-slate-500">
          Password untuk user <span className="font-medium">{user.username}</span> akan diganti dan semua sesi aktif akan dicabut.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Password Baru</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Konfirmasi Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>

          {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2">
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-amber-500 px-4 py-2 text-white hover:bg-amber-600 disabled:opacity-60"
            >
              {loading ? "Memproses..." : "Reset Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
