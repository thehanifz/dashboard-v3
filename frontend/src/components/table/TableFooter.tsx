export function TableFooter({
  page,
  totalPage,
  pageSize,
  setPageSize,
  setPage,
}: any) {
  return (
    <div className="shrink-0 flex items-center justify-between px-4 py-2 text-xs border-t bg-gray-50">
      <div className="text-gray-500">
        Page {page} / {totalPage}
      </div>

      <div className="flex items-center gap-2">
        <span>Rows</span>
        <select
          value={pageSize}
          onChange={(e) =>
            setPageSize(Number(e.target.value))
          }
          className="border rounded px-1 py-0.5"
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
      </div>

      <div className="flex gap-2">
        <button
          disabled={page === 1}
          onClick={() => setPage((p: number) => p - 1)}
          className="px-2 py-1 border rounded disabled:opacity-40"
        >
          Prev
        </button>
        <button
          disabled={page === totalPage}
          onClick={() => setPage((p: number) => p + 1)}
          className="px-2 py-1 border rounded disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
