import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AppPage = "dashboard" | "asbuilt" | "teskom" | "mitra-config" | "sync";
export type AsBuiltView = "library" | "generate";

interface AppState {
  currentPage: AppPage;
  asbuiltView: AsBuiltView;
  teskomAutofillId: string | null;
  setPage: (page: AppPage) => void;
  setAsBuiltView: (view: AsBuiltView) => void;
  setTeskomAutofill: (idPa: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentPage:       "dashboard",
      asbuiltView:       "library",
      teskomAutofillId:  null,
      setPage:           (page) => set({ currentPage: page }),
      setAsBuiltView:    (view) => set({ asbuiltView: view }),
      setTeskomAutofill: (idPa) => set({ teskomAutofillId: idPa }),
    }),
    { name: "app-navigation" }
  )
);
