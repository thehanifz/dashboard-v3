import { useEffect } from "react";
import { useAppStore } from "./state/appStore";
import { useThemeStore } from "./state/themeStore";
import DashboardPage from "./pages/DashboardPage";
import AsBuiltPage from "./pages/AsBuiltPage";
import TeskomPage from "./pages/TeskomPage";

export default function App() {
  const currentPage = useAppStore((s) => s.currentPage);
  const theme       = useThemeStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  if (currentPage === "asbuilt")  return <AsBuiltPage />;
  if (currentPage === "teskom")   return <TeskomPage />;
  return <DashboardPage />;
}
