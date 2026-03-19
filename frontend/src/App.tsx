/**
 * App.tsx
 * Route guard + routing per role.
 * - Superuser → SuperuserPage (User Management, Phase 3)
 * - Engineer / PTL / Mitra → DashboardPage (page dari appStore)
 */
import { useAuthStore } from "./state/authStore";
import LoginPage        from "./pages/LoginPage";
import SuperuserPage    from "./pages/SuperuserPage";
import { useAppStore }  from "./state/appStore";
import DashboardPage    from "./pages/DashboardPage";
import AsBuiltPage      from "./pages/AsBuiltPage";
import TeskomPage       from "./pages/TeskomPage";

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
      {user?.role !== "superuser" && (
        <>
          {page === "dashboard" && <DashboardPage />}
          {page === "asbuilt"   && <AsBuiltPage />}
          {page === "teskom"    && <TeskomPage />}
        </>
      )}
    </AuthGuard>
  );
}