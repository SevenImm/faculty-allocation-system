/**
 * Date display helpers.
 *
 * Prisma 8 returns DateTime columns as Temporal values, not JavaScript
 * Dates. Their string form is ISO ("2026-10-27T11:05:12"), which the
 * Date constructor understands, so these helpers accept any value and
 * format it for display.
 */

export function formatDate(value: unknown): string {
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { dateStyle: "medium" });
}

export function formatDateTime(value: unknown): string {
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}
