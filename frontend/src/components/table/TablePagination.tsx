type Props = {
  page:       number;
  pageSize:   number;
  totalPage:  number;
  total:      number;
  setPage:    (p: number | ((prev: number) => number)) => void;
  setPageSize:(size: number) => void;
};

export function TablePagination({ page, pageSize, totalPage, total, setPage, setPageSize }: Props) {
  const from = (page - 1) * pageSize + 1;
  const to   = Math.min(page * pageSize, total);

  return (
    <div
      className="shrink-0 flex items-center justify-between px-3 py-2.5 mt-2 rounded-xl"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
    >
      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
        Menampilkan{" "}
        <b style={{ color: "var(--text-primary)" }}>{from}–{to}</b>{" "}
        dari{" "}
        <b style={{ color: "var(--text-primary)" }}>{total}</b> data
      </span>

      <div className="flex items-center gap-2">
        <select
          value={pageSize}
          onChange={e => setPageSize(Number(e.target.value))}
          className="th-select text-xs py-1"
        >
          <option value={20}>20/hal</option>
          <option value={50}>50/hal</option>
          <option value={100}>100/hal</option>
        </select>

        <div className="flex gap-1">
          <button disabled={page === 1} onClick={() => setPage(1)}
            className="btn-ghost px-2 py-1 text-xs disabled:opacity-30" title="Halaman pertama">«</button>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            className="btn-ghost px-2 py-1 text-xs disabled:opacity-30">‹</button>
          <span className="px-3 py-1 text-xs font-medium rounded-lg"
            style={{ background: "var(--accent)", color: "#fff" }}>
            {page}
          </span>
          <button disabled={page === totalPage} onClick={() => setPage(p => p + 1)}
            className="btn-ghost px-2 py-1 text-xs disabled:opacity-30">›</button>
          <button disabled={page === totalPage} onClick={() => setPage(totalPage)}
            className="btn-ghost px-2 py-1 text-xs disabled:opacity-30" title="Halaman terakhir">»</button>
        </div>
      </div>
    </div>
  );
}
