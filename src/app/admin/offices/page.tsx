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

import Link from "next/link";
import { db } from "@/prisma/db";
import { redirect } from "next/navigation";
import { logChange } from "@/lib/history";
import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";

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
    <main className="p-8">
      <h1 className="text-3xl font-bold">Office Management</h1>

      <Link
        href="/admin/offices/add"
        className="mt-6 inline-block border p-2 font-semibold"
      >
        + Add Office
      </Link>

      <h2 className="mt-8 text-2xl font-semibold">
        Offices
      </h2>
      {/* Office search and filtering form */}
<form method="get" className="mt-4 flex flex-wrap gap-2">

  {/* Search offices by building */}
  <input
    type="text"
    name="building"
    defaultValue={filters.building ?? ""}
    placeholder="Search by building"
    className="border p-2"
  />

  {/* Search offices by minimum capacity */}
  <input
    type="number"
    name="capacity"
    min="1"
    defaultValue={filters.capacity ?? ""}
    placeholder="Minimum capacity"
    className="border p-2"
  />

  {/* Filter offices by windows */}
  <select
    name="windows"
    defaultValue={filters.windows ?? ""}
    className="border p-2"
  >
    <option value="">Any windows</option>
    <option value="yes">Has windows</option>
    <option value="no">No windows</option>
  </select>

  {/* Filter offices by status */}
  <select
    name="status"
    defaultValue={filters.status ?? ""}
    className="border p-2"
  >
    <option value="">All statuses</option>
    <option value="AVAILABLE">Available</option>
    <option value="RESERVED">Reserved</option>
    <option value="UNAVAILABLE">Unavailable</option>
  </select>

  {/* Submit the search */}
  <button
    type="submit"
    className="border p-2 font-semibold"
  >
    Search
  </button>

  {/* Reset all filters */}
  <Link href="/admin/offices" className="border p-2">
    Clear
  </Link>

</form>

{/* Display the number of matching offices */}
<p className="mt-2">
  Showing {visible.length} of {offices.length} offices
</p>

      {visible.length === 0 ? (
  <p className="mt-4">
    {offices.length === 0
      ? "No offices have been added yet."
      : "No offices match your search."}
  </p>
) : (
        <div className="mt-4">
          {visible.map((office) => (
            <div key={office.id} className="mb-4 border p-4">
              <p>
                <strong>
                  {office.building} {office.roomNumber}
                </strong>
              </p>

              <p>Floor: {office.floor}</p>

              <p>
                Window: {office.hasWindow ? "Yes" : "No"}
              </p>

              <p>
                Space Type: {office.spaceType}
              </p>

              <p>
                Status: {office.status}
              </p>
              
                <p>Capacity: {office.capacity}</p>

              {office.notes && <p>Notes: {office.notes}</p>}
              

              <form action={updateOfficeStatus} className="mt-3 flex gap-2">
        <input
          type="hidden"
          name="officeId"
          value={office.id}
  />

        <select
          name="status"
          defaultValue={office.status}
          className="border p-2"
  >
        <option value="AVAILABLE">Available</option>
        <option value="RESERVED">Reserved</option>
        <option value="UNAVAILABLE">Unavailable</option>
      </select>

      <button
          type="submit"
          className="border p-2 font-semibold"
  >
    Update Status
      </button>

      <Link
        href={`/admin/offices/${office.id}/edit`}
        className="border p-2 font-semibold"
      >
        Edit
      </Link>
    </form>

    <form action={deleteOffice} className="mt-2">
      <input type="hidden" name="officeId" value={office.id} />
      <ConfirmDeleteButton
        name={`${office.building}-${office.roomNumber}`}
        label="Delete Office"
        warning="Anyone assigned to it will be left without an office, and its assignment history is removed."
      />
    </form>

            </div>
          ))}
        </div>
      )}
    </main>
  );
}