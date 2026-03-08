export const STATUS_COLORS: Record<
  string,
  { bg: string; border: string; text: string }
> = {
  Done: {
    bg: "bg-green-50",
    border: "border-green-400",
    text: "text-green-700",
  },
  "On Progres": {
    bg: "bg-blue-50",
    border: "border-blue-400",
    text: "text-blue-700",
  },
  Cancel: {
    bg: "bg-red-50",
    border: "border-red-400",
    text: "text-red-700",
  },
};

export function statusColor(status?: string) {
  if (!status) return "bg-gray-100 text-gray-700";

  switch (status) {
    case "Done":
      return "bg-green-100 text-green-800";
    case "On Progres":
      return "bg-yellow-100 text-yellow-800";
    case "Cancel":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-700";
  }
}
