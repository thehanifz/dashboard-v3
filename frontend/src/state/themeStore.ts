import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useAppearanceStore } from "./appearanceStore";
import { usePresetStore } from "./presetStore";

type Theme = "light" | "dark";

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
  exportConfig: () => void;
  importConfig: (file: File) => Promise<string>;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "light",

      toggleTheme: () => {
        const next = get().theme === "light" ? "dark" : "light";
        set({ theme: next });
        document.documentElement.setAttribute("data-theme", next);
      },

      setTheme: (t) => {
        set({ theme: t });
        document.documentElement.setAttribute("data-theme", t);
      },

      exportConfig: () => {
        const appearance = useAppearanceStore.getState();
        const presets    = usePresetStore.getState();
        const theme      = get().theme;

        const config = {
          _version: 2,
          _exported: new Date().toISOString(),
          theme,
          appearance: {
            columnColors:    appearance.columnColors,
            labelColors:     appearance.labelColors,
            cardFields:      appearance.cardFields,
            hiddenStatuses:  appearance.hiddenStatuses,
            columnWidth:     appearance.columnWidth,
            editableColumns: appearance.editableColumns,
          },
          presets: {
            presets:       presets.presets,
            activePresetId: presets.activePresetId,
          },
        };

        const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href     = url;
        a.download = `dashboard-config-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      },

      importConfig: async (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const raw    = e.target?.result as string;
              const config = JSON.parse(raw);

              if (!config._version) throw new Error("Format config tidak valid");

              // Apply theme
              if (config.theme) {
                set({ theme: config.theme });
                document.documentElement.setAttribute("data-theme", config.theme);
              }

              // Apply appearance
              if (config.appearance) {
                const a = config.appearance;
                useAppearanceStore.setState({
                  columnColors:    a.columnColors    ?? {},
                  labelColors:     a.labelColors     ?? {},
                  cardFields:      a.cardFields      ?? [],
                  hiddenStatuses:  a.hiddenStatuses  ?? [],
                  columnWidth:     a.columnWidth     ?? 320,
                  editableColumns: a.editableColumns ?? [],
                });
              }

              // Apply presets
              if (config.presets) {
                usePresetStore.setState({
                  presets:        config.presets.presets        ?? [],
                  activePresetId: config.presets.activePresetId ?? null,
                });
              }

              resolve("Config berhasil diimpor!");
            } catch (err: any) {
              reject(err.message || "Gagal membaca file config");
            }
          };
          reader.onerror = () => reject("Gagal membaca file");
          reader.readAsText(file);
        });
      },
    }),
    { name: "dashboard-theme" }
  )
);

// Apply theme on init
if (typeof window !== "undefined") {
  const stored = localStorage.getItem("dashboard-theme");
  if (stored) {
    try {
      const { state } = JSON.parse(stored);
      if (state?.theme) document.documentElement.setAttribute("data-theme", state.theme);
    } catch {}
  }
}
