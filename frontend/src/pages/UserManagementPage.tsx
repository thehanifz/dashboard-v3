import { useEffect, useState } from "react";
import ConfirmDeactivateModal from "../components/admin/ConfirmDeactivateModal";
import ResetPasswordModal from "../components/admin/ResetPasswordModal";
import UserFormModal from "../components/admin/UserFormModal";
import UserTable from "../components/admin/UserTable";
import {
  adminApi,
  type CreateUserPayload,
  type UpdateUserPayload,
  type UserItem,
} from "../services/adminApi";

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [resetUser, setResetUser] = useState<UserItem | null>(null);
  const [deactivateUser, setDeactivateUser] = useState<UserItem | null>(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError("");
      const items = await adminApi.getUsers();
      setUsers(items);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Gagal memuat data user");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreate = async (payload: CreateUserPayload | UpdateUserPayload) => {
    try {
      setSubmitLoading(true);
      await adminApi.createUser(payload as CreateUserPayload);
      setIsCreateOpen(false);
      await loadUsers();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Gagal membuat user");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleEdit = async (payload: CreateUserPayload | UpdateUserPayload) => {
    if (!editingUser) return;
    try {
      setSubmitLoading(true);
      await adminApi.updateUser(editingUser.id, payload as UpdateUserPayload);
      setEditingUser(null);
      await loadUsers();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Gagal mengubah user");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleResetPassword = async (newPassword: string) => {
    if (!resetUser) return;
    try {
      setSubmitLoading(true);
      await adminApi.resetPassword(resetUser.id, { new_password: newPassword });
      setResetUser(null);
      await loadUsers();
      alert("Password berhasil direset");
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Gagal reset password");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateUser) return;
    try {
      setSubmitLoading(true);
      await adminApi.deactivateUser(deactivateUser.id);
      setDeactivateUser(null);
      await loadUsers();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Gagal menonaktifkan user");
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">User Management</h1>
          <p className="text-sm text-slate-500">
            Kelola akun Engineer, PTL, dan Mitra.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="rounded-xl bg-sky-600 px-4 py-2.5 text-white hover:bg-sky-700"
        >
          Tambah User
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-500">
          Memuat data user...
        </div>
      ) : (
        <UserTable
          users={users}
          onEdit={setEditingUser}
          onResetPassword={setResetUser}
          onDeactivate={setDeactivateUser}
        />
      )}

      <UserFormModal
        mode="create"
        open={isCreateOpen}
        loading={submitLoading}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreate}
      />

      <UserFormModal
        mode="edit"
        open={!!editingUser}
        user={editingUser}
        loading={submitLoading}
        onClose={() => setEditingUser(null)}
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
        onClose={() => setDeactivateUser(null)}
        onConfirm={handleDeactivate}
      />
    </div>
  );
}
