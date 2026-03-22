/**
 * Hitung durasi dari tanggal terbit PA hingga sekarang.
 * Mengabaikan kolom DURASI dari backend — semua dihitung fresh di client.
 * Threshold tier bisa dikustomisasi via parameter (dari settings API).
 */

export interface AgingResult {
  days: number;
  hours: number;
  minutes: number;
  totalMinutes: number;
  label: string;
  tier: "safe" | "warning" | "danger" | "critical";
}

export interface AgingThresholds {
  tier1: number; // safe → warning
  tier2: number; // warning → danger
  tier3: number; // danger → critical
}

export const DEFAULT_THRESHOLDS: AgingThresholds = { tier1: 30, tier2: 60, tier3: 90 };

export function calcAging(
  tglTerbitPA: string,
  thresholds: AgingThresholds = DEFAULT_THRESHOLDS
): AgingResult | null {
  if (!tglTerbitPA) return null;

  const parsed = new Date(tglTerbitPA.replace(" ", "T"));
  if (isNaN(parsed.getTime())) return null;

  const now  = new Date();
  const diff = now.getTime() - parsed.getTime();
  if (diff < 0) return null;

  const totalMinutes = Math.floor(diff / 60000);
  const days    = Math.floor(totalMinutes / 1440);
  const hours   = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  const label = `${days} HARI ${hours} JAM ${minutes} MENIT`;

  let tier: AgingResult["tier"];
  if (days <= thresholds.tier1)      tier = "safe";
  else if (days <= thresholds.tier2) tier = "warning";
  else if (days <= thresholds.tier3) tier = "danger";
  else                               tier = "critical";

  return { days, hours, minutes, totalMinutes, label, tier };
}

export function getAgingTierStyles(thresholds: AgingThresholds = DEFAULT_THRESHOLDS) {
  return {
    safe:     { bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-200", dot: "bg-emerald-500", label: `0–${thresholds.tier1} hari` },
    warning:  { bg: "bg-amber-100",   text: "text-amber-800",   border: "border-amber-200",   dot: "bg-amber-500",   label: `${thresholds.tier1 + 1}–${thresholds.tier2} hari` },
    danger:   { bg: "bg-orange-100",  text: "text-orange-800",  border: "border-orange-200",  dot: "bg-orange-500",  label: `${thresholds.tier2 + 1}–${thresholds.tier3} hari` },
    critical: { bg: "bg-red-100",     text: "text-red-800",     border: "border-red-200",     dot: "bg-red-500",     label: `>${thresholds.tier3} hari` },
  } as const;
}

// Backward-compat: AGING_TIER_STYLES pakai default threshold
export const AGING_TIER_STYLES = getAgingTierStyles(DEFAULT_THRESHOLDS);