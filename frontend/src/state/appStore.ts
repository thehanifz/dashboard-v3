import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AppPage = "dashboard" | "detail" | "asbuilt" | "teskom" | "mitra-config" | "sync" | "profile" | "settings";
export type AsBuiltView = "library" | "generate";

// Halaman yang TIDAK disimpan ke localStorage — selalu reset ke default saat load.
// Halaman ini tetap boleh masuk browser history.
const TRANSIENT_PAGES: AppPage[] = ["profile", "settings"];

// Semua page yang valid — untuk validasi hash dari URL.
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
  /** Data row dari cache tabel untuk autofill Teskom tanpa round-trip API. */
  teskomAutofillData: Record<string, string> | null;
  teskomAutofillSource: "records" | "ptl" | null;
  /** Filter drill-down dari PTL dashboard → PTL detail panel */
  ptlDrillFilter: PtlDrillFilter | null;
  setPage: (page: AppPage) => void;
  setAsBuiltView: (view: AsBuiltView) => void;
  setTeskomAutofill: (idPa: string | null, data?: Record<string, string> | null, source?: "records" | "ptl") => void;
  /** Set filter + navigasi ke PTL detail page */
  drillToPtlDetail: (filter: PtlDrillFilter) => void;
  /** Clear setelah PTLDetailPanel membaca filter */
  clearPtlDrillFilter: () => void;
}

/** Baca hash URL saat ini, return AppPage yang valid atau null. */
function getPageFromHash(): AppPage | null {
  const hash = window.location.hash.replace(/^#/, "").trim() as AppPage;
  return VALID_PAGES.includes(hash) ? hash : null;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentPage: "dashboard",
      asbuiltView: "library",
      teskomAutofillId: null,
      teskomAutofillData: null,
      teskomAutofillSource: null,
      ptlDrillFilter: null,

      setPage: (page) => {
        set({ currentPage: page });

        // Semua halaman navigable harus membuat browser-history entry.
        // TRANSIENT_PAGES hanya berarti tidak dipersist ke localStorage,
        // bukan berarti dikeluarkan dari browser navigation.
        if (window.location.hash !== `#${page}`) {
          window.location.hash = page;
        }
      },

      setAsBuiltView: (view) => set({ asbuiltView: view }),
      setTeskomAutofill: (idPa, data = null, source = null) =>
        set({ teskomAutofillId: idPa, teskomAutofillData: data, teskomAutofillSource: source }),

      drillToPtlDetail: (filter) => {
        set({ ptlDrillFilter: filter });
        // Navigasi ke page "detail" — PTLDetailPanel akan consume filter ini.
        get().setPage("detail");
      },

      clearPtlDrillFilter: () => set({ ptlDrillFilter: null }),
    }),
    {
      name: "app-navigation",
      version: 2,
      migrate: (persisted: any) => ({
        ...persisted,
        teskomAutofillId: null,
        teskomAutofillData: null,
        teskomAutofillSource: null,
      }),
      partialize: (state) => ({
        // Profile/Settings tidak dipersist, tetapi tetap bisa dinavigasikan
        // lewat browser history selama session berjalan.
        currentPage: TRANSIENT_PAGES.includes(state.currentPage) ? "dashboard" : state.currentPage,
        asbuiltView: state.asbuiltView,
        // Autofill payload bersifat transient; jangan dipersist ke localStorage.
        // ptlDrillFilter TIDAK di-persist — transient state.
      }),
    }
  )
);

/**
 * initHashNavigation — panggil sekali di main.tsx setelah store siap.
 * - Membaca hash awal saat pertama load
 * - Mendengarkan hashchange untuk tombol Back/Forward browser
 */
export function initHashNavigation() {
  const initialPage = getPageFromHash();
  if (initialPage) {
    // Hash adalah sumber navigasi URL saat tersedia, termasuk profile/settings.
    useAppStore.setState({ currentPage: initialPage });
  } else {
    const stored = useAppStore.getState().currentPage;
    const fallbackPage = TRANSIENT_PAGES.includes(stored) ? "dashboard" : stored;
    useAppStore.setState({ currentPage: fallbackPage });

    if (window.location.hash !== `#${fallbackPage}`) {
      window.location.hash = fallbackPage;
    }
  }

  const handleHashChange = () => {
    const page = getPageFromHash();
    if (page) {
      useAppStore.setState({ currentPage: page });
    } else {
      // Back dari #dashboard menuju URL tanpa hash tetap harus kembali ke
      // halaman dashboard, bukan meninggalkan UI pada page sebelumnya.
      useAppStore.setState({ currentPage: "dashboard" });
    }
  };

  window.addEventListener("hashchange", handleHashChange);

  // hashchange sudah cukup untuk browser Back/Forward; popstate tidak
  // diperlukan untuk navigasi hash dan justru dapat membuat state ganda.
  return () => window.removeEventListener("hashchange", handleHashChange);
}
