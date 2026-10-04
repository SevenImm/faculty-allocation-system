/**
 * Initial database seed.
 *
 * This script inserts the COAS academic units (6 departments and 2 schools)
 * required by the Faculty Allocation System.
 *
 * Run from the project root with:
 *
 * npx tsx seed.ts
 *
 * Department buildings are currently null because the official mapping
 * between departments and campus buildings has not yet been provided.
 *
 * onConflict: "skip" prevents duplicate departments if this script is
 * accidentally executed more than once.
 */

import { db } from "./src/prisma/db";

async function main() {
 await db.orm.public.Department.createAll(
    [
      { name: "Department of Biology and Chemistry", building: null },
      { name: "Department of Fine and Performing Arts", building: null },
      { name: "Department of Humanities", building: null },
      { name: "Department of Mathematics and Physics", building: null },
      { name: "Department of Psychology and Communication", building: null },
      { name: "Department of Social Sciences", building: null },
      { name: "School of Engineering", building: null },
      { name: "School of First Year Experiences", building: null },
    ],
    { onConflict: "skip" }
  );

  // Read the departments back from PostgreSQL so whoever runs the
  // seed can verify that the records were successfully inserted.
  const departments = await db.orm.public.Department.all();

  console.log("Departments:");
  console.log(departments);

  // Close the database connection after the seed finishes.
  await db.close();
}

main().catch(async (error) => {
  console.error(error);
  await db.close();
  process.exit(1);
});