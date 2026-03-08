export const STATUS_ORDER = [
  "Survey",
  "On Progres",
  "Done",
  "Cancel",
] as const;

export type StatusType = (typeof STATUS_ORDER)[number];
