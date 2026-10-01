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

export default async function AddFacultyPage() {
  // Populate the Department dropdown using actual database records.
  const departments = await db.orm.public.Department.all();

  async function addFaculty(formData: FormData) {
    "use server";

    // Extract submitted form values.
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const email = formData.get("email") as string;
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
      | "VISITING_LECTURER";
      const departmentId = Number(formData.get("departmentId"));

    // Create the Faculty record in PostgreSQL.
    await db.orm.public.Faculty.create({
      firstName,
      lastName,
      email,
      tenureStatus,
      facultyRank,
      departmentId,
    });

    // Return to the dashboard so the new faculty member is visible.
    redirect("/admin");
  }

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold">Add Faculty</h1>

      <form
        action={addFaculty}
        className="mt-8 flex max-w-md flex-col gap-4"
      >
        <input
          name="firstName"
          placeholder="First Name"
          required
          className="border p-2"
        />

        <input
          name="lastName"
          placeholder="Last Name"
          required
          className="border p-2"
        />

        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          className="border p-2"
        />

        <select
          name="departmentId"
          required
          className="border p-2"
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

        <select
          name="tenureStatus"
          required
          className="border p-2"
          defaultValue=""
        >
          <option value="" disabled>
            Select Tenure Status
          </option>

          <option value="TENURED">Tenured</option>
          <option value="TENURE_TRACK">Tenure Track</option>
          <option value="FIXED_TERM">Fixed Term</option>
        </select>

        {/* These values correspond directly to the FacultyRank enum
            defined in prisma/schema.prisma. */}
        <select
          name="facultyRank"
          required
          className="border p-2"
          defaultValue=""
        >
          <option value="" disabled>
            Select Faculty Rank
          </option>

          <option value="FULL">Full</option>
          <option value="ASSOCIATE">Associate</option>
          <option value="ASSISTANT">Assistant</option>
          <option value="INSTRUCTIONAL_FULL">Instructional Full</option>
          <option value="INSTRUCTIONAL_ASSOCIATE">
            Instructional Associate
          </option>
          <option value="INSTRUCTIONAL_ASSISTANT">
            Instructional Assistant
          </option>
          <option value="SENIOR_LECTURER">Senior Lecturer</option>
          <option value="LECTURER_INSTRUCTOR">
            Lecturer / Instructor
          </option>
          <option value="VISITING_INSTRUCTIONAL_ASSISTANT">
            Visiting Instructional Assistant
          </option>
          <option value="VISITING_LECTURER">
            Visiting Lecturer
          </option>
        </select>

        <button
          type="submit"
          className="border p-2 font-semibold"
        >
          Add Faculty
        </button>
      </form>
    </main>
  );
}