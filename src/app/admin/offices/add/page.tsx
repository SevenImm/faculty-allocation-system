import { db } from "@/prisma/db";
import { redirect } from "next/navigation";

export default function AddOfficePage() {
  async function addOffice(formData: FormData) {
    "use server";

    const building = formData.get("building") as string;
    const roomNumber = formData.get("roomNumber") as string;
    const floor = Number(formData.get("floor"));
    const hasWindow = formData.get("hasWindow") === "true";
    const spaceType = formData.get("spaceType") as string;

    await db.orm.public.Office.create({
      building,
      roomNumber,
      floor,
      hasWindow,
      spaceType,
    });

    redirect("/admin/offices");
  }

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold">Add Office</h1>

      <form action={addOffice} className="mt-8 flex max-w-md flex-col gap-4">

        <select
          name="building"
          required
          defaultValue=""
          className="border p-2"
        >
          <option value="" disabled>
            Select Building
          </option>

          <option value="AIC">AIC</option>
          <option value="ANX">ANX</option>
          <option value="BLK">BLK</option>
          <option value="CHS">CHS</option>
          <option value="CNS">CNS</option>
          <option value="CWT">CWT</option>
          <option value="ECHS">ECHS</option>
          <option value="FPA">FPA</option>
          <option value="H">H</option>
          <option value="KCB">KCB</option>
          <option value="KLM">KLM</option>
          <option value="JHBF">JHBF</option>
          <option value="LBV">LBV</option>
          <option value="PLA">PLA</option>
          <option value="PLG">PLG</option>
          <option value="REC">REC</option>
          <option value="RLC">RLC</option>
          <option value="STC">STC</option>
          <option value="TNC">TNC</option>
          <option value="UPD">UPD</option>
          <option value="UVIL">UVIL</option>
          <option value="WHT">WHT</option>
          <option value="ZSC">ZSC</option>
        </select>

        <input
          name="roomNumber"
          placeholder="Room Number"
          required
          className="border p-2"
        />

        <input
          name="floor"
          type="number"
          min="1"
          placeholder="Floor"
          required
          className="border p-2"
        />

        <select
          name="hasWindow"
          required
          defaultValue=""
          className="border p-2"
        >
          <option value="" disabled>
            Has Window?
          </option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>

        <select
          name="spaceType"
          required
          defaultValue=""
          className="border p-2"
        >
          <option value="" disabled>
            Select Space Type
          </option>

          <option value="OFFICE">Office</option>
          <option value="CUBICLE">Cubicle</option>
        </select>

        <button
          type="submit"
          className="border p-2 font-semibold"
        >
          Add Office
        </button>

      </form>
    </main>
  );
}