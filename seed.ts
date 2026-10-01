/**
 * Initial database seed.
 *
 * This script inserts the four university academic departments currently
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
      {
        name: "A. R. Sanchez, Jr. School of Business",
        building: null,
      },
      {
        name: "College of Arts and Sciences",
        building: null,
      },
      {
        name: "College of Education",
        building: null,
      },
      {
        name: "College of Nursing and Health Sciences",
        building: null,
      },
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