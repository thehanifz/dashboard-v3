import { useAppStore } from "../../state/appStore";

interface Props {
  idPa: string;
}

export default function TeskomActionButton({ idPa }: Props) {
  const setPage            = useAppStore((s) => s.setPage);
  const setTeskomAutofill  = useAppStore((s) => s.setTeskomAutofill);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!idPa) return;
    setTeskomAutofill(idPa);
    setPage("teskom");
  };

  return (
    <button
      onClick={handleClick}
      title={`Buka Teskom — ${idPa}`}
      className="flex items-center justify-center w-6 h-6 rounded-md transition-all"
      style={{ color: "var(--text-muted)" }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = "var(--accent-soft)";
        (e.currentTarget as HTMLElement).style.color = "var(--accent)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "transparent";
        (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
      }}
    >
      {/* Icon clipboard / teskom */}
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    </button>
  );
}