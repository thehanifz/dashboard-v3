import { useLayoutEffect, useRef, useState } from "react";
import { COLOR_PALETTE } from "../../utils/colorPalette";

type Props = {
  selectedColorId?: string;
  onSelect: (colorId: string) => void;
  onClose: () => void;
};

export default function ColorPicker({ selectedColorId, onSelect, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // State untuk style posisi (mulai dengan opacity 0 agar tidak 'flash' saat menghitung)
  const [positionStyle, setPositionStyle] = useState<React.CSSProperties>({
    opacity: 0, 
    top: "32px",
    left: 0,
  });

  // useLayoutEffect jalan sebelum tampilan muncul di layar (bagus untuk ukur posisi)
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Ambil koordinat elemen saat ini
    const rect = el.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Logika Cek Tabrakan Tepi Layar
    const isOverflowRight = rect.right > viewportWidth;
    const isOverflowBottom = rect.bottom > viewportHeight;

    let finalStyle: React.CSSProperties = {
      opacity: 1, // Munculkan elemen
      zIndex: 50,
    };

    // 1. Atur Horizontal (Kiri/Kanan)
    if (isOverflowRight) {
      // Jika mentok kanan, ubah anchor jadi Rata Kanan
      finalStyle.right = 0;
      finalStyle.left = "auto";
    } else {
      // Default: Rata Kiri
      finalStyle.left = 0;
      finalStyle.right = "auto";
    }

    // 2. Atur Vertikal (Atas/Bawah) - Opsional, jaga2 kalau mentok bawah
    if (isOverflowBottom) {
       // Muncul ke atas (botton-up)
       finalStyle.bottom = "100%"; 
       finalStyle.top = "auto";
       finalStyle.marginBottom = "8px";
    } else {
       // Default: Muncul ke bawah
       finalStyle.top = "32px"; 
       finalStyle.bottom = "auto";
    }

    setPositionStyle(finalStyle);
  }, []);

  return (
    <>
      {/* BACKDROP: Klik di luar untuk tutup */}
      <div 
        className="fixed inset-0 z-40 cursor-default" 
        onClick={onClose} 
      />

      {/* POPUP CONTAINER */}
      <div 
        ref={containerRef}
        style={positionStyle}
        className="absolute bg-white border border-gray-200 shadow-xl rounded-lg p-3 w-64 animate-in fade-in zoom-in-95 duration-100"
      >
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-semibold text-gray-500 uppercase">Pilih Warna</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            &times;
          </button>
        </div>
        
        <div className="grid grid-cols-5 gap-2">
          {COLOR_PALETTE.map((theme) => (
            <button
              key={theme.id}
              onClick={() => {
                onSelect(theme.id);
                onClose();
              }}
              title={theme.name}
              className={`w-8 h-8 rounded-full ${theme.dot} flex items-center justify-center transition-transform hover:scale-110 ${
                selectedColorId === theme.id
                  ? "ring-2 ring-offset-2 ring-gray-400"
                  : ""
              }`}
            >
              {selectedColorId === theme.id && (
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}