/**
 * App.tsx
 * Root component — auth bootstrap + routing level atas.
 */
import { useEffect } from "react";
import { useAuthStore } from "./state/authStore";
import LoginPage from "./pages/LoginPage";
import MainPage from "./pages/MainPage";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { authReady, isLoggedIn, initializeSession } = useAuthStore();

  useEffect(() => {
    void initializeSession();
  }, [initializeSession]);

  if (!authReady) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: "var(--bg-app, #0f172a)" }}>
        <div className="text-sm" style={{ color: "var(--text-muted, #94a3b8)" }}>Memulihkan sesi...</div>
      </div>
    );
  }

  if (!isLoggedIn()) return <LoginPage />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthGuard>
      <div className="h-screen overflow-hidden flex flex-col">
        <MainPage />
      </div>
    </AuthGuard>
  );
}
