/**
 * Export Spreadsheet
 *
 * GET /admin/export downloads the current offices, faculty and active
 * assignments as an .xlsx file, in the same format as the master
 * spreadsheet (so it can be imported again).
 */

import { exportSpreadsheet } from "@/lib/spreadsheet";

export async function GET() {
  const file = await exportSpreadsheet();
  const date = new Date().toISOString().slice(0, 10);

  return new Response(file, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Faculty_Office_Spaces_${date}.xlsx"`,
    },
  });
}
