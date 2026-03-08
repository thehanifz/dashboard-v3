/**
 * Hitung durasi dari tanggal terbit PA hingga sekarang.
 * Mengabaikan kolom DURASI dari backend — semua dihitung fresh di client.
 */

export interface AgingResult {
  days: number;
  hours: number;
  minutes: number;
  totalMinutes: number;
  label: string;          // "112 HARI 16 JAM 47 MENIT"
  tier: "safe" | "warning" | "danger" | "critical"; // untuk color coding
}

export function calcAging(tglTerbitPA: string): AgingResult | null {
  if (!tglTerbitPA) return null;

  // Format: "2025-11-05 10:52"
  const parsed = new Date(tglTerbitPA.replace(" ", "T"));
  if (isNaN(parsed.getTime())) return null;

  const now = new Date();
  const diff = now.getTime() - parsed.getTime();
  if (diff < 0) return null;

  const totalMinutes = Math.floor(diff / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  const label = `${days} HARI ${hours} JAM ${minutes} MENIT`;

  let tier: AgingResult["tier"];
  if (days <= 30) tier = "safe";
  else if (days <= 60) tier = "warning";
  else if (days <= 90) tier = "danger";
  else tier = "critical";

  return { days, hours, minutes, totalMinutes, label, tier };
}

export const AGING_TIER_STYLES = {
  safe:     { bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-200", dot: "bg-emerald-500", label: "0–30 hari" },
  warning:  { bg: "bg-amber-100",   text: "text-amber-800",   border: "border-amber-200",   dot: "bg-amber-500",   label: "31–60 hari" },
  danger:   { bg: "bg-orange-100",  text: "text-orange-800",  border: "border-orange-200",  dot: "bg-orange-500",  label: "61–90 hari" },
  critical: { bg: "bg-red-100",     text: "text-red-800",     border: "border-red-200",     dot: "bg-red-500",     label: ">90 hari" },
} as const;
