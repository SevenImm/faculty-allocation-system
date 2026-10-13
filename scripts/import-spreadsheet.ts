/**
 * Master Spreadsheet Import
 *
 * Reads the "Current Faculty Office Spaces" Excel file and loads:
 *   - Offices      (one per building + room)
 *   - Faculty      (one per named row)
 *   - Allocations  (the faculty member's current office, active = endedAt null)
 *
 * Usage (from the project root):
 *
 *   npx tsx scripts/import-spreadsheet.ts            -> PREVIEW only, saves nothing
 *   npx tsx scripts/import-spreadsheet.ts --apply    -> saves to the database
 *
 * Optional: pass a different file path as the first argument.
 *
 * The spreadsheet contains real faculty names. Keep it in the local data/
 * folder and NEVER commit it (the repository is public).
 *
 * Rows that cannot be mapped safely are NOT guessed. They are listed as
 * warnings so an administrator can review them.
 */

import ExcelJS from "exceljs";
import { db } from "../src/prisma/db";

const DEFAULT_FILE = "data/Current_Faculty_Office_Spaces.xlsx";

// ---------------------------------------------------------------------------
// Mappings from spreadsheet text to database values
// ---------------------------------------------------------------------------

// Short department names used in the spreadsheet -> official COAS names
// (must match the names created by seed.ts).
const DEPARTMENTS: Record<string, string> = {
  "Biology&Chemistry": "Department of Biology and Chemistry",
  "Fine&Performing Arts": "Department of Fine and Performing Arts",
  "Humanities": "Department of Humanities",
  "Mathematics & Physics": "Department of Mathematics and Physics",
  "Psychology & Communication": "Department of Psychology and Communication",
  "Social Sciences": "Department of Social Sciences",
  "Engineering": "School of Engineering",
  "School of First Yr Experiences": "School of First Year Experiences",
};

type Rank =
  | "FULL"
  | "ASSOCIATE"
  | "ASSISTANT"
  | "INSTRUCTIONAL_FULL"
  | "INSTRUCTIONAL_ASSOCIATE"
  | "INSTRUCTIONAL_ASSISTANT"
  | "SENIOR_LECTURER"
  | "LECTURER_INSTRUCTOR"
  | "VISITING_INSTRUCTIONAL_ASSISTANT"
  | "VISITING_LECTURER";

// "Visiting Assistant Professor" is intentionally missing: it is not in the
// client's ranking list, so those rows are reported instead of guessed.
const RANKS: Record<string, Rank> = {
  "Professor": "FULL",
  "Associate Professor": "ASSOCIATE",
  "Assistant Professor": "ASSISTANT",
  "Instructional Professor": "INSTRUCTIONAL_FULL",
  "Instructional Associate": "INSTRUCTIONAL_ASSOCIATE",
  "Instructional Assistant": "INSTRUCTIONAL_ASSISTANT",
  "Senior Lecturer": "SENIOR_LECTURER",
  "Lecturer": "LECTURER_INSTRUCTOR",
  "Visiting Instr. Assist. Prof.": "VISITING_INSTRUCTIONAL_ASSISTANT",
  "Visiting Lecturer": "VISITING_LECTURER",
};

type Tenure = "TENURED" | "TENURE_TRACK" | "FIXED_TERM";

const TENURES: Record<string, Tenure> = {
  "Tenured": "TENURED",
  "On Tenure Track": "TENURE_TRACK",
  // Assumption: non-tenured faculty in this sheet are fixed-term
  // (instructional, lecturer and visiting ranks). Pending confirmation.
  "Not Tenured": "FIXED_TERM",
};

// "Office Description" column -> space type + window.
const DESCRIPTIONS: Record<string, { spaceType: "OFFICE" | "CUBICLE"; hasWindow: boolean }> = {
  "Window": { spaceType: "OFFICE", hasWindow: true },
  "No Window": { spaceType: "OFFICE", hasWindow: false },
  "Cubicle": { spaceType: "CUBICLE", hasWindow: false },
  "Windowed Cubicle": { spaceType: "CUBICLE", hasWindow: true },
};

type Status = "AVAILABLE" | "RESERVED" | "UNAVAILABLE";

