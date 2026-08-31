import { CSSProperties } from "react";

export interface HBarProps {
  label: string;
  value: number;
  max: number;
  color: string;
  pct?: string;
  onClick?: () => void;
  isActive?: boolean;
}

/**
 * HBar.tsx
 * Horizontal bar chart component dengan support click-to-filter.
 * 
 * @param label - Label text (nama kategori)
 * @param value - Nilai/angka
 * @param max - Nilai maksimal untuk scaling width
 * @param color - Warna bar
 * @param pct - Persentase (optional)
 * @param onClick - Handler saat bar diklik (optional)
 * @param isActive - Apakah bar ini sedang aktif/selected (optional)
 */
export function HBar({ label, value, max, color, pct, onClick, isActive }: HBarProps) {
  const w = max > 0 ? (value / max) * 100 : 0;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log("[HBar] Clicked:", label, value);
    if (onClick) onClick();
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isActive) {
      e.currentTarget.style.opacity = "0.8";
      e.currentTarget.style.transform = "translateX(4px)";
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isActive) {
      e.currentTarget.style.opacity = "1";
      e.currentTarget.style.transform = "translateX(0)";
    }
  };

  const baseStyle: CSSProperties = {
    cursor: onClick ? "pointer" : "default",
    transition: "all 0.2s ease",
    opacity: isActive ? 1 : undefined,
    transform: isActive ? "translateX(4px)" : undefined,
    userSelect: "none",
    WebkitUserSelect: "none",
    MozUserSelect: "none",
    msUserSelect: "none",
  };

  const labelStyle: CSSProperties = {
    color: isActive ? "var(--accent)" : "var(--text-secondary)",
    fontWeight: isActive ? 600 : 400,
  };

  const barStyle: CSSProperties = {
    width: `${w}%`,
    background: isActive ? "var(--accent)" : color,
    filter: isActive ? "brightness(1.2)" : undefined,
    transition: "all 0.2s ease",
  };

  const valueStyle: CSSProperties = {
    color: "var(--text-primary)",
  };

  const pctStyle: CSSProperties = {
    color: isActive ? "var(--accent)" : "var(--text-muted)",
  };

  return (
    <div 
      className="flex flex-wrap items-center gap-x-2 gap-y-1.5 sm:flex-nowrap sm:gap-3"
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={baseStyle}
    >
      <span className="text-xs w-full sm:w-36 truncate shrink-0" style={labelStyle}>
        {label}
      </span>
      <div className="order-3 sm:order-none basis-full sm:basis-auto flex-1 rounded-full h-1.5 overflow-hidden" style={{ background: "var(--border)" }}>
        <div 
          className="h-full rounded-full"
          style={barStyle} 
        />
      </div>
      <span className="text-xs font-bold w-6 sm:w-5 text-right font-mono-data ml-auto sm:ml-0" style={valueStyle}>
        {value}
      </span>
      {pct && (
        <span className="text-[10px] w-8 text-right" style={pctStyle}>
          {pct}
        </span>
      )}
    </div>
  );
}
