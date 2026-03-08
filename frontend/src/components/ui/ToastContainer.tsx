import type { ToastType } from "../utils/useToast";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

const ICONS = {
  success: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  info: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const COLORS = {
  success: "bg-emerald-600 text-white",
  error:   "bg-red-600 text-white",
  info:    "bg-slate-700 text-white",
};

export default function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast flex items-center gap-2.5 px-4 py-2.5 rounded-lg shadow-xl text-sm font-medium ${COLORS[t.type]}`}
        >
          {ICONS[t.type]}
          {t.message}
        </div>
      ))}
    </div>
  );
}
