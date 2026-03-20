import { useAuthStore } from "./state/authStore";
import { useAppStore }  from "./state/appStore";

import LoginPage            from "./pages/LoginPage";
import SuperuserPage        from "./pages/SuperuserPage";
import DashboardPage        from "./pages/DashboardPage";
import AsBuiltPage          from "./pages/AsBuiltPage";
import TeskomPage           from "./pages/TeskomPage";
import MitraTableConfigPage from "./pages/MitraTableConfigPage";
import SyncDashboardPage    from "./pages/SyncDashboardPage";
import MitraDashboardPage   from "./pages/MitraDashboardPage";
import PTLDashboardPage     from "./pages/PTLDashboardPage";
import ProfilePage          from "./pages/ProfilePage";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuthStore();
  if (!isLoggedIn()) return <LoginPage />;
  return <>{children}</>;
}

export default function App() {
  const { user }              = useAuthStore();
  const { currentPage: page } = useAppStore();

  return (
    <AuthGuard>
      {/* Superuser */}
      {user?.role === "superuser" && (
        page === "profile" ? <ProfilePage /> : <SuperuserPage />
      )}

      {/* PTL — dashboard dari GSheet sendiri */}
      {user?.role === "ptl" && (
        page === "profile" ? <ProfilePage /> : <PTLDashboardPage />
      )}

      {/* Mitra */}
      {user?.role === "mitra" && (
        page === "profile" ? <ProfilePage /> : <MitraDashboardPage />
      )}

      {/* Engineer */}
      {user?.role === "engineer" && (
        <>
          {page === "profile"      && <ProfilePage />}
          {page === "dashboard"    && <DashboardPage />}
          {page === "asbuilt"      && <AsBuiltPage />}
          {page === "teskom"       && <TeskomPage />}
          {page === "mitra-config" && <MitraTableConfigPage />}
          {page === "sync"         && <SyncDashboardPage />}
        </>
      )}
    </AuthGuard>
  );
}