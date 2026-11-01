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

import { Temporal } from "temporal-polyfill";
import { db } from "@/prisma/db";
import { redirect } from "next/navigation";
import { logChange } from "@/lib/history";
import {
  Button,
  ButtonLink,
  Card,
  EmptyState,
  PageShell,
  SectionHeading,
} from "@/components/ui";

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

    const allocation = await db.orm.public.Allocation.where({ id: allocationId }).first();
    if (allocation) {
      const member = await db.orm.public.Faculty.where({ id: allocation.facultyId }).first();
      const office = await db.orm.public.Office.where({ id: allocation.officeId }).first();
      await logChange({
        action: "Deallocated office",
        entity: "Allocation",
        entityId: allocationId,
        details: `${member?.firstName} ${member?.lastName} left ${office?.building}-${office?.roomNumber}`,
      });
    }

    redirect("/admin");
  }

  return (
    <PageShell
      eyebrow="Admin"
      title="Current Allocations"
      description="Active office assignments. Deallocating keeps the record as history."
      actions={<ButtonLink href="/admin/allocations/add">Assign Office</ButtonLink>}
    >
      <SectionHeading
        title="Active assignments"
        description={`${activeAllocations.length} active`}
      />

      {activeAllocations.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="There are no active allocations."
            action={<ButtonLink href="/admin/allocations/add">Assign Office</ButtonLink>}
          />
        </div>
      ) : (
        <Card className="mt-6 overflow-hidden">
          <ul className="divide-y divide-black/5">
            {activeAllocations.map((allocation) => {
              // Match foreign-key IDs to their Faculty and Office records.
              const member = faculty.find(
                (member) => member.id === allocation.facultyId
              );

              const office = offices.find(
                (office) => office.id === allocation.officeId
              );

              return (
                <li
                  key={allocation.id}
                  className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-4">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-maroon text-sm font-semibold text-gold-100">
                      {member
                        ? `${member.firstName.charAt(0)}${member.lastName.charAt(0)}`
                        : "?"}
                    </span>
                    <div>
                      <p className="font-medium text-gray-950">
                        {member
                          ? `${member.firstName} ${member.lastName}`
                          : "Unknown"}
                      </p>
                      <p className="text-sm/6 text-gray-500">
                        Office:{" "}
                        {office
                          ? `${office.building} ${office.roomNumber}`
                          : "Unknown"}
                      </p>
                    </div>
                  </div>

                  <form action={deallocateOffice}>
                    {/* The user does not need to see the Allocation ID,
                        but the Server Action needs it to update the
                        correct database record. */}
                    <input
                      type="hidden"
                      name="allocationId"
                      value={allocation.id}
                    />

                    <Button type="submit" variant="danger">
                      Deallocate Office
                    </Button>
                  </form>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </PageShell>
  );
}
