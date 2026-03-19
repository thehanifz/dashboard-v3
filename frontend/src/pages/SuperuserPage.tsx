/**
 * SuperuserPage.tsx
 * Halaman utama Superuser. Hanya menampilkan User Management dan Profil.
 * Tidak menggunakan React Router — navigasi via state activeMenu.
 */

import { useEffect, useState } from "react";
import { useAuthStore }        from "../state/authStore";
import { adminApi }            from "../services/adminApi";
import type {
  UserItem,
  CreateUserPayload,
  UpdateUserPayload,
}                              from "../services/adminApi";

import UserTable              from "../components/admin/UserTable";
import UserFormModal          from "../components/admin/UserFormModal";
import ResetPasswordModal     from "../components/admin/ResetPasswordModal";
import ConfirmDeactivateModal from "../components/admin/ConfirmDeactivateModal";

type Menu = "users" | "profile";

export default function SuperuserPage() {
  const { user, clearAuth: logout } = useAuthStore();

  const [activeMenu, setActiveMenu]   = useState<Menu>("users");
  const [mobileOpen, setMobileOpen]   = useState(false);

  const [users, setUsers]             = useState<UserItem[]>([]);
  const [loading, setLoading]         = useState(true);
  const [submitLoading, setSubmit]    = useState(false);
  const [pageError, setPageError]     = useState("");

  const [isCreateOpen, setIsCreate]   = useState(false);
  const [editingUser, setEditing]     = useState<UserItem | null>(null);
  const [resetUser, setResetUser]     = useState<UserItem | null>(null);
  const [deactivateUser, setDeact]    = useState<UserItem | null>(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setPageError("");
      const items = await adminApi.getUsers();
      setUsers(items);
    } catch (err: any) {
      setPageError(err?.response?.data?.detail || "Gagal memuat data user");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeMenu === "users") loadUsers();
  }, [activeMenu]);

  const handleCreate = async (payload: CreateUserPayload | UpdateUserPayload) => {
    try {
      setSubmit(true);
      await adminApi.createUser(payload as CreateUserPayload);
      setIsCreate(false);
      await loadUsers();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Gagal membuat user");
    } finally {
      setSubmit(false);
    }
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
    } finally {
      setSubmit(false);
    }
  };

  const handleResetPassword = async (newPassword: string) => {
    if (!resetUser) return;
    try {
      setSubmit(true);
      await adminApi.resetPassword(resetUser.id, { new_password: newPassword });
      setResetUser(null);
      await loadUsers();
      alert("Password berhasil direset");
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Gagal reset password");
    } finally {
      setSubmit(false);
    }
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
    } finally {
      setSubmit(false);
    }
  };

  const handleLogout = () => {
    if (typeof logout === "function") logout();
  };

  const Sidebar = ({ mobile = false }) => (
    <div className={`flex flex-col ${mobile ? "h-full" : "h-screen sticky top-0"}`}>
      <div className="border-b border-slate-200 px-6 py-5">
        <h1 className="text-xl font-bold text-slate-800">Dashboard V3</h1>
        <p className="mt-1 text-sm text-slate-500">Superuser Panel</p>
      </div>

      <div className="border-b border-slate-200 px-6 py-4">
        <p className="text-sm font-medium text-slate-800">
          {user?.nama_lengkap || user?.username || "Superuser"}
        </p>
        <span className="mt-1 inline-flex rounded-full bg-violet-100 px-2.5 py-1 text-xs text-violet-700">
          Superuser
        </span>
      </div>

      <nav className="flex-1 space-y-1 px-4 py-4">
        {(
          [
            { key: "users",   label: "User Management" },
            { key: "profile", label: "Profil" },
          ] as { key: Menu; label: string }[]
        ).map((item) => (
          <button
            key={item.key}
            onClick={() => {
              setActiveMenu(item.key);
              setMobileOpen(false);
            }}
            className={[
              "block w-full rounded-xl px-4 py-3 text-left text-sm transition",
              activeMenu === item.key
                ? "bg-violet-600 text-white"
                : "text-slate-700 hover:bg-slate-100",
            ].join(" ")}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="border-t border-slate-200 p-4">
        <button
          onClick={handleLogout}
          className="w-full rounded-xl bg-rose-600 px-4 py-3 text-sm font-medium text-white hover:bg-rose-700"
        >
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-800">
      {/* Sidebar Desktop */}
      <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white lg:block">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h1 className="text-lg font-bold text-slate-800">Dashboard V3</h1>
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-lg border px-3 py-1.5 text-sm"
              >
                Tutup
              </button>
            </div>
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex items-center justify-between px-4 py-3 lg:px-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileOpen(true)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm lg:hidden"
              >
                Menu
              </button>
              <span className="text-lg font-semibold text-slate-800">
                {activeMenu === "users"   && "User Management"}
                {activeMenu === "profile" && "Profil"}
              </span>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-slate-700">
                {user?.nama_lengkap || user?.username || "Superuser"}
              </p>
              <p className="text-xs text-slate-500">{user?.username}</p>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="min-w-0 flex-1 p-4 lg:p-6">
          {/* === USER MANAGEMENT === */}
          {activeMenu === "users" && (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-800">
                    Daftar User
                  </h2>
                  <p className="text-sm text-slate-500">
                    Kelola akun Engineer, PTL, dan Mitra.
                  </p>
                </div>
                <button
                  onClick={() => setIsCreate(true)}
                  className="rounded-xl bg-violet-600 px-4 py-2.5 text-white hover:bg-violet-700"
                >
                  + Tambah User
                </button>
              </div>

              {pageError && (
                <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {pageError}
                </div>
              )}

              {loading ? (
                <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-500">
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
          )}

          {/* === PROFIL === */}
          {activeMenu === "profile" && (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-slate-800">Profil</h2>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="space-y-3 text-sm">
                  <div className="flex gap-3">
                    <span className="w-32 shrink-0 text-slate-500">Username</span>
                    <span className="font-medium text-slate-800">
                      {user?.username || "-"}
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <span className="w-32 shrink-0 text-slate-500">Nama</span>
                    <span className="font-medium text-slate-800">
                      {user?.nama_lengkap || "-"}
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <span className="w-32 shrink-0 text-slate-500">Role</span>
                    <span className="inline-flex rounded-full bg-violet-100 px-2.5 py-1 text-xs text-violet-700">
                      Superuser
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* === MODALS === */}
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
