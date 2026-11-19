/**
 * Add User (admin only)
 *
 * Creates a login account. A FACULTY account can be linked to a faculty
 * record so that person sees their own office in the Faculty Portal; the
 * dropdown only offers faculty members who do not have an account yet.
 *
 * Validation problems come back as ?error=... in the URL so the page can
 * show them without any client-side JavaScript.
 */

import { db } from "@/prisma/db";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { hashPassword, passwordProblem } from "@/lib/auth/password";
import { logChange } from "@/lib/history";
import {
  Button,
  ButtonLink,
  Field,
  FormCard,
  inputClass,
  selectClass,
} from "@/components/ui";
import { PageShell } from "@/components/layout";

export default async function AddUserPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const { error } = await searchParams;

  const users = await db.orm.public.User.all();
  const linkedIds = new Set(users.map((u) => u.facultyId).filter((id) => id !== null));
  const faculty = (await db.orm.public.Faculty.orderBy((f) => f.lastName.asc()).all()).filter(
    (member) => !linkedIds.has(member.id)
  );

  async function addUser(formData: FormData) {
    "use server";
    await requireAdmin();

    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();
    const password = String(formData.get("password") ?? "");
    const role = formData.get("role") === "ADMIN" ? "ADMIN" : "FACULTY";
    const facultyRaw = String(formData.get("facultyId") ?? "");
    const facultyId = role === "FACULTY" && facultyRaw ? Number(facultyRaw) : null;

    const fail = (message: string) =>
      redirect(`/admin/users/add?error=${encodeURIComponent(message)}`);

    if (!name || !email || !password) fail("Name, email and password are required.");
    const problem = passwordProblem(password);
    if (problem) fail(problem);

    if (await db.orm.public.User.where({ email }).first()) {
      fail("An account with that email already exists.");
    }
    if (facultyId !== null && (await db.orm.public.User.where({ facultyId }).first())) {
      fail("That faculty member already has an account.");
    }

    const user = await db.orm.public.User.create({
      name,
      email,
      passwordHash: await hashPassword(password),
      role,
      facultyId,
    });

    await logChange({
      action: "Added user account",
      entity: "User",
      entityId: user.id,
      details: `${name} (${email}, ${role.toLowerCase()})`,
    });

    redirect("/admin/users");
  }

  return (
    <PageShell
      eyebrow="Admin · Users"
      title="Add User"
      description="Create a login for an administrator or a faculty member."
    >
      <FormCard
        title="Account details"
        description="Share the password with the person privately; they cannot change it themselves yet."
      >
        {error && (
          <p
            role="alert"
            className="mb-6 rounded-lg bg-maroon-50 px-3 py-2 text-sm/5 font-medium text-maroon ring-1 ring-maroon/15"
          >
            {error}
          </p>
        )}

        <form action={addUser} className="space-y-6">
          <Field label="Full Name" htmlFor="name">
            <input id="name" name="name" required className={inputClass} />
          </Field>

          <Field label="Email" htmlFor="email" hint="Used to log in.">
            <input id="email" name="email" type="email" required className={inputClass} />
          </Field>

          <Field label="Password" htmlFor="password" hint="At least 8 characters.">
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className={inputClass}
            />
          </Field>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Role" htmlFor="role">
              <select id="role" name="role" required className={selectClass} defaultValue="FACULTY">
                <option value="FACULTY">Faculty — sees their own office</option>
                <option value="ADMIN">Admin — manages everything</option>
              </select>
            </Field>

            <Field
              label="Faculty Record"
              htmlFor="facultyId"
              hint="Faculty accounts only. Ignored for admins."
            >
              <select id="facultyId" name="facultyId" className={selectClass} defaultValue="">
                <option value="">Not linked</option>
                {faculty.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.lastName}, {member.firstName}
                    {member.email ? ` (${member.email})` : ""}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <ButtonLink href="/admin/users" variant="outline">
              Cancel
            </ButtonLink>
            <Button type="submit">Add User</Button>
          </div>
        </form>
      </FormCard>
    </PageShell>
  );
}
