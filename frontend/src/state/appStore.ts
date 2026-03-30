import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AppPage = "dashboard" | "detail" | "asbuilt" | "teskom" | "mitra-config" | "sync" | "profile" | "settings";
export type AsBuiltView = "library" | "generate";

// Halaman yang TIDAK disimpan ke localStorage — selalu reset ke default saat load
const TRANSIENT_PAGES: AppPage[] = ["profile", "settings"];

// Semua page yang valid — untuk validasi hash dari URL
const VALID_PAGES: AppPage[] = ["dashboard", "detail", "asbuilt", "teskom", "mitra-config", "sync", "profile", "settings"];

interface AppState {
  currentPage: AppPage;
  asbuiltView: AsBuiltView;
  teskomAutofillId: string | null;
  setPage: (page: AppPage) => void;
  setAsBuiltView: (view: AsBuiltView) => void;
  setTeskomAutofill: (idPa: string | null) => void;
}

/** Baca hash URL saat ini, return AppPage yang valid atau null */
function getPageFromHash(): AppPage | null {
  const hash = window.location.hash.replace("#", "").trim() as AppPage;
  return VALID_PAGES.includes(hash) ? hash : null;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentPage:       "dashboard",
      asbuiltView:       "library",
      teskomAutofillId:  null,

      setPage: (page) => {
        // Update state
        set({ currentPage: page });
        // Sync ke URL hash — transient pages tidak disimpan ke hash
        // agar refresh halaman tidak stuck di profile/settings tanpa auth
        if (!TRANSIENT_PAGES.includes(page)) {
          window.location.hash = page;
        } else {
          // Hapus hash untuk transient pages
          history.replaceState(null, "", window.location.pathname + window.location.search);
        }
      },

      setAsBuiltView:    (view) => set({ asbuiltView: view }),
      setTeskomAutofill: (idPa) => set({ teskomAutofillId: idPa }),
    }),
    {
      name: "app-navigation",
      partialize: (state) => ({
        currentPage:      TRANSIENT_PAGES.includes(state.currentPage) ? "dashboard" : state.currentPage,
        asbuiltView:      state.asbuiltView,
        teskomAutofillId: state.teskomAutofillId,
      }),
    }
  )
);

/**
 * initHashNavigation — panggil sekali di main.tsx setelah store siap.
 * - Membaca hash awal saat pertama load
 * - Mendengarkan event popstate (tombol back/forward browser)
 */
export function initHashNavigation() {
  // Baca hash awal saat load (misal user bookmark /#dashboard)
  const initialPage = getPageFromHash();
  if (initialPage && !TRANSIENT_PAGES.includes(initialPage)) {
    useAppStore.getState().setPage(initialPage);
  } else if (!initialPage) {
    // Tidak ada hash atau tidak valid — sync hash dari state yang tersimpan
    const stored = useAppStore.getState().currentPage;
    if (!TRANSIENT_PAGES.includes(stored)) {
      window.location.hash = stored;
    }
  }

  // Dengarkan back/forward browser
  window.addEventListener("popstate", () => {
    const page = getPageFromHash();
    if (page && !TRANSIENT_PAGES.includes(page)) {
      // Update state tanpa push history baru (sudah di-handle popstate)
      useAppStore.setState({ currentPage: page });
    }
  });
}
