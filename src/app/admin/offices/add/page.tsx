import { db } from "@/prisma/db";
import { redirect } from "next/navigation";
import {
  Button,
  ButtonLink,
  Field,
  FormCard,
  inputClass,
  PageShell,
  selectClass,
} from "@/components/ui";

const buildings = [
  "AIC", "ANX", "BLK", "CHS", "CNS", "CWT", "ECHS", "FPA", "H", "KCB", "KLM",
  "JHBF", "LBV", "PLA", "PLG", "REC", "RLC", "STC", "TNC", "UPD", "UVIL", "WHT", "ZSC",
];
import { logChange } from "@/lib/history";

export default function AddOfficePage() {
  async function addOffice(formData: FormData) {
    "use server";

    const building = formData.get("building") as string;
    const roomNumber = formData.get("roomNumber") as string;
    const floor = Number(formData.get("floor"));
    const hasWindow = formData.get("hasWindow") === "true";
    const spaceType = formData.get("spaceType") as
      | "OFFICE"
      | "CUBICLE";
    const capacity = Math.max(1, Number(formData.get("capacity")) || 1);
    const notes = (formData.get("notes") as string).trim() || null;

    const office = await db.orm.public.Office.create({
      building,
      roomNumber,
      floor,
      hasWindow,
      spaceType,
      capacity,
      notes,
    });

    await logChange({
      action: "Added office",
      entity: "Office",
      entityId: office.id,
      details: `${building}-${roomNumber} (capacity ${capacity})`,
    });

    redirect("/admin/offices");
  }

  return (
    <PageShell
      eyebrow="Admin · Offices"
      title="Add Office"
      description="Register a new office or cubicle."
    >
      <FormCard title="Office details">
        <form action={addOffice} className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Building" htmlFor="building">
              <select
                id="building"
                name="building"
                required
                defaultValue=""
                className={selectClass}
              >
                <option value="" disabled>
                  Select Building
                </option>
                {buildings.map((building) => (
                  <option key={building} value={building}>
                    {building}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Room Number" htmlFor="roomNumber">
              <input id="roomNumber" name="roomNumber" required className={inputClass} />
            </Field>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Floor" htmlFor="floor">
              <input
                id="floor"
                name="floor"
                type="number"
                min="1"
                required
                className={inputClass}
              />
            </Field>

            <Field label="Capacity" htmlFor="capacity" hint="How many people fit.">
              <input
                id="capacity"
                name="capacity"
                type="number"
                min="1"
                defaultValue="1"
                required
                className={inputClass}
              />
            </Field>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Has Window?" htmlFor="hasWindow">
              <select
                id="hasWindow"
                name="hasWindow"
                required
                defaultValue=""
                className={selectClass}
              >
                <option value="" disabled>
                  Select
                </option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </Field>

            <Field label="Space Type" htmlFor="spaceType">
              <select
                id="spaceType"
                name="spaceType"
                required
                defaultValue=""
                className={selectClass}
              >
                <option value="" disabled>
                  Select
                </option>
                <option value="OFFICE">Office</option>
                <option value="CUBICLE">Cubicle</option>
              </select>
            </Field>
          </div>

          <Field label="Notes" htmlFor="notes" hint="Optional, e.g. Department Chair office.">
            <textarea id="notes" name="notes" rows={3} className={inputClass} />
          </Field>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <ButtonLink href="/admin/offices" variant="outline">
              Cancel
            </ButtonLink>
            <Button type="submit">Add Office</Button>
          </div>
        </form>
      </FormCard>
    </PageShell>
  );
}
