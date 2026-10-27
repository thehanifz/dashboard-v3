import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AppPage = "dashboard" | "detail" | "asbuilt" | "teskom" | "mitra-config" | "sync" | "profile" | "settings";
export type AsBuiltView = "library" | "generate";

export interface ParsedRoute {
  page: AppPage;
  asbuiltView?: AsBuiltView;
  asbuiltGenerator?: string;
}

export function asbuiltRouteToHash(view: AsBuiltView, generatorId?: string): string {
  if (view === "library") return "asbuilt/library";
  return `asbuilt/generator/${generatorId || "topology"}`;
}

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
  asbuiltGenerator: string;
  teskomAutofillId: string | null;
  /** Data row dari cache tabel untuk autofill Teskom tanpa round-trip API. */
  teskomAutofillData: Record<string, string> | null;
  teskomAutofillSource: "records" | "ptl" | null;
  /** Filter drill-down dari PTL dashboard → PTL detail panel */
  ptlDrillFilter: PtlDrillFilter | null;
  setPage: (page: AppPage) => void;
  setAsBuiltView: (view: AsBuiltView) => void;
  setAsBuiltGenerator: (generatorId: string) => void;
  setAsBuiltRoute: (view: AsBuiltView, generatorId?: string) => void;
  setTeskomAutofill: (idPa: string | null, data?: Record<string, string> | null, source?: "records" | "ptl") => void;
  /** Set filter + navigasi ke PTL detail page */
  drillToPtlDetail: (filter: PtlDrillFilter) => void;
  /** Clear setelah PTLDetailPanel membaca filter */
  clearPtlDrillFilter: () => void;
}

/** Baca hash URL saat ini, return ParsedRoute yang valid atau null. */
function parseHash(rawHash: string): ParsedRoute | null {
  const clean = rawHash.replace(/^#/, "").trim();
  if (!clean) return null;
  const parts = clean.split("/").filter(Boolean);
  const root = parts[0] as AppPage;
  if (!VALID_PAGES.includes(root)) return null;

  if (root === "asbuilt") {
    const sub1 = parts[1];
    const sub2 = parts[2];
    if (sub1 === "library") {
      return { page: "asbuilt", asbuiltView: "library" };
    }
    if (sub1 === "generate" || sub1 === "generator") {
      return {
        page: "asbuilt",
        asbuiltView: "generate",
        asbuiltGenerator: sub2 || "topology",
      };
    }
    return { page: "asbuilt" };
  }

  return { page: root };
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentPage: "dashboard",
      asbuiltView: "library",
      asbuiltGenerator: "topology",
      teskomAutofillId: null,
      teskomAutofillData: null,
      teskomAutofillSource: null,
      ptlDrillFilter: null,

      setPage: (page) => {
        set({ currentPage: page });

        // Semua halaman navigable harus membuat browser-history entry.
        // TRANSIENT_PAGES hanya berarti tidak dipersist ke localStorage,
        // bukan berarti dikeluarkan dari browser navigation.
        const targetHash = page === "asbuilt"
          ? asbuiltRouteToHash(get().asbuiltView, get().asbuiltGenerator)
          : page;
        if (window.location.hash !== `#${targetHash}`) {
          window.location.hash = targetHash;
        }
      },

      setAsBuiltRoute: (view, generatorId) => {
        const nextGen = generatorId || get().asbuiltGenerator || "topology";
        set({ currentPage: "asbuilt", asbuiltView: view, asbuiltGenerator: nextGen });
        const hash = asbuiltRouteToHash(view, nextGen);
        if (window.location.hash !== `#${hash}`) {
          window.location.hash = hash;
        }
      },

      setAsBuiltView: (view) => {
        get().setAsBuiltRoute(view, get().asbuiltGenerator);
      },

      setAsBuiltGenerator: (gen) => {
        get().setAsBuiltRoute("generate", gen);
      },
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
        asbuiltGenerator: state.asbuiltGenerator,
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
  const applyRoute = (route: ParsedRoute | null): boolean => {
    if (!route) return false;
    const patch: Partial<AppState> = { currentPage: route.page };
    if (route.page === "asbuilt") {
      if (route.asbuiltView) patch.asbuiltView = route.asbuiltView;
      if (route.asbuiltGenerator) patch.asbuiltGenerator = route.asbuiltGenerator;
    }
    useAppStore.setState(patch as any);
    return true;
  };

  const initialRoute = parseHash(window.location.hash);
  if (initialRoute) {
    applyRoute(initialRoute);
  } else {
    const stored = useAppStore.getState().currentPage;
    const fallbackPage = TRANSIENT_PAGES.includes(stored) ? "dashboard" : stored;
    useAppStore.setState({ currentPage: fallbackPage });

    const targetHash = fallbackPage === "asbuilt"
      ? asbuiltRouteToHash(useAppStore.getState().asbuiltView, useAppStore.getState().asbuiltGenerator)
      : fallbackPage;
    if (window.location.hash !== `#${targetHash}`) {
      window.location.hash = targetHash;
    }
  }

  const handleHashChange = () => {
    const route = parseHash(window.location.hash);
    if (!applyRoute(route)) {
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
