/**
 * Add Faculty Page
 *
 * Allows an administrator to create a Faculty record.
 *
 * Departments are loaded from PostgreSQL instead of being hardcoded.
 * The form is handled by a Next.js Server Action, so database operations
 * occur on the server rather than in the browser.
 */

import { db } from "@/prisma/db";
import { redirect } from "next/navigation";
import { RANK_LABELS, TENURE_LABELS } from "@/lib/labels";
import {
  Button,
  ButtonLink,
  Field,
  FormCard,
  inputClass,
  PageShell,
  selectClass,
} from "@/components/ui";
import { logChange } from "@/lib/history";

export default async function AddFacultyPage() {
  // Populate the Department dropdown using actual database records.
  const departments = await db.orm.public.Department.all();

  async function addFaculty(formData: FormData) {
    "use server";

    // Extract submitted form values.
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const email = formData.get("email") as string;
    const otherNotes = formData.get("otherNotes") as string;
    const tenureStatus = formData.get("tenureStatus") as
      | "TENURED"
      | "TENURE_TRACK"
      | "FIXED_TERM";
    const facultyRank = formData.get("facultyRank") as
      | "FULL"
      | "ASSOCIATE"
      | "ASSISTANT"
      | "INSTRUCTIONAL_FULL"
      | "INSTRUCTIONAL_ASSOCIATE"
      | "INSTRUCTIONAL_ASSISTANT"
      | "SENIOR_LECTURER"
      | "LECTURER_INSTRUCTOR"
      | "VISITING_INSTRUCTIONAL_ASSISTANT"
      | "VISITING_LECTURER"
      | "VISITING_ASSISTANT";
      const departmentId = Number(formData.get("departmentId"));

    // Create the Faculty record in PostgreSQL.
    const member = await db.orm.public.Faculty.create({
      firstName,
      lastName,
      email,
      tenureStatus,
      facultyRank,
      otherNotes,
      departmentId,
    });

    await logChange({
      action: "Added faculty",
      entity: "Faculty",
      entityId: member.id,
      details: `${firstName} ${lastName}`,
    });

    // Return to the dashboard so the new faculty member is visible.
    redirect("/admin");
  }

  return (
    <PageShell
      eyebrow="Admin · Faculty"
      title="Add Faculty"
      description="Create a new faculty record."
    >
      <FormCard title="Faculty details" description="All fields except notes are required.">
        <form action={addFaculty} className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="First Name" htmlFor="firstName">
              <input id="firstName" name="firstName" required className={inputClass} />
            </Field>

            <Field label="Last Name" htmlFor="lastName">
              <input id="lastName" name="lastName" required className={inputClass} />
            </Field>
          </div>

          <Field label="Email" htmlFor="email">
            <input id="email" name="email" type="email" required className={inputClass} />
          </Field>

          <Field label="Department" htmlFor="departmentId">
            <select
              id="departmentId"
              name="departmentId"
              required
              className={selectClass}
              defaultValue=""
            >
              <option value="" disabled>
                Select Department
              </option>

              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Tenure Status" htmlFor="tenureStatus">
              <select
                id="tenureStatus"
                name="tenureStatus"
                required
                className={selectClass}
                defaultValue=""
              >
                <option value="" disabled>
                  Select Tenure Status
                </option>

                {Object.entries(TENURE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>

            {/* These values correspond directly to the FacultyRank enum
                defined in prisma/schema.prisma (labels from lib/labels.ts). */}
            <Field label="Faculty Rank" htmlFor="facultyRank">
              <select
                id="facultyRank"
                name="facultyRank"
                required
                className={selectClass}
                defaultValue=""
              >
                <option value="" disabled>
                  Select Faculty Rank
                </option>

                {Object.entries(RANK_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Other Notes" htmlFor="otherNotes" hint="Optional.">
            <textarea id="otherNotes" name="otherNotes" rows={4} className={inputClass} />
          </Field>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <ButtonLink href="/admin" variant="outline">
              Cancel
            </ButtonLink>
            <Button type="submit">Add Faculty</Button>
          </div>
        </form>
      </FormCard>
    </PageShell>
  );
}
