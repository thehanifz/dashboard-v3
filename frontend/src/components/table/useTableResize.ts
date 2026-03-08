import { useCallback, useRef } from "react";
import { usePresetStore } from "../../state/presetStore";

// Helper: Ukur lebar teks pakai Canvas (Cepat & Akurat)
function getTextWidth(text: string, font: string = "12px sans-serif") {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (context) {
    context.font = font;
    return context.measureText(text).width;
  }
  return 0;
}

// Tambahkan parameter 'records' agar bisa scan data
export function useTableResize(
    presetId?: string, 
    initialWidths?: Record<string, number>,
    records?: any[] 
) {
  const updatePreset = usePresetStore((s) => s.updatePreset);
  
  const draggingRef = useRef<{
    col: string;
    startX: number;
    startWidth: number;
    ghostEl: HTMLDivElement | null;
  } | null>(null);

  // --- 1. LOGIKA DRAG RESIZE (Seperti Sebelumnya) ---
  const onMouseDown = useCallback(
    (e: React.MouseEvent, col: string) => {
      e.preventDefault();
      e.stopPropagation();

      const startX = e.clientX; 
      const currentWidth = initialWidths?.[col] ?? 150;

      const ghost = document.createElement("div");
      ghost.style.position = "fixed";
      ghost.style.top = "0";
      ghost.style.bottom = "0";
      ghost.style.width = "2px"; 
      ghost.style.backgroundColor = "#2563eb"; 
      ghost.style.zIndex = "99999"; 
      ghost.style.cursor = "col-resize";
      ghost.style.left = `${e.clientX}px`;
      ghost.style.pointerEvents = "none"; 
      
      document.body.appendChild(ghost);

      draggingRef.current = {
        col,
        startX,
        startWidth: currentWidth,
        ghostEl: ghost,
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [initialWidths, presetId]
  );

  const onMouseMove = (e: MouseEvent) => {
    if (!draggingRef.current) return;
    const { ghostEl } = draggingRef.current;
    if (ghostEl) ghostEl.style.left = `${e.clientX}px`;
  };

  const onMouseUp = (e: MouseEvent) => {
    if (!draggingRef.current) return;
    const { col, startX, startWidth, ghostEl } = draggingRef.current;
    const diff = e.clientX - startX;
    const newWidth = Math.max(60, startWidth + diff);

    if (ghostEl && ghostEl.parentNode === document.body) {
      document.body.removeChild(ghostEl);
    }

    if (presetId && diff !== 0) {
      updatePreset(presetId, {
        widths: { ...initialWidths, [col]: newWidth },
      });
    }

    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    draggingRef.current = null;
  };

  // --- 2. LOGIKA AUTO-FIT (DOUBLE CLICK) ---
  const onDoubleClick = useCallback((e: React.MouseEvent, col: string) => {
    e.stopPropagation();
    if (!presetId || !records) return;

    // A. Ukur Header
    let maxWidth = getTextWidth(col, "bold 12px sans-serif") + 40; // +Padding ikon

    // B. Ukur Isi Data (Scan semua baris)
    records.forEach((r) => {
      const val = r.data[col];
      if (val) {
        // Asumsi font body: text-xs (12px)
        const w = getTextWidth(String(val), "12px sans-serif");
        if (w > maxWidth) maxWidth = w;
      }
    });

    // C. Tambah sedikit padding agar tidak mepet (24px padding cell)
    const finalWidth = Math.min(600, maxWidth + 24); // Max 600px biar gak gila

    updatePreset(presetId, {
        widths: { ...initialWidths, [col]: finalWidth },
    });

  }, [presetId, records, initialWidths, updatePreset]);

  return { onMouseDown, onDoubleClick };
}