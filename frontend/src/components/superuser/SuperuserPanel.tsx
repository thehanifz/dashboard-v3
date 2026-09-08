/**
 * SuperuserPanel.tsx
 *
 * Content panel untuk role Superuser.
 * Layout utama (Sidebar + Topbar) ditangani oleh MainPage/LayoutShell.
 * Jangan menambahkan Sidebar/Topbar di sini agar tidak terjadi nested layout.
 */
import UserManagementPanel from "./UserManagementPanel";

export default function SuperuserPanel() {
  return <UserManagementPanel />;
}
