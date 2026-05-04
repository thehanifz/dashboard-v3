import { useEffect, useState } from "react";
import { useAuthStore } from "../state/authStore";

const STORAGE_KEY = "dash_v3_table_settings";

interface TableSettings {
  pageSize: number;
  page: number;
}

export function useTablePagination(rows: any[]) {
  const role = useAuthStore((s) => s.user?.role) ?? "engineer";
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(20);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const allSettings = JSON.parse(stored) as Record<string, TableSettings>;
        const key = `${role}-detail`;
        if (allSettings[key]) {
          setPageSizeState(allSettings[key].pageSize);
          setPage(allSettings[key].page);
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, [role]);

  const setPageSize = (size: number) => {
    setPageSizeState(size);
    setPage(1);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const allSettings = stored ? (JSON.parse(stored) as Record<string, TableSettings>) : {};
      allSettings[`${role}-detail`] = { pageSize: size, page: 1 };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allSettings));
    } catch {
      // Ignore storage errors
    }
  };

  const setPagePersisted = (newPage: number) => {
    setPage(newPage);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const allSettings = stored ? (JSON.parse(stored) as Record<string, TableSettings>) : {};
      allSettings[`${role}-detail`] = { pageSize, page: newPage };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allSettings));
    } catch {
      // Ignore storage errors
    }
  };

  useEffect(() => {
    setPage(1);
  }, [pageSize, rows.length]);

  const totalPage = Math.max(1, Math.ceil(rows.length / pageSize));

  const slice = rows.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  return {
    page,
    pageSize,
    totalPage,
    rows: slice,
    setPage: setPagePersisted,
    setPageSize,
  };
}
