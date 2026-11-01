/**
 * Change history helpers.
 *
 * Every admin action that changes data calls logChange(), which adds
 * one row to the ChangeLog table. The History page (/admin/history)
 * lists those rows, newest first.
 */

import { db } from "@/prisma/db";

export async function logChange(entry: {
  action: string;
  entity: "Faculty" | "Office" | "Allocation" | "Import";
  entityId?: number | null;
  details: string;
}) {
  await db.orm.public.ChangeLog.create({
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId ?? null,
    details: entry.details,
  });
}

// Compare the old and new values of a record and describe what changed,
// e.g. ["Window: No → Yes", "Capacity: 1 → 2"]. Unchanged fields are skipped.
export function describeChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  labels: Record<string, string>
): string[] {
  const show = (value: unknown) =>
    value === null || value === undefined || value === ""
      ? "(empty)"
      : value === true
        ? "Yes"
        : value === false
          ? "No"
          : String(value);

  return Object.keys(labels)
    .filter((key) => show(before[key]) !== show(after[key]))
    .map((key) => `${labels[key]}: ${show(before[key])} → ${show(after[key])}`);
}
