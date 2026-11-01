/**
 * Office Management Page
 *
 * Displays every physical office/cubicle currently stored in PostgreSQL
 * and provides navigation to the Add Office page.
 *
 * Office availability is NOT stored as a Boolean on Office.
 * Availability is determined from active Allocation records elsewhere
 * in the system.
 */

import { db } from "@/prisma/db";
import { redirect } from "next/navigation";
import { logChange } from "@/lib/history";
import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";
import { SPACE_LABELS, STATUS_LABELS } from "@/lib/labels";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  inputClass,
  PageShell,
  SectionHeading,
  selectClass,
} from "@/components/ui";

const statusTone = {
  AVAILABLE: "green",
  RESERVED: "gold",
  UNAVAILABLE: "maroon",
} as const;

export default async function OfficesPage({
  searchParams,
}: {
  searchParams: Promise<{
    building?: string;
    capacity?: string;
    windows?: string;
    status?: string;
  }>;
}) {
    // Read the search filters from the URL.
  const filters = await searchParams;
  // Retrieve all physical spaces from PostgreSQL.
  const offices = await db.orm.public.Office.all();
    // Filter offices based on the user's search criteria.
  const visible = offices.filter((office) => {

    // Search by building name.
    if (
      filters.building &&
      !office.building
        .toLowerCase()
        .includes(filters.building.trim().toLowerCase())
    ) {
      return false;
    }

    // Search by minimum office capacity.
    if (filters.capacity) {
      const capacity = Number(filters.capacity);

      if (!Number.isFinite(capacity) || office.capacity < capacity) {
        return false;
      }
    }

    // Search by whether the office has windows.
    if (filters.windows === "yes" && !office.hasWindow) {
      return false;
    }

    if (filters.windows === "no" && office.hasWindow) {
      return false;
    }

    // Search by office status.
    if (filters.status && office.status !== filters.status) {
      return false;
    }

    return true;
  });

  async function updateOfficeStatus(formData: FormData) {
  "use server";

  const officeId = Number(formData.get("officeId"));

  const status = formData.get("status") as
    | "AVAILABLE"
    | "RESERVED"
    | "UNAVAILABLE";

  const before = await db.orm.public.Office.where({ id: officeId }).first();

  await db.orm.public.Office
    .where({ id: officeId })
    .update({
      status,
    });

  if (before && before.status !== status) {
    await logChange({
      action: "Changed office status",
      entity: "Office",
      entityId: officeId,
      details: `${before.building}-${before.roomNumber}: ${before.status} → ${status}`,
    });
  }

  redirect("/admin/offices");
}

  // Runs on the server when a "Delete Office" button is pressed.
  async function deleteOffice(formData: FormData) {
    "use server";

    const officeId = Number(formData.get("officeId"));
    const office = await db.orm.public.Office.where({ id: officeId }).first();
    if (!office) redirect("/admin/offices");

    // An office can't be deleted while allocations point to it,
    // so remove its allocations (current and past) first.
    const allocations = await db.orm.public.Allocation.where({ officeId }).all();
    const occupied = allocations.filter((a) => a.endedAt === null).length;

    await db.orm.public.Allocation.where({ officeId }).deleteAndCount();
    await db.orm.public.Office.where({ id: officeId }).delete();

    await logChange({
      action: "Deleted office",
      entity: "Office",
      entityId: officeId,
      details:
        `${office.building}-${office.roomNumber}` +
        (occupied > 0 ? ` (${occupied} faculty left without an office)` : ""),
    });

    redirect("/admin/offices");
  }

  return (
    <PageShell
      eyebrow="Admin"
      title="Office Management"
      description="Every office and cubicle, with its details, capacity and status."
      actions={<ButtonLink href="/admin/offices/add">+ Add Office</ButtonLink>}
    >
      <SectionHeading
        title="Offices"
        description={`Showing ${visible.length} of ${offices.length} offices`}
      />

      {/* Office search and filtering form */}
      <Card className="mt-6 p-4">
        <form method="get" className="grid gap-3 md:grid-cols-[1.5fr_1fr_1fr_1fr_auto]">
          {/* Search offices by building */}
          <input
            type="text"
            name="building"
            defaultValue={filters.building ?? ""}
            placeholder="Search by building"
            aria-label="Building"
            className={inputClass}
          />

          {/* Search offices by minimum capacity */}
          <input
            type="number"
            name="capacity"
            min="1"
            defaultValue={filters.capacity ?? ""}
            placeholder="Minimum capacity"
            aria-label="Minimum capacity"
            className={inputClass}
          />

          {/* Filter offices by windows */}
          <select
            name="windows"
            defaultValue={filters.windows ?? ""}
            aria-label="Windows"
            className={selectClass}
          >
            <option value="">Any windows</option>
            <option value="yes">Has windows</option>
            <option value="no">No windows</option>
          </select>

          {/* Filter offices by status */}
          <select
            name="status"
            defaultValue={filters.status ?? ""}
            aria-label="Status"
            className={selectClass}
          >
            <option value="">All statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="RESERVED">Reserved</option>
            <option value="UNAVAILABLE">Unavailable</option>
          </select>

          {/* Submit the search / reset all filters */}
          <div className="flex gap-2">
            <Button type="submit">Search</Button>
            <ButtonLink href="/admin/offices" variant="outline">
              Clear
            </ButtonLink>
          </div>
        </form>
      </Card>

      {visible.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={
              offices.length === 0
                ? "No offices have been added yet."
                : "No offices match your search."
            }
            action={
              offices.length === 0 ? (
                <ButtonLink href="/admin/offices/add">+ Add Office</ButtonLink>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((office) => (
            <Card key={office.id} className="flex flex-col p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xl font-medium tracking-tight text-gray-950">
                    {office.building} {office.roomNumber}
                  </p>
                  <p className="text-sm/6 text-gray-500">
                    {SPACE_LABELS[office.spaceType] ?? office.spaceType}
                  </p>
                </div>
                <Badge tone={statusTone[office.status as keyof typeof statusTone] ?? "gray"}>
                  {STATUS_LABELS[office.status] ?? office.status}
                </Badge>
              </div>

              <dl className="mt-5 grid grid-cols-3 gap-4 text-sm/6">
                <div>
                  <dt className="text-gray-500">Floor</dt>
                  <dd className="font-medium text-gray-950">{office.floor}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Window</dt>
                  <dd className="font-medium text-gray-950">
                    {office.hasWindow ? "Yes" : "No"}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Capacity</dt>
                  <dd className="font-medium text-gray-950">{office.capacity}</dd>
                </div>
              </dl>

              {office.notes && (
                <p className="mt-4 rounded-lg bg-gold-50 px-3 py-2 text-sm/6 text-gray-700 ring-1 ring-gold-200">
                  {office.notes}
                </p>
              )}

              <div className="mt-auto border-t border-black/5 pt-5">
                <form action={updateOfficeStatus} className="mt-1 flex gap-2">
                  <input type="hidden" name="officeId" value={office.id} />

                  <select
                    name="status"
                    defaultValue={office.status}
                    aria-label="Office status"
                    className={selectClass}
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="RESERVED">Reserved</option>
                    <option value="UNAVAILABLE">Unavailable</option>
                  </select>

                  <Button type="submit" variant="outline">
                    Update
                  </Button>
                </form>

                <form action={deleteOffice} className="mt-3 flex gap-2">
                  <ButtonLink href={`/admin/offices/${office.id}/edit`} variant="outline">
                    Edit
                  </ButtonLink>

                  <input type="hidden" name="officeId" value={office.id} />
                  <ConfirmDeleteButton
                    name={`${office.building}-${office.roomNumber}`}
                    label="Delete Office"
                    warning="Anyone assigned to it will be left without an office, and its assignment history is removed."
                  />
                </form>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}
