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

export default async function OfficesPage() {
  // Retrieve all physical spaces from PostgreSQL.
  const offices = await db.orm.public.Office.all();

  async function updateOfficeStatus(formData: FormData) {
  "use server";

  const officeId = Number(formData.get("officeId"));

  const status = formData.get("status") as
    | "AVAILABLE"
    | "RESERVED"
    | "UNAVAILABLE";

  await db.orm.public.Office
    .where({ id: officeId })
    .update({
      status,
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

      {offices.length === 0 ? (
        <p className="mt-4">No offices have been added yet.</p>
      ) : (
        <div className="mt-4">
          {offices.map((office) => (
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
    </form>

            </div>
          ))}
        </div>
      )}
    </main>
  );
}