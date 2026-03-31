import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AppPage = "dashboard" | "detail" | "asbuilt" | "teskom" | "mitra-config" | "sync" | "profile" | "settings";
export type AsBuiltView = "library" | "generate";

// Halaman yang TIDAK disimpan ke localStorage — selalu reset ke default saat load
const TRANSIENT_PAGES: AppPage[] = ["profile", "settings"];

// Semua page yang valid — untuk validasi hash dari URL
const VALID_PAGES: AppPage[] = ["dashboard", "detail", "asbuilt", "teskom", "mitra-config", "sync", "profile", "settings"];

/** Filter yang di-pass dari PTL Summary Dashboard ke PTL Detail Panel */
export interface PtlDrillFilter {
  /** Kolom yang di-filter */
  column: string;
  /** Nilai yang dipilih */
  values: string[];
  /** Label untuk toast/info, mis. "Status PA = On Progress" */
  label?: string;
}

interface AppState {
  currentPage: AppPage;
  asbuiltView: AsBuiltView;
  teskomAutofillId: string | null;
  /** Filter drill-down dari PTL dashboard → PTL detail panel */
  ptlDrillFilter: PtlDrillFilter | null;
  setPage: (page: AppPage) => void;
  setAsBuiltView: (view: AsBuiltView) => void;
  setTeskomAutofill: (idPa: string | null) => void;
  /** Set filter + navigasi ke PTL detail page */
  drillToPtlDetail: (filter: PtlDrillFilter) => void;
  /** Clear setelah PTLDetailPanel membaca filter */
  clearPtlDrillFilter: () => void;
}

/** Baca hash URL saat ini, return AppPage yang valid atau null */
function getPageFromHash(): AppPage | null {
  const hash = window.location.hash.replace("#", "").trim() as AppPage;
  return VALID_PAGES.includes(hash) ? hash : null;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentPage:       "dashboard",
      asbuiltView:       "library",
      teskomAutofillId:  null,
      ptlDrillFilter:    null,

      setPage: (page) => {
        set({ currentPage: page });
        if (!TRANSIENT_PAGES.includes(page)) {
          window.location.hash = page;
        } else {
          history.replaceState(null, "", window.location.pathname + window.location.search);
        }
      },

      setAsBuiltView:    (view) => set({ asbuiltView: view }),
      setTeskomAutofill: (idPa) => set({ teskomAutofillId: idPa }),

      drillToPtlDetail: (filter) => {
        set({ ptlDrillFilter: filter });
        // Navigasi ke page "detail" — PTLDetailPanel akan consume filter ini
        get().setPage("detail");
      },

      clearPtlDrillFilter: () => set({ ptlDrillFilter: null }),
    }),
    {
      name: "app-navigation",
      partialize: (state) => ({
        currentPage:      TRANSIENT_PAGES.includes(state.currentPage) ? "dashboard" : state.currentPage,
        asbuiltView:      state.asbuiltView,
        teskomAutofillId: state.teskomAutofillId,
        // ptlDrillFilter TIDAK di-persist — transient state
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
  const initialPage = getPageFromHash();
  if (initialPage && !TRANSIENT_PAGES.includes(initialPage)) {
    useAppStore.getState().setPage(initialPage);
  } else if (!initialPage) {
    const stored = useAppStore.getState().currentPage;
    if (!TRANSIENT_PAGES.includes(stored)) {
      window.location.hash = stored;
    }
  }

  window.addEventListener("popstate", () => {
    const page = getPageFromHash();
    if (page && !TRANSIENT_PAGES.includes(page)) {
      useAppStore.setState({ currentPage: page });
    }
  });
}
