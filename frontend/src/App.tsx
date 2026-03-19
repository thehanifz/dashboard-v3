import { useAuthStore } from "./state/authStore";
import { useAppStore }  from "./state/appStore";

import LoginPage              from "./pages/LoginPage";
import SuperuserPage          from "./pages/SuperuserPage";
import DashboardPage          from "./pages/DashboardPage";
import AsBuiltPage            from "./pages/AsBuiltPage";
import TeskomPage             from "./pages/TeskomPage";
import MitraTableConfigPage   from "./pages/MitraTableConfigPage";
import SyncDashboardPage      from "./pages/SyncDashboardPage";
import MitraDashboardPage     from "./pages/MitraDashboardPage";

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
      {user?.role === "superuser" && <SuperuserPage />}

      {user?.role === "mitra" && <MitraDashboardPage />}

      {user?.role !== "superuser" && user?.role !== "mitra" && (
        <>
          {page === "dashboard"    && <DashboardPage />}
          {page === "asbuilt"      && <AsBuiltPage />}
          {page === "teskom"       && <TeskomPage />}
          {page === "mitra-config" && user?.role === "engineer" && <MitraTableConfigPage />}
          {page === "sync"         && user?.role === "engineer" && <SyncDashboardPage />}
        </>
      )}
    </AuthGuard>
  );
}
