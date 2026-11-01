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

import { db } from "@/prisma/db";
import { redirect } from "next/navigation";
import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";
import { RANK_LABELS, TENURE_LABELS } from "@/lib/labels";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  inputClass,
  outlineButtonClass,
  PageShell,
  SectionHeading,
  selectClass,
  StatCard,
} from "@/components/ui";
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

  const activeAllocations = allocations.filter(
    (allocation) => allocation.endedAt === null
  );

  return (
    <PageShell
      eyebrow="Admin"
      title="Faculty Allocation System"
      description="Add faculty, manage offices and assign spaces."
      actions={
        <>
          {/* Main administrative actions */}
          <ButtonLink href="/admin/faculty/add">+ Add Faculty</ButtonLink>
          <ButtonLink href="/admin/allocations/add" variant="secondary">
            Assign Office
          </ButtonLink>
          <ButtonLink href="/admin/offices" variant="secondary">
            Manage Offices
          </ButtonLink>
        </>
      }
    >
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Faculty" value={faculty.length} />
        <StatCard label="Offices" value={offices.length} />
        <StatCard label="Active assignments" value={activeAllocations.length} />
        <StatCard
          label="Without an office"
          value={rows.filter(({ office }) => !office).length}
        />
      </div>

      {/* Data tools */}
      <div className="mt-6 flex flex-wrap gap-3">
        <ButtonLink href="/admin/import" variant="outline">
          Import Spreadsheet
        </ButtonLink>

        {/* A plain <a> (not Link) so the browser downloads the file. */}
        <a href="/admin/export" className={outlineButtonClass}>
          Export Spreadsheet
        </a>

        <ButtonLink href="/admin/history" variant="outline">
          History
        </ButtonLink>
      </div>

      <div className="mt-16">
        <SectionHeading
          title="Faculty Members"
          description={`Showing ${visible.length} of ${faculty.length} faculty members`}
        />

        {/* NEW (search): a normal GET form. Pressing Search reloads the page
            with the filters in the URL, e.g. /admin?q=hood&department=3 */}
        <Card className="mt-6 p-4">
          <form method="get" className="grid gap-3 md:grid-cols-[2fr_1.5fr_1.5fr_1fr_auto]">
            <input
              name="q"
              defaultValue={filters.q ?? ""}
              placeholder="Search name, email or office"
              aria-label="Search"
              className={inputClass}
            />

            <select
              name="department"
              defaultValue={filters.department ?? ""}
              aria-label="Department"
              className={selectClass}
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
              aria-label="Rank"
              className={selectClass}
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
              aria-label="Office status"
              className={selectClass}
            >
              <option value="">Any office status</option>
              <option value="yes">Has an office</option>
              <option value="no">No office</option>
            </select>

            <div className="flex gap-2">
              <Button type="submit">Search</Button>
              <ButtonLink href="/admin" variant="outline">
                Clear
              </ButtonLink>
            </div>
          </form>
        </Card>

        {visible.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title={
                faculty.length === 0
                  ? "No faculty members have been added yet."
                  : "No faculty members match your search."
              }
              action={
                faculty.length === 0 ? (
                  <ButtonLink href="/admin/faculty/add">+ Add Faculty</ButtonLink>
                ) : undefined
              }
            />
          </div>
        ) : (
          <Card className="mt-6 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm/6">
                <thead className="bg-gray-50 font-mono text-xs/5 font-semibold tracking-widest text-gray-500 uppercase">
                  <tr>
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Rank</th>
                    <th className="px-6 py-3">Tenure</th>
                    <th className="px-6 py-3">Office</th>
                    <th className="px-6 py-3">Other Notes</th>
                    <th className="px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {visible.map(({ member, office }) => (
                    <tr key={member.id} className="align-top hover:bg-gray-50/60">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-950">
                          {member.firstName} {member.lastName}
                        </p>
                        <p className="text-gray-500">{member.email}</p>
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {RANK_LABELS[member.facultyRank] ?? member.facultyRank}
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {TENURE_LABELS[member.tenureStatus] ?? member.tenureStatus}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {office ? (
                          <Badge tone="maroon">
                            {office.building} {office.roomNumber}
                          </Badge>
                        ) : (
                          <Badge tone="gray">Not Assigned</Badge>
                        )}
                      </td>
                      <td className="max-w-xs px-6 py-4 text-gray-600">
                        {member.otherNotes || "None"}
                      </td>
                      <td className="px-6 py-4">
                        {/* Delete button. The hidden input sends this
                            faculty member's id to deleteFaculty. */}
                        <form action={deleteFaculty} className="flex justify-end gap-2">
                          <ButtonLink
                            href={`/admin/faculty/${member.id}/edit`}
                            variant="outline"
                          >
                            Edit
                          </ButtonLink>

                          <input type="hidden" name="facultyId" value={member.id} />

                          <ConfirmDeleteButton
                            name={`${member.firstName} ${member.lastName}`}
                            label="Delete"
                          />
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </PageShell>
  );
}
