export type ColorTheme = {
  id: string;
  name: string;
  bg: string;      // Background row & column (Tailwind - light mode)
  border: string;  // Border line (Tailwind)
  text: string;    // Text color (Tailwind - light mode)
  dot: string;     // Color dot in picker
  hex: string;     // Hex color untuk inline style (dark mode safe)
  hexText: string; // Hex text color untuk inline style (dark mode safe)
};

export const COLOR_PALETTE: ColorTheme[] = [
  // --- NETRAL ---
  { id: "slate",   name: "Slate",   bg: "bg-slate-100",   border: "border-slate-300",   text: "text-slate-800",   dot: "bg-slate-500",   hex: "#64748b", hexText: "#1e293b" },
  { id: "gray",    name: "Gray",    bg: "bg-gray-100",    border: "border-gray-300",    text: "text-gray-800",    dot: "bg-gray-500",    hex: "#6b7280", hexText: "#1f2937" },
  { id: "zinc",    name: "Zinc",    bg: "bg-zinc-100",    border: "border-zinc-300",    text: "text-zinc-800",    dot: "bg-zinc-500",    hex: "#71717a", hexText: "#18181b" },
  { id: "neutral", name: "Neutral", bg: "bg-neutral-100", border: "border-neutral-300", text: "text-neutral-800", dot: "bg-neutral-500", hex: "#737373", hexText: "#171717" },
  { id: "stone",   name: "Stone",   bg: "bg-stone-100",   border: "border-stone-300",   text: "text-stone-800",   dot: "bg-stone-500",   hex: "#78716c", hexText: "#1c1917" },
  // --- MERAH & HANGAT ---
  { id: "red",     name: "Red",     bg: "bg-red-100",     border: "border-red-300",     text: "text-red-800",     dot: "bg-red-500",     hex: "#ef4444", hexText: "#991b1b" },
  { id: "orange",  name: "Orange",  bg: "bg-orange-100",  border: "border-orange-300",  text: "text-orange-800",  dot: "bg-orange-500",  hex: "#f97316", hexText: "#9a3412" },
  { id: "amber",   name: "Amber",   bg: "bg-amber-100",   border: "border-amber-300",   text: "text-amber-800",   dot: "bg-amber-500",   hex: "#f59e0b", hexText: "#92400e" },
  { id: "yellow",  name: "Yellow",  bg: "bg-yellow-100",  border: "border-yellow-300",  text: "text-yellow-800",  dot: "bg-yellow-400",  hex: "#eab308", hexText: "#713f12" },
  // --- HIJAU & ALAM ---
  { id: "lime",    name: "Lime",    bg: "bg-lime-100",    border: "border-lime-300",    text: "text-lime-800",    dot: "bg-lime-500",    hex: "#84cc16", hexText: "#365314" },
  { id: "green",   name: "Green",   bg: "bg-green-100",   border: "border-green-300",   text: "text-green-800",   dot: "bg-green-500",   hex: "#22c55e", hexText: "#14532d" },
  { id: "emerald", name: "Emerald", bg: "bg-emerald-100", border: "border-emerald-300", text: "text-emerald-800", dot: "bg-emerald-500", hex: "#10b981", hexText: "#064e3b" },
  { id: "teal",    name: "Teal",    bg: "bg-teal-100",    border: "border-teal-300",    text: "text-teal-800",    dot: "bg-teal-500",    hex: "#14b8a6", hexText: "#134e4a" },
  // --- BIRU & DINGIN ---
  { id: "cyan",    name: "Cyan",    bg: "bg-cyan-100",    border: "border-cyan-300",    text: "text-cyan-800",    dot: "bg-cyan-500",    hex: "#06b6d4", hexText: "#164e63" },
  { id: "sky",     name: "Sky",     bg: "bg-sky-100",     border: "border-sky-300",     text: "text-sky-800",     dot: "bg-sky-500",     hex: "#0ea5e9", hexText: "#0c4a6e" },
  { id: "blue",    name: "Blue",    bg: "bg-blue-100",    border: "border-blue-300",    text: "text-blue-800",    dot: "bg-blue-500",    hex: "#3b82f6", hexText: "#1e3a8a" },
  { id: "indigo",  name: "Indigo",  bg: "bg-indigo-100",  border: "border-indigo-300",  text: "text-indigo-800",  dot: "bg-indigo-500",  hex: "#6366f1", hexText: "#312e81" },
  { id: "violet",  name: "Violet",  bg: "bg-violet-100",  border: "border-violet-300",  text: "text-violet-800",  dot: "bg-violet-500",  hex: "#8b5cf6", hexText: "#2e1065" },
  { id: "purple",  name: "Purple",  bg: "bg-purple-100",  border: "border-purple-300",  text: "text-purple-800",  dot: "bg-purple-500",  hex: "#a855f7", hexText: "#3b0764" },
  { id: "fuchsia", name: "Fuchsia", bg: "bg-fuchsia-100", border: "border-fuchsia-300", text: "text-fuchsia-800", dot: "bg-fuchsia-500", hex: "#d946ef", hexText: "#4a044e" },
  { id: "pink",    name: "Pink",    bg: "bg-pink-100",    border: "border-pink-300",    text: "text-pink-800",    dot: "bg-pink-500",    hex: "#ec4899", hexText: "#831843" },
  { id: "rose",    name: "Rose",    bg: "bg-rose-100",    border: "border-rose-300",    text: "text-rose-800",    dot: "bg-rose-500",    hex: "#f43f5e", hexText: "#881337" },
];

export const getColorTheme = (id?: string): ColorTheme => {
  return COLOR_PALETTE.find((c) => c.id === id) ?? COLOR_PALETTE[1];
};