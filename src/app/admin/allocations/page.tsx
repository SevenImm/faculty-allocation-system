/**
 * Current Allocations Page
 *
 * Displays active faculty-office assignments and allows an administrator
 * to deallocate an office.
 *
 * IMPORTANT:
 * Deallocation does NOT delete the Allocation record.
 *
 * Instead, endedAt receives the current timestamp. This preserves the
 * assignment as historical data while making both the faculty member
 * and office available for another allocation.
 */

import { db } from "@/prisma/db";
import { redirect } from "next/navigation";

export default async function AllocationsPage() {
  const faculty = await db.orm.public.Faculty.all();
  const offices = await db.orm.public.Office.all();
  const allocations = await db.orm.public.Allocation.all();

  // Only records without an end time represent current assignments.
  const activeAllocations = allocations.filter(
    (allocation) => allocation.endedAt === null
  );

  async function deallocateOffice(formData: FormData) {
    "use server";

    const allocationId = Number(formData.get("allocationId"));

    // End the allocation rather than deleting it.
    // This allows the system to retain office-assignment history.
    await db.orm.public.Allocation
      .where({ id: allocationId })
      .update({
        endedAt: Temporal.Now.plainDateTimeISO(),
      });

    redirect("/admin");
  }

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold">Current Allocations</h1>

      {activeAllocations.length === 0 ? (
        <p className="mt-4">There are no active allocations.</p>
      ) : (
        <div className="mt-6">
          {activeAllocations.map((allocation) => {
            // Match foreign-key IDs to their Faculty and Office records.
            const member = faculty.find(
              (member) => member.id === allocation.facultyId
            );

            const office = offices.find(
              (office) => office.id === allocation.officeId
            );

            return (
              <div
                key={allocation.id}
                className="mb-4 border p-4"
              >
                <p>
                  <strong>Faculty:</strong>{" "}
                  {member
                    ? `${member.firstName} ${member.lastName}`
                    : "Unknown"}
                </p>

                <p>
                  <strong>Office:</strong>{" "}
                  {office
                    ? `${office.building} ${office.roomNumber}`
                    : "Unknown"}
                </p>

                <form action={deallocateOffice} className="mt-3">
                  {/* The user does not need to see the Allocation ID,
                      but the Server Action needs it to update the
                      correct database record. */}
                  <input
                    type="hidden"
                    name="allocationId"
                    value={allocation.id}
                  />

                  <button
                    type="submit"
                    className="border p-2 font-semibold"
                  >
                    Deallocate Office
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}