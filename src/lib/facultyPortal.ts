/**
 * Helpers shared by the Faculty Portal (/faculty) and the admin Requests page.
 */

import { db } from "@/prisma/db";
import type { CurrentUser } from "@/lib/auth/dal";

/**
 * The faculty record that belongs to a signed-in account: the linked
 * facultyId first, otherwise the faculty member with the same email.
 */
export async function findFacultyForUser(user: CurrentUser) {
  return (
    (user.facultyId
      ? await db.orm.public.Faculty.where({ id: user.facultyId }).first()
      : null) ?? (await db.orm.public.Faculty.where({ email: user.email }).first())
  );
}

/** Topics a faculty member can pick when reporting something. */
export const REQUEST_TOPICS = {
  CORRECTION: ["Name", "Email", "Department", "Rank", "Tenure status", "Office", "Other"],
  OFFICE_ISSUE: ["Keys or access", "Furniture or equipment", "Maintenance or repairs", "Other"],
} as const;

export const REQUEST_TYPE_LABELS: Record<string, string> = {
  CORRECTION: "Correction",
  OFFICE_ISSUE: "Office problem",
};

export const MAX_MESSAGE_LENGTH = 1000;
