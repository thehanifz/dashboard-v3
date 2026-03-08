export function statusRowColor(status?: string) {
  switch (status) {
    case "Done":
      return "bg-green-50";
    case "On Progres":
      return "bg-yellow-50";
    case "Cancel":
      return "bg-red-50";
    default:
      return "";
  }
}
