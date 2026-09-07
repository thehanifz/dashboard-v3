/**
 * useTableSettings.ts
 * Hook untuk persistensi pengaturan tabel di localStorage.
 * Menyimpan pageSize dan tablePage per role + view.
 */
import { useState, useEffect } from "react";
import type { SetStateAction } from "react";
import { useAuthStore } from "../state/authStore";

interface TableSettings {
  pageSize: number;
  tablePage: number;
}

const STORAGE_KEY = "dash_v3_table_settings";

export function useTableSettings(defaultPageSize: number = 20) {
  const role = useAuthStore((s) => s.user?.role) ?? "engineer";
  const [settings, setSettings] = useState<TableSettings>({
    pageSize: defaultPageSize,
    tablePage: 1,
  });

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const allSettings = JSON.parse(stored) as Record<string, TableSettings>;
        const key = `${role}-detail`;
        if (allSettings[key]) {
          const saved = allSettings[key];
          const pageSize =
            Number.isFinite(saved.pageSize) && saved.pageSize > 0
              ? Math.floor(saved.pageSize)
              : defaultPageSize;
          const tablePage =
            Number.isFinite(saved.tablePage) && saved.tablePage >= 1
              ? Math.floor(saved.tablePage)
              : 1;
          setSettings({ pageSize, tablePage });
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, [role]);

  // Save settings to localStorage when changed
  const updateSettings = (newSettings: Partial<TableSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const allSettings = stored ? (JSON.parse(stored) as Record<string, TableSettings>) : {};
        allSettings[`${role}-detail`] = updated;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allSettings));
      } catch {
        // Ignore storage errors
      }
      return updated;
    });
  };

  return {
    pageSize: settings.pageSize,
    tablePage: settings.tablePage,
    setPageSize: (size: number) => updateSettings({ pageSize: size, tablePage: 1 }),
    setTablePage: (page: SetStateAction<number>) => {
      const nextPage = typeof page === "function" ? page(settings.tablePage) : page;
      const safePage = Number.isFinite(nextPage) ? Math.max(1, Math.floor(nextPage)) : 1;
      updateSettings({ tablePage: safePage });
    },
  };
}
