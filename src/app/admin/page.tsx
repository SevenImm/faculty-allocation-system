/**
 * Admin Dashboard
 *
 * Main administrative view of the Faculty Allocation System.
 *
 * This page:
 * - Displays faculty stored in PostgreSQL.
 * - Determines each faculty member's current office assignment.
 * - Provides navigation to faculty, office, and allocation operations.
 *
 * An Allocation is ACTIVE when endedAt === null.
 * Historical allocations remain in the database after deallocation.
 */

import Link from "next/link";
import { db } from "@/prisma/db";

export default async function AdminPage() {
  // Retrieve the records needed to build the dashboard.
  const faculty = await db.orm.public.Faculty.all();
  const offices = await db.orm.public.Office.all();
  const allocations = await db.orm.public.Allocation.all();

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
      </div>

      <h2 className="mt-8 text-2xl font-semibold">
        Faculty Members
      </h2>

      {faculty.length === 0 ? (
        <p className="mt-4">
          No faculty members have been added yet.
        </p>
      ) : (
        <div className="mt-4">
          {faculty.map((member) => {
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
              ? offices.find(
                  (office) => office.id === activeAllocation.officeId
                )
              : undefined;

            return (
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
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}