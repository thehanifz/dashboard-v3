export function normalizeStatus(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}
