/**
 * Change history helpers.
 *
 * Every admin action that changes data calls logChange(), which adds
 * one row to the ChangeLog table. The History page (/admin/history)
 * lists those rows, newest first.
 */

import { db } from "@/prisma/db";
import { getCurrentUser } from "@/lib/auth/dal";

type Actor = { id: number; name: string; email: string; role: string };

/**
 * Record a change. The signed-in user is saved as the person who made it.
 * Pass `actor` only when nobody is signed in yet but we know who acted
 * (e.g. a faculty member activating their own account).
 */
export async function logChange(entry: {
  action: string;
  entity: "Faculty" | "Office" | "Allocation" | "Import" | "User" | "Request";
  entityId?: number | null;
  details: string;
  actor?: Actor | null;
}) {
  // Outside a web request (e.g. the import script) there is no session.
  const actor = entry.actor ?? (await getCurrentUser().catch(() => null));

  await db.orm.public.ChangeLog.create({
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId ?? null,
    details: entry.details,
    actorId: actor?.id ?? null,
    actorName: actor?.name ?? null,
    actorEmail: actor?.email ?? null,
    actorRole: actor?.role ?? null,
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
