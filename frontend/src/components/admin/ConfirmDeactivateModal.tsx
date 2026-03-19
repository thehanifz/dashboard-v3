import type { UserItem } from "../../services/adminApi";

type Props = {
  open: boolean;
  user: UserItem | null;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

export default function ConfirmDeactivateModal({
  open,
  user,
  loading,
  onClose,
  onConfirm,
}: Props) {
  if (!open || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-slate-800">Nonaktifkan User</h2>
        <p className="mt-2 text-sm text-slate-600">
          Nonaktifkan user <span className="font-medium">{user.username}</span>? Semua refresh token aktif user ini akan direvoke.
        </p>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2">
            Batal
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="rounded-lg bg-rose-600 px-4 py-2 text-white hover:bg-rose-700 disabled:opacity-60"
          >
            {loading ? "Memproses..." : "Ya, Nonaktifkan"}
          </button>
        </div>
      </div>
    </div>
  );
}
