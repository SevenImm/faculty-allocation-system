/**
 * Edit Office Page  (/admin/offices/<id>/edit)
 *
 * Lets the administrator change any detail of one office: building,
 * room, floor, window, space type, status, capacity and notes.
 * Only the fields that actually changed are written to the change history.
 */

import {
  Button,
  ButtonLink,
  Field,
  FormCard,
  inputClass,
  PageShell,
  selectClass,
} from "@/components/ui";
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
    <PageShell
      eyebrow="Admin · Offices"
      title={`Edit Office: ${office.building}-${office.roomNumber}`}
      description="Only fields you change are written to the change history."
    >
      <FormCard title="Office details">
        <form action={saveOffice} className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-3">
            <Field label="Building" htmlFor="building">
              <input id="building" name="building" defaultValue={office.building} required className={inputClass} />
            </Field>

            <Field label="Room number" htmlFor="roomNumber">
              <input id="roomNumber" name="roomNumber" defaultValue={office.roomNumber} required className={inputClass} />
            </Field>

            <Field label="Floor" htmlFor="floor">
              <input id="floor" name="floor" type="number" min="1" defaultValue={office.floor} required className={inputClass} />
            </Field>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            <Field label="Window" htmlFor="hasWindow">
              <select id="hasWindow" name="hasWindow" defaultValue={office.hasWindow ? "true" : "false"} className={selectClass}>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </Field>

            <Field label="Space type" htmlFor="spaceType">
              <select id="spaceType" name="spaceType" defaultValue={office.spaceType} className={selectClass}>
                {Object.entries(SPACE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Status" htmlFor="status">
              <select id="status" name="status" defaultValue={office.status} className={selectClass}>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Capacity (people)" htmlFor="capacity">
            <input id="capacity" name="capacity" type="number" min="1" defaultValue={office.capacity} required className={inputClass} />
          </Field>

          <Field label="Notes" htmlFor="notes">
            <textarea id="notes" name="notes" defaultValue={office.notes ?? ""} rows={3} className={inputClass} />
          </Field>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <ButtonLink href="/admin/offices" variant="outline">
              Cancel
            </ButtonLink>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </FormCard>
    </PageShell>
  );
}
