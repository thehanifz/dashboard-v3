import { useEffect, useState } from "react";

export function useTablePagination(rows: any[]) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const totalPage = Math.max(1, Math.ceil(rows.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [pageSize, rows.length]);

  const slice = rows.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  return {
    page,
    pageSize,
    totalPage,
    rows: slice,
    setPage,
    setPageSize,
  };
}
