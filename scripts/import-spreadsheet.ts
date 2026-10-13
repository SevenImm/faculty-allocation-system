/**
 * Command-line version of the spreadsheet import.
 * (The same logic is used by the Import Spreadsheet page in /admin/import.)
 *
 *   npx tsx scripts/import-spreadsheet.ts            -> preview only
 *   npx tsx scripts/import-spreadsheet.ts --apply    -> saves to the database
 */

import { readFile } from "node:fs/promises";
import { db } from "../src/prisma/db";
import { parseSpreadsheet, importSpreadsheet } from "../src/lib/spreadsheet";

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const file = args.find((a) => !a.startsWith("--")) ?? "data/Current_Faculty_Office_Spaces.xlsx";

  const bytes = await readFile(file);
  const parsed = await parseSpreadsheet(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  const report = await importSpreadsheet(parsed, { apply });

  console.log(`\nFile: ${file}`);
  console.log(`In file:  ${report.inFile.offices} offices, ${report.inFile.faculty} faculty`);
  console.log(`${apply ? "Added" : "Would add"}: ${report.toAdd.offices} offices, ${report.toAdd.faculty} faculty, ${report.toAdd.allocations} allocations`);
  for (const s of report.sharedOffices) console.log(`Shared office: ${s}`);
  console.log(`\nWarnings (${report.warnings.length}):`);
  for (const w of report.warnings) console.log(`  - ${w}`);
  if (!apply) console.log(`\nPREVIEW ONLY. Nothing was saved. Run again with --apply to import.\n`);

  await db.close();
}

main().catch(async (error) => {
  console.error(error);
  await db.close();
  process.exit(1);
});
