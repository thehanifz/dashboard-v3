type ViewType = "table" | "kanban";

type Props = {
  title:        string;
  recordCount:  number;
  userName:     string;
  saving?:      boolean;
  onRefresh?:   () => void;
  view?:        ViewType;
  onViewChange?:(v: ViewType) => void;
};

export function ToolbarHeader({ title, recordCount, userName, saving, onRefresh, view, onViewChange }: Props) {
  const showViewTab = view !== undefined && onViewChange !== undefined;

  return (
    <div className="px-3 md:px-5 pt-3 md:pt-4 pb-3 flex items-center justify-between gap-3 md:gap-4">

      {/* Kiri: icon + judul + meta */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "var(--accent-soft)" }}>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            style={{ color: "var(--accent)", width: 18, height: 18 }}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
            {title}
          </h1>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              {recordCount} record
            </span>
            <span className="w-1 h-1 rounded-full shrink-0" style={{ background: "var(--border)" }} />
            <span className="text-[11px] font-medium truncate" style={{ color: "var(--text-secondary)" }}>
              {userName}
            </span>
            {saving && (
              <span className="text-[11px] font-medium flex items-center gap-1" style={{ color: "var(--accent)" }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block"
                  style={{ background: "var(--accent)" }} />
                Menyimpan...
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Kanan: refresh — view switcher Kanban dihapus dari UI */}
      {onRefresh && (
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{ background: "var(--bg-surface2)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
            title="Refresh data (Ctrl+R)">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: 14, height: 14 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      )}
    </div>
  );
}
