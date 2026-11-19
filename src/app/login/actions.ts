"use server";

/**
 * Server Actions for the login page.
 *
 * login()           - checks email + password and starts a session.
 * setupFirstAdmin() - only works while the User table is empty. It creates
 *                     the very first administrator so a fresh install can be
 *                     used without touching the database by hand.
 *
 * Both return { error } for the form to display, and redirect on success.
 */

import { redirect } from "next/navigation";
import { db } from "@/prisma/db";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { homeFor } from "@/lib/auth/session-token";
import { logChange } from "@/lib/history";

/** `email` is echoed back so the form can keep it filled after an error. */
export type LoginState = { error?: string; email?: string } | undefined;

function cleanEmail(value: FormDataEntryValue | null): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

/** Only allow redirects back into this site (e.g. "/admin/offices"). */
function safeNext(value: FormDataEntryValue | null): string | null {
  const next = String(value ?? "");
  return next.startsWith("/") && !next.startsWith("//") ? next : null;
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = cleanEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Please enter your email and password.", email };
  }

  const user = await db.orm.public.User.where({ email }).first();

  // Same message whether the email or the password is wrong, so the form
  // does not reveal which accounts exist.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Incorrect email or password.", email };
  }

  await createSession(user.id, user.role);
  redirect(safeNext(formData.get("next")) ?? homeFor(user.role));
}

export async function setupFirstAdmin(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  // Refuse if any account already exists; the admin user pages take over then.
  const existing = await db.orm.public.User.first();
  if (existing) {
    return { error: "An account already exists. Please log in instead." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = cleanEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!name || !email || !password) {
    return { error: "All fields are required.", email };
  }
  const problem = passwordProblem(password);
  if (problem) return { error: problem, email };
  if (password !== confirm) return { error: "The two passwords do not match.", email };

  const user = await db.orm.public.User.create({
    name,
    email,
    passwordHash: await hashPassword(password),
    role: "ADMIN",
    facultyId: null,
  });

  await logChange({
    action: "Created first administrator",
    entity: "User",
    entityId: user.id,
    details: `${name} (${email})`,
  });

  await createSession(user.id, user.role);
  redirect("/admin");
}
