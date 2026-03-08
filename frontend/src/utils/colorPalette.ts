export type ColorTheme = {
  id: string;
  name: string;
  bg: string;      // Background row & column
  border: string;  // Border line
  text: string;    // Text color
  dot: string;     // Color dot in picker
};

export const COLOR_PALETTE: ColorTheme[] = [
  // --- NETRAL (Upgrade ke shade 100/300) ---
  { id: "slate", name: "Slate", bg: "bg-slate-100", border: "border-slate-300", text: "text-slate-800", dot: "bg-slate-500" },
  { id: "gray", name: "Gray", bg: "bg-gray-100", border: "border-gray-300", text: "text-gray-800", dot: "bg-gray-500" },
  { id: "zinc", name: "Zinc", bg: "bg-zinc-100", border: "border-zinc-300", text: "text-zinc-800", dot: "bg-zinc-500" },
  { id: "neutral", name: "Neutral", bg: "bg-neutral-100", border: "border-neutral-300", text: "text-neutral-800", dot: "bg-neutral-500" },
  { id: "stone", name: "Stone", bg: "bg-stone-100", border: "border-stone-300", text: "text-stone-800", dot: "bg-stone-500" },

  // --- MERAH & HANGAT ---
  { id: "red", name: "Red", bg: "bg-red-100", border: "border-red-300", text: "text-red-800", dot: "bg-red-500" },
  { id: "orange", name: "Orange", bg: "bg-orange-100", border: "border-orange-300", text: "text-orange-800", dot: "bg-orange-500" },
  { id: "amber", name: "Amber", bg: "bg-amber-100", border: "border-amber-300", text: "text-amber-800", dot: "bg-amber-500" },
  { id: "yellow", name: "Yellow", bg: "bg-yellow-100", border: "border-yellow-300", text: "text-yellow-800", dot: "bg-yellow-400" },
  
  // --- HIJAU & ALAM ---
  { id: "lime", name: "Lime", bg: "bg-lime-100", border: "border-lime-300", text: "text-lime-800", dot: "bg-lime-500" },
  { id: "green", name: "Green", bg: "bg-green-100", border: "border-green-300", text: "text-green-800", dot: "bg-green-500" },
  { id: "emerald", name: "Emerald", bg: "bg-emerald-100", border: "border-emerald-300", text: "text-emerald-800", dot: "bg-emerald-500" },
  { id: "teal", name: "Teal", bg: "bg-teal-100", border: "border-teal-300", text: "text-teal-800", dot: "bg-teal-500" },

  // --- BIRU & DINGIN ---
  { id: "cyan", name: "Cyan", bg: "bg-cyan-100", border: "border-cyan-300", text: "text-cyan-800", dot: "bg-cyan-500" },
  { id: "sky", name: "Sky", bg: "bg-sky-100", border: "border-sky-300", text: "text-sky-800", dot: "bg-sky-500" },
  { id: "blue", name: "Blue", bg: "bg-blue-100", border: "border-blue-300", text: "text-blue-800", dot: "bg-blue-500" },
  { id: "indigo", name: "Indigo", bg: "bg-indigo-100", border: "border-indigo-300", text: "text-indigo-800", dot: "bg-indigo-500" },
  { id: "violet", name: "Violet", bg: "bg-violet-100", border: "border-violet-300", text: "text-violet-800", dot: "bg-violet-500" },
  { id: "purple", name: "Purple", bg: "bg-purple-100", border: "border-purple-300", text: "text-purple-800", dot: "bg-purple-500" },
  { id: "fuchsia", name: "Fuchsia", bg: "bg-fuchsia-100", border: "border-fuchsia-300", text: "text-fuchsia-800", dot: "bg-fuchsia-500" },
  { id: "pink", name: "Pink", bg: "bg-pink-100", border: "border-pink-300", text: "text-pink-800", dot: "bg-pink-500" },
  { id: "rose", name: "Rose", bg: "bg-rose-100", border: "border-rose-300", text: "text-rose-800", dot: "bg-rose-500" },
];

export const getColorTheme = (id?: string): ColorTheme => {
  return COLOR_PALETTE.find((c) => c.id === id) ?? COLOR_PALETTE[1];
};