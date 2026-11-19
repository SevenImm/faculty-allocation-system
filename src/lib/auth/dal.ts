/**
 * Access checks for pages and Server Actions.
 *
 * The cookie only says who the browser CLAIMS to be. These helpers look
 * the user up in the database, so a deleted account or changed role takes
 * effect immediately. Call them at the top of every protected page and
 * every Server Action that changes data:
 *
 *   const user = await requireAdmin();   // admin pages and actions
 *   const user = await requireUser();    // any signed-in user
 *   const user = await getCurrentUser(); // may be null (navbar, home page)
 *
 * React's cache() means one request only hits the database once no matter
 * how many components ask.
 */

import { cache } from "react";
import { redirect } from "next/navigation";
import { db } from "@/prisma/db";
import { getSession } from "./session";
import { homeFor, type UserRole } from "./session-token";

export type CurrentUser = {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  facultyId: number | null;
};

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getSession();
  if (!session) return null;

  const user = await db.orm.public.User.where({ id: session.userId }).first();
  if (!user) return null;

  // Never pass the password hash any further than this file.
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    facultyId: user.facultyId,
  };
});

/** Any signed-in user. Redirects to the login page otherwise. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Signed-in ADMIN only. Other users are sent to their own home page. */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect(homeFor(user.role));
  return user;
}
