interface Props {
  statuses: string[];
  hiddenStatuses: string[];
  onToggle: (s: string) => void;
  onClose: () => void;
}

export default function PTLColumnVisibilityManager({ statuses, hiddenStatuses, onToggle, onClose }: Props) {
  const activeCount = statuses.length - hiddenStatuses.length;

  return (
    <>
      <div className="fixed inset-0 z-40 th-overlay" onClick={onClose} />
      <div className="fixed top-20 right-4 z-50 rounded-xl shadow-2xl w-64 p-4 animate-in fade-in slide-in-from-top-4"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <div className="flex justify-between items-center mb-3 pb-2"
          style={{ borderBottom: "1px solid var(--border)" }}>
          <div>
            <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Kolom Status</h3>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
              {activeCount} aktif dari {statuses.length}
            </p>
          </div>
          <button onClick={onClose} className="text-lg leading-none"
            style={{ color: "var(--text-muted)" }}>&times;</button>
        </div>
        <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
          Sembunyikan kolom yang tidak relevan.
        </p>
        <div className="max-h-[60vh] overflow-y-auto space-y-1 custom-scrollbar">
          {statuses.map((status) => {
            const isVisible = !hiddenStatuses.includes(status);
            return (
              <label key={status}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-xs select-none"
                style={{ background: isVisible ? "var(--accent-soft)" : "transparent" }}
                onMouseEnter={e => { if (!isVisible) (e.currentTarget as HTMLElement).style.background = "var(--bg-surface2)"; }}
                onMouseLeave={e => { if (!isVisible) (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                <input type="checkbox" className="rounded shrink-0"
                  style={{ accentColor: "var(--accent)" }}
                  checked={isVisible}
                  onChange={() => {
                    if (isVisible && activeCount <= 1) return;
                    onToggle(status);
                  }} />
                <span style={{
                  color: isVisible ? "var(--accent)" : "var(--text-muted)",
                  fontWeight: isVisible ? 600 : 400,
                  textDecoration: !isVisible ? "line-through" : "none",
                }}>
                  {status}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </>
  );
}
