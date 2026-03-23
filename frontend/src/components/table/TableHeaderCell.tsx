import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Props = {
  column: string; width: number; minWidth: number;
  onResize: (e: React.MouseEvent, col: string) => void;
  onAutoFit: (e: React.MouseEvent, col: string) => void;
  onFilter: (e: React.MouseEvent, col: string) => void;
  isFiltered: boolean;
};

export function TableHeaderCell({ column, width, minWidth, onResize, onAutoFit, onFilter, isFiltered }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: column });

  const style = {
    transform: CSS.Translate.toString(transform), transition,
    width: `${width}px`, minWidth: `${minWidth}px`,
    zIndex: isDragging ? 50 : "auto", opacity: isDragging ? 0.75 : 1,
  };

  return (
    <th
      ref={setNodeRef}
      {...attributes} {...listeners}
      className="relative select-none group th-table-head"
      style={{ ...style, padding: "10px 12px", borderBottom: "2px solid var(--border)", cursor: "grab" } as any}
    >
      <style>{`.group:hover .filter-btn { opacity: 0.5 !important; } .group:hover .filter-btn:hover { opacity: 1 !important; color: var(--accent) !important; background: var(--accent-soft); }`}</style>
      <div className="flex items-center justify-between gap-1.5 overflow-hidden">
        <span className="truncate flex-1 text-[11px] font-bold uppercase tracking-wider cursor-grab"
          style={{ color: isDragging ? "var(--accent)" : "var(--text-secondary)" }}
          title={column}
        >{column}</span>

        {/* Filter icon */}
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={e => onFilter(e, column)}
          className="p-0.5 rounded transition-all shrink-0 filter-btn"
          style={{
            color:   isFiltered ? "var(--accent)" : "var(--text-muted)",
            opacity: isFiltered ? 1 : 0,
          }}
          title="Filter kolom"
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Resize handle */}
      <div
        onPointerDown={e => e.stopPropagation()}
        onMouseDown={e => onResize(e, column)}
        onDoubleClick={e => onAutoFit(e, column)}
        className="resize-handle group-hover:bg-blue-500"
        style={{ opacity: 0.35 }}
        title="Geser / Klik 2x auto-fit"
      />
    </th>
  );
}