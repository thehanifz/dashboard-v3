/**
 * useTableSettings.ts
 * Hook untuk persistensi pengaturan tabel di localStorage.
 * Menyimpan pageSize dan tablePage per role + view.
 */
import { useState, useEffect } from "react";
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
          setSettings(allSettings[key]);
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
    setTablePage: (page: number) => updateSettings({ tablePage: page }),
  };
}
