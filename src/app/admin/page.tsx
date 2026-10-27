/**
 * Admin Dashboard
 *
 * Main administrative view of the Faculty Allocation System.
 *
 * This page:
 * - Displays faculty stored in PostgreSQL.
 * - Determines each faculty member's current office assignment.
 * - Provides navigation to faculty, office, and allocation operations.
 * - Allows searching and filtering the faculty list.
 * - Allows deleting a faculty member (e.g. test records).
 *
 * An Allocation is ACTIVE when endedAt === null.
 * Historical allocations remain in the database after deallocation.
 */

import Link from "next/link";
import { db } from "@/prisma/db";
import { redirect } from "next/navigation";
import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";
import { RANK_LABELS } from "@/lib/labels";
import { logChange } from "@/lib/history";


// NEW (search): the filters arrive in the page URL, for example
// /admin?q=hood&department=3&assigned=yes
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    department?: string;
    rank?: string;
    assigned?: string;
  }>;
}) {
  const filters = await searchParams;
  const q = (filters.q ?? "").trim().toLowerCase();

  // Retrieve the records needed to build the dashboard.
  const faculty = await db.orm.public.Faculty.all();
  const offices = await db.orm.public.Office.all();
  const allocations = await db.orm.public.Allocation.all();
  const departments = await db.orm.public.Department.all(); // NEW (search): for the department filter

  // Runs on the server when a "Delete Faculty" button is pressed.
  async function deleteFaculty(formData: FormData) {
    "use server";

    const facultyId = Number(formData.get("facultyId"));
    const member = await db.orm.public.Faculty.where({ id: facultyId }).first();

    // A faculty member can't be deleted while allocations point to them,
    // so remove their allocations first, then the faculty record.
    await db.orm.public.Allocation.where({ facultyId }).deleteAndCount();
    await db.orm.public.Faculty.where({ id: facultyId }).delete();

    if (member) {
      await logChange({
        action: "Deleted faculty",
        entity: "Faculty",
        entityId: facultyId,
        details: `${member.firstName} ${member.lastName} and their office assignments`,
      });
    }

    redirect("/admin");
  }

  // NEW (search): attach each faculty member's current office once,
  // so it can be used both for filtering and for display.
  const rows = faculty.map((member) => {
    // Find this faculty member's CURRENT allocation.
    // endedAt === null means the assignment has not ended.
    const activeAllocation = allocations.find(
      (allocation) =>
        allocation.facultyId === member.id &&
        allocation.endedAt === null
    );

    // The Allocation stores an officeId. Use it to find the
    // corresponding Office record so its location can be displayed.
    const office = activeAllocation
      ? offices.find((office) => office.id === activeAllocation.officeId)
      : undefined;

    return { member, office };
  });

  // NEW (search): keep only the rows that match every filter that was used.
  const visible = rows.filter(({ member, office }) => {
    // Text search: matches first name, last name, email or office (e.g. "AIC 312").
    if (q) {
      const searchable = [
        member.firstName,
        member.lastName,
        member.email ?? "",
        office ? `${office.building} ${office.roomNumber}` : "",
        office ? `${office.building}-${office.roomNumber}` : "",
      ]
        .join(" ")
        .toLowerCase();
      if (!searchable.includes(q)) return false;
    }

    if (filters.department && member.departmentId !== Number(filters.department)) {
      return false;
    }

    if (filters.rank && member.facultyRank !== filters.rank) {
      return false;
    }

    if (filters.assigned === "yes" && !office) return false;
    if (filters.assigned === "no" && office) return false;

    return true;
  });

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold">Faculty Allocation System</h1>

      {/* Main administrative actions */}
      <div className="mt-6 flex gap-4">
        <Link
          href="/admin/faculty/add"
          className="border p-2 font-semibold"
        >
          + Add Faculty
        </Link>

        <Link
          href="/admin/offices"
          className="border p-2 font-semibold"
        >
          Manage Offices
        </Link>

        <Link
          href="/admin/allocations/add"
          className="border p-2 font-semibold"
        >
          Assign Office
        </Link>

        <Link
          href="/admin/import"
          className="border p-2 font-semibold"
        >
          Import Spreadsheet
        </Link>

        {/* A plain <a> (not Link) so the browser downloads the file. */}
        <a
          href="/admin/export"
          className="border p-2 font-semibold"
        >
          Export Spreadsheet
        </a>

        <Link
          href="/admin/history"
          className="border p-2 font-semibold"
        >
          History
        </Link>
      </div>

      <h2 className="mt-8 text-2xl font-semibold">
        Faculty Members
      </h2>

      {/* NEW (search): a normal GET form. Pressing Search reloads the page
          with the filters in the URL, e.g. /admin?q=hood&department=3 */}
      <form method="get" className="mt-4 flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={filters.q ?? ""}
          placeholder="Search name, email or office"
          className="border p-2"
        />

        <select
          name="department"
          defaultValue={filters.department ?? ""}
          className="border p-2"
        >
          <option value="">All departments</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>

        <select
          name="rank"
          defaultValue={filters.rank ?? ""}
          className="border p-2"
        >
          <option value="">All ranks</option>
          {Object.entries(RANK_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <select
          name="assigned"
          defaultValue={filters.assigned ?? ""}
          className="border p-2"
        >
          <option value="">Any office status</option>
          <option value="yes">Has an office</option>
          <option value="no">No office</option>
        </select>

        <button type="submit" className="border p-2 font-semibold">
          Search
        </button>

        <Link href="/admin" className="border p-2">
          Clear
        </Link>
      </form>

      {/* NEW (search): how many results are shown */}
      <p className="mt-2">
        Showing {visible.length} of {faculty.length} faculty members
      </p>

      {visible.length === 0 ? (
        <p className="mt-4">
          {faculty.length === 0
            ? "No faculty members have been added yet."
            : "No faculty members match your search."}
        </p>
      ) : (
        <div className="mt-4">
          {visible.map(({ member, office }) => (
            <div key={member.id} className="mb-4 border p-4">
              <p className="font-semibold">
                {member.firstName} {member.lastName}
              </p>

              <p>{member.email}</p>

              <p>Rank: {member.facultyRank}</p>

              <p>Tenure: {member.tenureStatus}</p>

              <p>Other Notes: {member.otherNotes || "None"}</p>

              <p>
                Office:{" "}
                {office
                  ? `${office.building} ${office.roomNumber}`
                  : "Not Assigned"}
              </p>

              {/* Delete button. The hidden input sends this
                  faculty member's id to deleteFaculty. */}
              <form action={deleteFaculty} className="mt-3 flex gap-2">
                <Link
                  href={`/admin/faculty/${member.id}/edit`}
                  className="border p-2 font-semibold"
                >
                  Edit
                </Link>

                <input type="hidden" name="facultyId" value={member.id} />

                <ConfirmDeleteButton name={`${member.firstName} ${member.lastName}`} />
              </form>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
