import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AppPage = "dashboard" | "detail" | "asbuilt" | "teskom" | "mitra-config" | "sync" | "profile";
export type AsBuiltView = "library" | "generate";

// Halaman yang TIDAK disimpan ke localStorage — selalu reset ke default saat load
const TRANSIENT_PAGES: AppPage[] = ["profile"];

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
    {
      name: "app-navigation",
      // Hanya simpan currentPage kalau bukan halaman transient
      partialize: (state) => ({
        currentPage:      TRANSIENT_PAGES.includes(state.currentPage) ? "dashboard" : state.currentPage,
        asbuiltView:      state.asbuiltView,
        teskomAutofillId: state.teskomAutofillId,
      }),
    }
  )
);