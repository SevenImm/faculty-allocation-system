/**
 * Edit Office Page  (/admin/offices/<id>/edit)
 *
 * Lets the administrator change any detail of one office: building,
 * room, floor, window, space type, status, capacity and notes.
 * Only the fields that actually changed are written to the change history.
 */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/prisma/db";
import { logChange, describeChanges } from "@/lib/history";
import { SPACE_LABELS, STATUS_LABELS } from "@/lib/labels";

export default async function EditOfficePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // The id comes from the URL: /admin/offices/7/edit -> "7"
  const id = Number((await params).id);

  const office = await db.orm.public.Office.where({ id }).first();
  if (!office) notFound();

  async function saveOffice(formData: FormData) {
    "use server";

    const current = await db.orm.public.Office.where({ id }).first();
    if (!current) redirect("/admin/offices");

    const updated = {
      building: (formData.get("building") as string).trim().toUpperCase(),
      roomNumber: (formData.get("roomNumber") as string).trim().toUpperCase(),
      floor: Number(formData.get("floor")),
      hasWindow: formData.get("hasWindow") === "true",
      spaceType: formData.get("spaceType") as "OFFICE" | "CUBICLE",
      status: formData.get("status") as "AVAILABLE" | "RESERVED" | "UNAVAILABLE",
      capacity: Math.max(1, Number(formData.get("capacity")) || 1),
      notes: (formData.get("notes") as string).trim() || null,
    };

    await db.orm.public.Office.where({ id }).update(updated);

    const readable = (o: typeof updated) => ({
      ...o,
      spaceType: SPACE_LABELS[o.spaceType] ?? o.spaceType,
      status: STATUS_LABELS[o.status] ?? o.status,
    });

    const changes = describeChanges(readable(current), readable(updated), {
      building: "Building",
      roomNumber: "Room",
      floor: "Floor",
      hasWindow: "Window",
      spaceType: "Space type",
      status: "Status",
      capacity: "Capacity",
      notes: "Notes",
    });

    if (changes.length > 0) {
      await logChange({
        action: "Edited office",
        entity: "Office",
        entityId: id,
        details: `${updated.building}-${updated.roomNumber}: ${changes.join("; ")}`,
      });
    }

    redirect("/admin/offices");
  }

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold">
        Edit Office: {office.building}-{office.roomNumber}
      </h1>

      <form action={saveOffice} className="mt-8 flex max-w-md flex-col gap-4">
        <label className="flex flex-col gap-1">
          Building
          <input name="building" defaultValue={office.building} required className="border p-2" />
        </label>

        <label className="flex flex-col gap-1">
          Room number
          <input name="roomNumber" defaultValue={office.roomNumber} required className="border p-2" />
        </label>

        <label className="flex flex-col gap-1">
          Floor
          <input name="floor" type="number" min="1" defaultValue={office.floor} required className="border p-2" />
        </label>

        <label className="flex flex-col gap-1">
          Window
          <select name="hasWindow" defaultValue={office.hasWindow ? "true" : "false"} className="border p-2">
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          Space type
          <select name="spaceType" defaultValue={office.spaceType} className="border p-2">
            {Object.entries(SPACE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          Status
          <select name="status" defaultValue={office.status} className="border p-2">
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          Capacity (people)
          <input name="capacity" type="number" min="1" defaultValue={office.capacity} required className="border p-2" />
        </label>

        <label className="flex flex-col gap-1">
          Notes
          <textarea name="notes" defaultValue={office.notes ?? ""} rows={3} className="border p-2" />
        </label>

        <div className="flex gap-4">
          <button type="submit" className="border p-2 font-semibold">
            Save Changes
          </button>
          <Link href="/admin/offices" className="border p-2">
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}
