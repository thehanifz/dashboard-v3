/**
 * App.tsx
 * Root component — hanya handle auth guard dan routing level atas.
 *
 * Sebelumnya tiap role punya blok routing sendiri di sini.
 * Sekarang semua role di-handle oleh MainPage.tsx,
 * sehingga App.tsx tetap ringkas dan mudah di-maintain.
 */
import { useAuthStore } from "./state/authStore";
import { useAppStore }  from "./state/appStore";

import LoginPage   from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
import MainPage    from "./pages/MainPage";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuthStore();
  if (!isLoggedIn()) return <LoginPage />;
  return <>{children}</>;
}

export default function App() {
  const { currentPage: page } = useAppStore();

  return (
    <AuthGuard>
      <div className="h-screen overflow-hidden flex flex-col">
        {page === "profile" ? <ProfilePage /> : <MainPage />}
      </div>
    </AuthGuard>
  );
}
