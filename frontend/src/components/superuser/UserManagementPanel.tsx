/**
 * UserManagementPanel.tsx
 * Panel manajemen user untuk Superuser.
 * Menggantikan UserManagementPage.tsx yang lama (hardcoded Tailwind, tidak dark-mode aware).
 *
 * Dipakai di SuperuserPanel sebagai konten tab "users".
 */
import { useEffect, useState } from "react";
import UserTable              from "../admin/UserTable";
import UserFormModal          from "../admin/UserFormModal";
import ResetPasswordModal     from "../admin/ResetPasswordModal";
import ConfirmDeactivateModal from "../admin/ConfirmDeactivateModal";
import {
  adminApi,
  type CreateUserPayload,
  type UpdateUserPayload,
  type UserItem,
} from "../../services/adminApi";

export default function UserManagementPanel() {
  const [users, setUsers]             = useState<UserItem[]>([]);
  const [loading, setLoading]         = useState(true);
  const [submitLoading, setSubmit]    = useState(false);
  const [error, setError]             = useState("");

  const [isCreateOpen, setIsCreate]   = useState(false);
  const [editingUser, setEditing]     = useState<UserItem | null>(null);
  const [resetUser, setResetUser]     = useState<UserItem | null>(null);
  const [deactivateUser, setDeact]    = useState<UserItem | null>(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError("");
      setUsers(await adminApi.getUsers());
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Gagal memuat data user");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const handleCreate = async (payload: CreateUserPayload | UpdateUserPayload) => {
    try {
      setSubmit(true);
      await adminApi.createUser(payload as CreateUserPayload);
      setIsCreate(false);
      await loadUsers();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Gagal membuat user");
    } finally { setSubmit(false); }
  };

  const handleEdit = async (payload: CreateUserPayload | UpdateUserPayload) => {
    if (!editingUser) return;
    try {
      setSubmit(true);
      await adminApi.updateUser(editingUser.id, payload as UpdateUserPayload);
      setEditing(null);
      await loadUsers();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Gagal mengubah user");
    } finally { setSubmit(false); }
  };

  const handleResetPassword = async (newPassword: string) => {
    if (!resetUser) return;
    try {
      setSubmit(true);
      await adminApi.resetPassword(resetUser.id, { new_password: newPassword });
      setResetUser(null);
      await loadUsers();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Gagal reset password");
    } finally { setSubmit(false); }
  };

  const handleDeactivate = async () => {
    if (!deactivateUser) return;
    try {
      setSubmit(true);
      await adminApi.deactivateUser(deactivateUser.id);
      setDeact(null);
      await loadUsers();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Gagal menonaktifkan user");
    } finally { setSubmit(false); }
  };

  return (
    <div className="p-4 lg:p-6">
      <section
        className="overflow-hidden rounded-2xl border shadow-sm"
        style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
      >
        <div
          className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="min-w-0">
            <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Daftar User</h2>
            <p className="mt-0.5 text-sm" style={{ color: "var(--text-secondary)" }}>
              Kelola akun Engineer, PTL, dan Mitra.
            </p>
          </div>
          <button
            onClick={() => setIsCreate(true)}
            className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 sm:w-auto"
            style={{ background: "var(--accent)" }}
          >
            + Tambah User
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-4 rounded-xl px-4 py-3 text-sm"
            style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
            {error}
          </div>
        )}

        <div className="p-3 sm:p-4">
          {loading ? (
            <div className="rounded-xl border p-8 text-center text-sm"
              style={{ background: "var(--bg-surface2)", borderColor: "var(--border)", color: "var(--text-muted)" }}>
              Memuat data user...
            </div>
          ) : (
            <UserTable
              users={users}
              onEdit={setEditing}
              onResetPassword={setResetUser}
              onDeactivate={setDeact}
            />
          )}
        </div>
      </section>

      {/* Modals */}
      <UserFormModal
        mode="create"
        open={isCreateOpen}
        loading={submitLoading}
        onClose={() => setIsCreate(false)}
        onSubmit={handleCreate}
      />
      <UserFormModal
        mode="edit"
        open={!!editingUser}
        user={editingUser}
        loading={submitLoading}
        onClose={() => setEditing(null)}
        onSubmit={handleEdit}
      />
      <ResetPasswordModal
        open={!!resetUser}
        user={resetUser}
        loading={submitLoading}
        onClose={() => setResetUser(null)}
        onSubmit={handleResetPassword}
      />
      <ConfirmDeactivateModal
        open={!!deactivateUser}
        user={deactivateUser}
        loading={submitLoading}
        onClose={() => setDeact(null)}
        onConfirm={handleDeactivate}
      />
    </div>
  );
}