// Derive office status from the "Other Notes" column.
function statusFromNotes(notes: string): Status {
  const n = notes.toLowerCase();
  if (n.includes("do not assign")) return "UNAVAILABLE";
  if (n.includes("chair office") || n.includes("director office") || n.includes("office for the")) {
    return "RESERVED";
  }
  return "AVAILABLE";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Read a cell as clean text ("-" and empty cells become "").
function text(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && "richText" in value) {
    return value.richText.map((part) => part.text).join("").trim();
  }
  const s = String(value).trim();
  return s === "-" ? "" : s;
}

// "AIC-312" -> { building: "AIC", roomNumber: "312", floor: 3 }
function parseLocation(raw: string, warn: (msg: string) => void) {
  let value = raw;

  // "ACB2-332 (RELLIS Campus)" -> keep the room, report the campus note.
  const extra = value.match(/\(([^)]+)\)/);
  if (extra) {
    warn(`location "${raw}" includes "${extra[1]}", review manually`);
    value = value.replace(/\([^)]*\)/, "").trim();
  }

  const match = value.match(/^([A-Z]+\d*?)-?(\d+[A-Z]?)$/);
  if (!match) return null;

  const [, building, roomNumber] = match;
  if (!value.includes("-")) {
    warn(`location "${raw}" has no dash, read as ${building}-${roomNumber}`);
  }

  // The first digit of the room number is the floor (312 -> 3).
  return { building, roomNumber, floor: Number(roomNumber[0]) };
}

