/**
 * Hitung durasi dari tanggal terbit PA hingga:
 * - TGL UPLOAD BAI (jika sudah ada BAI)
 * - Hari ini (jika belum ada BAI)
 * Threshold tier bisa dikustomisasi via parameter (dari settings API).
 */

export interface AgingResult {
  days: number;
  hours: number;
  minutes: number;
  totalMinutes: number;
  label: string;
  tier: "safe" | "warning" | "danger" | "critical";
  isClosed: boolean;
}

export interface AgingThresholds {
  tier1: number; // safe → warning
  tier2: number; // warning → danger
  tier3: number; // danger → critical
}

export const DEFAULT_THRESHOLDS: AgingThresholds = { tier1: 11, tier2: 30, tier3: 90 };

/**
 * Parse string tanggal dari backend ke Date.
 * Mendukung format:
 *   - "2024-11-15 9:32"  → jam single digit (perlu padding)
 *   - "2024-11-15 09:32"
 *   - "2024-11-15"
 *   - "2024-11-15 09:32:00"
 */
function parseDate(str: string): Date | null {
  if (!str || !str.trim()) return null;

  // Normalise: pad jam single digit "9:32" → "09:32"
  // Pattern: YYYY-MM-DD H:MM atau YYYY-MM-DD H:MM:SS
  const padded = str.trim().replace(
    /(\d{4}-\d{2}-\d{2})[ T](\d{1}:)/,
    "$1T0$2"
  ).replace(
    /(\d{4}-\d{2}-\d{2})[ T](\d{2}:)/,
    "$1T$2"
  );

  const d = new Date(padded);
  if (!isNaN(d.getTime())) return d;

  // Fallback: coba format DD/MM/YYYY
  const dmy = str.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmy) {
    const d2 = new Date(`${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`);
    if (!isNaN(d2.getTime())) return d2;
  }

  return null;
}

export function calcAging(
  tglTerbitPA: string,
  thresholds: AgingThresholds = DEFAULT_THRESHOLDS,
  tglUploadBAI?: string
): AgingResult | null {
  if (!tglTerbitPA) return null;

  const parsed = parseDate(tglTerbitPA);
  if (!parsed) return null;

  // End date: TGL UPLOAD BAI (jika ada & valid) atau hari ini
  let endDate: Date;
  if (tglUploadBAI) {
    const parsedEnd = parseDate(tglUploadBAI);
    endDate = parsedEnd ?? new Date();
    if (!parsedEnd) {
      console.warn("[aging] Invalid TGL UPLOAD BAI, using today:", tglUploadBAI);
    }
  } else {
    endDate = new Date();
  }

  const diff = endDate.getTime() - parsed.getTime();
  if (diff < 0) return null;

  const totalMinutes = Math.floor(diff / 60000);
  const days    = Math.floor(totalMinutes / 1440);
  const hours   = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  const isClosed = !!tglUploadBAI;
  const label = isClosed
    ? `${days} HARI ${hours} JAM ${minutes} MENIT (Closed)`
    : `${days} HARI ${hours} JAM ${minutes} MENIT`;

  let tier: AgingResult["tier"];
  if (days <= thresholds.tier1)      tier = "safe";
  else if (days <= thresholds.tier2) tier = "warning";
  else if (days <= thresholds.tier3) tier = "danger";
  else                               tier = "critical";

  return { days, hours, minutes, totalMinutes, label, tier, isClosed };
}

/**
 * calcAgingFromDays — pakai nilai "Aging PA" (integer hari) yang sudah
 * dihitung backend Python. Lebih akurat karena backend punya akses ke
 * nilai DB langsung tanpa konversi string.
 */
export function calcAgingFromDays(
  agingPaStr: string,
  thresholds: AgingThresholds = DEFAULT_THRESHOLDS
): { days: number; tier: AgingResult["tier"] } | null {
  if (!agingPaStr || agingPaStr === "-") return null;

  // Backend mengirim format "365 Hari 3 Jam 20 Menit" — ambil angka pertama
  const match = agingPaStr.match(/(\d+)/);
  if (!match) return null;

  const days = parseInt(match[1], 10);
  if (isNaN(days)) return null;

  let tier: AgingResult["tier"];
  if (days <= thresholds.tier1)      tier = "safe";
  else if (days <= thresholds.tier2) tier = "warning";
  else if (days <= thresholds.tier3) tier = "danger";
  else                               tier = "critical";

  return { days, tier };
}

export function getAgingTierStyles(thresholds: AgingThresholds = DEFAULT_THRESHOLDS) {
  return {
    safe:     { bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-200", dot: "bg-emerald-500", label: `0–${thresholds.tier1} hari` },
    warning:  { bg: "bg-amber-100",   text: "text-amber-800",   border: "border-amber-200",   dot: "bg-amber-500",   label: `${thresholds.tier1 + 1}–${thresholds.tier2} hari` },
    danger:   { bg: "bg-orange-100",  text: "text-orange-800",  border: "border-orange-200",  dot: "bg-orange-500",  label: `${thresholds.tier2 + 1}–${thresholds.tier3} hari` },
    critical: { bg: "bg-red-100",     text: "text-red-800",     border: "border-red-200",     dot: "bg-red-500",     label: `>${thresholds.tier3} hari` },
  } as const;
}

// Backward-compat
export const AGING_TIER_STYLES = getAgingTierStyles();
