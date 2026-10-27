/**
 * Edit Faculty Page  (/admin/faculty/<id>/edit)
 *
 * Shows a form already filled with the faculty member's current data.
 * On save, only the fields that actually changed are written to the
 * change history.
 */

import Link from "next/link";
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
    <main className="p-8">
      <h1 className="text-3xl font-bold">
        Edit Faculty: {member.firstName} {member.lastName}
      </h1>

      {error === "email" && (
        <p className="mt-4 border p-3 text-red-600">
          Another faculty member already uses that email.
        </p>
      )}

      <form action={saveFaculty} className="mt-8 flex max-w-md flex-col gap-4">
        <label className="flex flex-col gap-1">
          First name
          <input name="firstName" defaultValue={member.firstName} required className="border p-2" />
        </label>

        <label className="flex flex-col gap-1">
          Last name
          <input name="lastName" defaultValue={member.lastName} required className="border p-2" />
        </label>

        <label className="flex flex-col gap-1">
          Email (optional)
          <input name="email" type="email" defaultValue={member.email ?? ""} className="border p-2" />
        </label>

        <label className="flex flex-col gap-1">
          Department
          <select name="departmentId" defaultValue={member.departmentId} className="border p-2">
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          Rank
          <select name="facultyRank" defaultValue={member.facultyRank} className="border p-2">
            {Object.entries(RANK_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          Tenure
          <select name="tenureStatus" defaultValue={member.tenureStatus} className="border p-2">
            {Object.entries(TENURE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          Notes
          <textarea name="otherNotes" defaultValue={member.otherNotes ?? ""} rows={3} className="border p-2" />
        </label>

        <div className="flex gap-4">
          <button type="submit" className="border p-2 font-semibold">
            Save Changes
          </button>
          <Link href="/admin" className="border p-2">
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}
