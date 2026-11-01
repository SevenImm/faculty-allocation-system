/**
 * Edit Faculty Page  (/admin/faculty/<id>/edit)
 *
 * Shows a form already filled with the faculty member's current data.
 * On save, only the fields that actually changed are written to the
 * change history.
 */

import {
  Button,
  ButtonLink,
  Field,
  FormCard,
  inputClass,
  PageShell,
  selectClass,
} from "@/components/ui";
import { notFound, redirect } from "next/navigation";
import { db } from "@/prisma/db";
import { logChange, describeChanges } from "@/lib/history";
import { RANK_LABELS, TENURE_LABELS } from "@/lib/labels";

type Rank =
  | "FULL" | "ASSOCIATE" | "ASSISTANT"
  | "INSTRUCTIONAL_FULL" | "INSTRUCTIONAL_ASSOCIATE" | "INSTRUCTIONAL_ASSISTANT"
  | "SENIOR_LECTURER" | "LECTURER_INSTRUCTOR"
  | "VISITING_INSTRUCTIONAL_ASSISTANT" | "VISITING_LECTURER" | "VISITING_ASSISTANT";
type Tenure = "TENURED" | "TENURE_TRACK" | "FIXED_TERM";

export default async function EditFacultyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  // The id comes from the URL: /admin/faculty/12/edit -> "12"
  const id = Number((await params).id);
  const { error } = await searchParams;

  const member = await db.orm.public.Faculty.where({ id }).first();
  if (!member) notFound();

  const departments = await db.orm.public.Department.all();

  async function saveFaculty(formData: FormData) {
    "use server";

    const current = await db.orm.public.Faculty.where({ id }).first();
    if (!current) redirect("/admin");

    const email = (formData.get("email") as string).trim() || null;

    // Email must stay unique: stop if another faculty member already uses it.
    if (email) {
      const other = await db.orm.public.Faculty.where({ email }).first();
      if (other && other.id !== id) {
        redirect(`/admin/faculty/${id}/edit?error=email`);
      }
    }

    const updated = {
      firstName: (formData.get("firstName") as string).trim(),
      lastName: (formData.get("lastName") as string).trim(),
      email,
      departmentId: Number(formData.get("departmentId")),
      facultyRank: formData.get("facultyRank") as Rank,
      tenureStatus: formData.get("tenureStatus") as Tenure,
      otherNotes: (formData.get("otherNotes") as string).trim() || null,
    };

    await db.orm.public.Faculty.where({ id }).update(updated);

    // Record what changed, using readable names for departments and ranks.
    const allDepartments = await db.orm.public.Department.all();
    const deptName = (deptId: number) =>
      allDepartments.find((d) => d.id === deptId)?.name ?? String(deptId);
    const readable = (f: typeof updated) => ({
      ...f,
      departmentId: deptName(f.departmentId),
      facultyRank: RANK_LABELS[f.facultyRank] ?? f.facultyRank,
      tenureStatus: TENURE_LABELS[f.tenureStatus] ?? f.tenureStatus,
    });

    const changes = describeChanges(readable(current), readable(updated), {
      firstName: "First name",
      lastName: "Last name",
      email: "Email",
      departmentId: "Department",
      facultyRank: "Rank",
      tenureStatus: "Tenure",
      otherNotes: "Notes",
    });

    if (changes.length > 0) {
      await logChange({
        action: "Edited faculty",
        entity: "Faculty",
        entityId: id,
        details: `${updated.firstName} ${updated.lastName}: ${changes.join("; ")}`,
      });
    }

    redirect("/admin");
  }

  return (
    <PageShell
      eyebrow="Admin · Faculty"
      title={`Edit Faculty: ${member.firstName} ${member.lastName}`}
      description="Only fields you change are written to the change history."
    >
      <FormCard title="Faculty details">
        {error === "email" && (
          <p className="mb-6 rounded-lg bg-maroon-50 px-4 py-3 text-sm/6 font-medium text-maroon ring-1 ring-maroon/15">
            Another faculty member already uses that email.
          </p>
        )}

        <form action={saveFaculty} className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="First name" htmlFor="firstName">
              <input id="firstName" name="firstName" defaultValue={member.firstName} required className={inputClass} />
            </Field>

            <Field label="Last name" htmlFor="lastName">
              <input id="lastName" name="lastName" defaultValue={member.lastName} required className={inputClass} />
            </Field>
          </div>

          <Field label="Email" htmlFor="email" hint="Optional.">
            <input id="email" name="email" type="email" defaultValue={member.email ?? ""} className={inputClass} />
          </Field>

          <Field label="Department" htmlFor="departmentId">
            <select id="departmentId" name="departmentId" defaultValue={member.departmentId} className={selectClass}>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Rank" htmlFor="facultyRank">
              <select id="facultyRank" name="facultyRank" defaultValue={member.facultyRank} className={selectClass}>
                {Object.entries(RANK_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Tenure" htmlFor="tenureStatus">
              <select id="tenureStatus" name="tenureStatus" defaultValue={member.tenureStatus} className={selectClass}>
                {Object.entries(TENURE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Notes" htmlFor="otherNotes">
            <textarea id="otherNotes" name="otherNotes" defaultValue={member.otherNotes ?? ""} rows={3} className={inputClass} />
          </Field>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <ButtonLink href="/admin" variant="outline">
              Cancel
            </ButtonLink>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </FormCard>
    </PageShell>
  );
}