// "Hood, Brittany J" -> { lastName: "Hood", firstName: "Brittany J" }
function parseName(raw: string) {
  const [lastName, firstName] = raw.split(",").map((part) => part.trim());
  if (!lastName || !firstName) return null;
  return { lastName, firstName };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

type OfficeRow = {
  building: string;
  roomNumber: string;
  floor: number;
  spaceType: "OFFICE" | "CUBICLE";
  hasWindow: boolean;
  status: Status;
  notes: string | null;
  occupants: number;
};

type FacultyRow = {
  firstName: string;
  lastName: string;
  departmentName: string;
  facultyRank: Rank;
  tenureStatus: Tenure;
  officeKey: string;
};

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const file = args.find((a) => !a.startsWith("--")) ?? DEFAULT_FILE;

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(file);
  const sheet = workbook.worksheets[0];

  // Find each column by its header text so column order doesn't matter.
  const headers: Record<string, number> = {};
  sheet.getRow(1).eachCell((cell, col) => {
    headers[text(cell.value)] = col;
  });
  const required = [
    "Department", "Faculty Rank", "Faculty Name", "Tenure Description",
    "Office Location", "Office Description", "Other Notes",
  ];
  const missing = required.filter((h) => !(h in headers));
  if (missing.length > 0) {
    throw new Error(`Missing columns in spreadsheet: ${missing.join(", ")}`);
  }

  const offices = new Map<string, OfficeRow>();
  const faculty: FacultyRow[] = [];
  const warnings: string[] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const get = (header: string) => text(row.getCell(headers[header]).value);
    const warn = (msg: string) => warnings.push(`Row ${rowNumber}: ${msg}`);

    const locationRaw = get("Office Location");
    if (!locationRaw) return; // empty row

    // ---- Office ----
    const location = parseLocation(locationRaw, warn);
    if (!location) {
      warn(`could not read office location "${locationRaw}", row skipped`);
      return;
    }
    const key = `${location.building}-${location.roomNumber}`;

    const description = get("Office Description");
    let features = DESCRIPTIONS[description];
    if (!features) {
      warn(`office ${key} has no usable description ("${description || "-"}"), saved as OFFICE without window`);
      features = { spaceType: "OFFICE", hasWindow: false };
    }

    const notes = get("Other Notes");
    // The same office can appear on several rows (shared office).
    // Occupants are counted below, only for rows with a valid faculty member.
    if (!offices.has(key)) {
      offices.set(key, {
        ...location,
        ...features,
        status: statusFromNotes(notes),
        notes: notes || null,
        occupants: 0,
      });
    }

    // ---- Faculty ----
    const nameRaw = get("Faculty Name");
    if (!nameRaw) return; // vacant office, no faculty on this row

    const name = parseName(nameRaw);
    const departmentName = DEPARTMENTS[get("Department")];
    const facultyRank = RANKS[get("Faculty Rank")];
    const tenureStatus = TENURES[get("Tenure Description")];

    if (!name) return warn(`could not read name "${nameRaw}", faculty skipped`);
    if (!departmentName) return warn(`unknown department "${get("Department")}", faculty skipped`);
    if (!facultyRank) return warn(`rank "${get("Faculty Rank")}" is not in the ranking list, faculty skipped (office still imported)`);
    if (!tenureStatus) return warn(`unknown tenure "${get("Tenure Description")}", faculty skipped`);

    offices.get(key)!.occupants += 1;
    faculty.push({ ...name, departmentName, facultyRank, tenureStatus, officeKey: key });
  });

  // ---- Preview report ----
  const shared = [...offices.entries()].filter(([, o]) => o.occupants > 1);
  const count = (s: Status) => [...offices.values()].filter((o) => o.status === s).length;

  console.log(`\nFile: ${file}`);
  console.log(`Offices:     ${offices.size}  (available ${count("AVAILABLE")}, reserved ${count("RESERVED")}, unavailable ${count("UNAVAILABLE")})`);
  console.log(`Faculty:     ${faculty.length}`);
  console.log(`Allocations: ${faculty.length}`);
  for (const [key, o] of shared) {
    console.log(`Shared office: ${key} has ${o.occupants} occupants (capacity set to ${o.occupants})`);
  }
  console.log(`\nWarnings (${warnings.length}):`);
  for (const w of warnings) console.log(`  - ${w}`);

  if (!apply) {
    console.log(`\nPREVIEW ONLY. Nothing was saved. Run again with --apply to import.\n`);
    await db.close();
    return;
  }

  // ---- Save to database ----
  // Existing records are reused, so running the import twice does not
  // create duplicates.
  const departments = await db.orm.public.Department.all();
  const departmentId = new Map(departments.map((d) => [d.name, d.id]));
  const missingDepartments = [...new Set(faculty.map((f) => f.departmentName))]
    .filter((name) => !departmentId.has(name));
  if (missingDepartments.length > 0) {
    throw new Error(`Run "npx tsx seed.ts" first. Missing departments: ${missingDepartments.join(", ")}`);
  }

  const created = { offices: 0, faculty: 0, allocations: 0 };
  const officeId = new Map<string, number>();

  for (const [key, o] of offices) {
    let office = await db.orm.public.Office
      .where({ building: o.building, roomNumber: o.roomNumber })
      .first();
    if (!office) {
      office = await db.orm.public.Office.create({
        building: o.building,
        roomNumber: o.roomNumber,
        floor: o.floor,
        hasWindow: o.hasWindow,
        spaceType: o.spaceType,
        status: o.status,
        capacity: Math.max(1, o.occupants),
        notes: o.notes,
      });
      created.offices++;
    }
    officeId.set(key, office.id);
  }

  for (const f of faculty) {
    const deptId = departmentId.get(f.departmentName)!;
    let member = await db.orm.public.Faculty
      .where({ firstName: f.firstName, lastName: f.lastName, departmentId: deptId })
      .first();
    if (!member) {
      member = await db.orm.public.Faculty.create({
        firstName: f.firstName,
        lastName: f.lastName,
        email: null, // not provided by the spreadsheet
        tenureStatus: f.tenureStatus,
        facultyRank: f.facultyRank,
        departmentId: deptId,
      });
      created.faculty++;
    }

    const active = await db.orm.public.Allocation
      .where({ facultyId: member.id, endedAt: null })
      .first();
    if (!active) {
      await db.orm.public.Allocation.create({
        facultyId: member.id,
        officeId: officeId.get(f.officeKey)!,
      });
      created.allocations++;
    }
  }

  console.log(`\nIMPORTED: ${created.offices} offices, ${created.faculty} faculty, ${created.allocations} allocations (existing records were skipped).\n`);
  await db.close();
}

main().catch(async (error) => {
  console.error(error);
  await db.close();
  process.exit(1);
});
