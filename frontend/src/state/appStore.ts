import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AppPage = "dashboard" | "asbuilt" | "teskom";
export type AsBuiltView = "library" | "generate";

interface AppState {
  currentPage: AppPage;
  asbuiltView: AsBuiltView;
  setPage: (page: AppPage) => void;
  setAsBuiltView: (view: AsBuiltView) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentPage: "dashboard",
      asbuiltView: "library",
      setPage: (page) => set({ currentPage: page }),
      setAsBuiltView: (view) => set({ asbuiltView: view }),
    }),
    { name: "app-navigation" }
  )
);