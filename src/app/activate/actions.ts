"use server";

/**
 * Server Action for /activate: a faculty member turns the code an
 * administrator gave them into a real login account.
 */

import { redirect } from "next/navigation";
import { db } from "@/prisma/db";
import { hashPassword, passwordProblem } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { isExpired, normalizeCode } from "@/lib/activation";
import { logChange } from "@/lib/history";

export type ActivateState = { error?: string; code?: string; email?: string } | undefined;

export async function activateAccount(
  _prev: ActivateState,
  formData: FormData
): Promise<ActivateState> {
  const typedCode = String(formData.get("code") ?? "").trim();
  const code = normalizeCode(typedCode);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const keep = { code: typedCode, email };

  if (!code || !email || !password) return { error: "All fields are required.", ...keep };

  const activation = await db.orm.public.ActivationCode.where({ code }).first();
  if (!activation || isExpired(activation.expiresAt)) {
    return {
      error: "This code is not valid or has expired. Ask the COAS office for a new one.",
      ...keep,
    };
  }

  const problem = passwordProblem(password);
  if (problem) return { error: problem, ...keep };
  if (password !== confirm) return { error: "The two passwords do not match.", ...keep };

  if (await db.orm.public.User.where({ email }).first()) {
    return { error: "An account with this email already exists. Try logging in instead.", ...keep };
  }

  const member = await db.orm.public.Faculty.where({ id: activation.facultyId }).first();
  if (!member) return { error: "This code is no longer valid.", ...keep };

  if (await db.orm.public.User.where({ facultyId: member.id }).first()) {
    await db.orm.public.ActivationCode.where({ id: activation.id }).delete();
    return { error: "An account already exists for this faculty member. Try logging in instead." };
  }

  const user = await db.orm.public.User.create({
    name: `${member.firstName} ${member.lastName}`,
    email,
    passwordHash: await hashPassword(password),
    role: "FACULTY",
    facultyId: member.id,
  });

  // The code is single-use.
  await db.orm.public.ActivationCode.where({ id: activation.id }).delete();

  await logChange({
    action: "Faculty activated account",
    entity: "User",
    entityId: user.id,
    details: `${user.name} (${email})`,
    actor: user,
  });

  await createSession(user.id, user.role);
  redirect("/faculty?welcome=1");
}
