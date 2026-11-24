"use server";

/** Server Action for /account/password: any signed-in user changes their password. */

import { db } from "@/prisma/db";
import { requireUser } from "@/lib/auth/dal";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/auth/password";
import { logChange } from "@/lib/history";

export type PasswordState = { error?: string; done?: boolean } | undefined;

export async function changePassword(
  _prev: PasswordState,
  formData: FormData
): Promise<PasswordState> {
  const me = await requireUser();
  const current = String(formData.get("current") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const user = await db.orm.public.User.where({ id: me.id }).first();
  if (!user || !(await verifyPassword(current, user.passwordHash))) {
    return { error: "Your current password is not correct." };
  }

  const problem = passwordProblem(password);
  if (problem) return { error: problem };
  if (password !== confirm) return { error: "The two new passwords do not match." };
  if (password === current) return { error: "The new password must be different." };

  await db.orm.public.User.where({ id: me.id }).update({
    passwordHash: await hashPassword(password),
  });
  await logChange({
    action: "Changed password",
    entity: "User",
    entityId: me.id,
    details: me.email,
  });

  return { done: true };
}
