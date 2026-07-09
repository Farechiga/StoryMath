/**
 * Input sanitizer for the typed answer fields. Permits whole numbers, one
 * decimal point, and a single leading minus so the UI can accept any value the
 * engine can produce (e.g. a future division goal of 1.5) — while still
 * rejecting stray characters.
 */
export function sanitizeNumeric(raw: string): string {
  let cleaned = raw.replace(/[^0-9.\-]/g, "");
  const negative = cleaned.startsWith("-");
  cleaned = cleaned.replace(/-/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot !== -1) {
    cleaned =
      cleaned.slice(0, firstDot + 1) +
      cleaned.slice(firstDot + 1).replace(/\./g, "");
  }
  return (negative ? "-" : "") + cleaned;
}
