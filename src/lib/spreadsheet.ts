/**
 * Master Spreadsheet: import and export.
 *
 * Shared by:
 *   - the Import Spreadsheet page (/admin/import)
 *   - the Export Spreadsheet download (/admin/export)
 *   - the command-line script (scripts/import-spreadsheet.ts)
 *
 * The spreadsheet format is the client's "Current Faculty Office Spaces":
 * one row per occupant (or per vacant office) with these columns:
 *   Department | Faculty Rank | Faculty Name | Tenure Description |
 *   Office Location | Office Description | Other Notes
 *
 * Import only ADDS what is missing. Existing offices, faculty and active
 * allocations are reused, so uploading an updated spreadsheet never
 * creates duplicates.
 */

import ExcelJS from "exceljs";
import { db } from "@/prisma/db";

// ---------------------------------------------------------------------------
// Mappings between spreadsheet text and database values
// ---------------------------------------------------------------------------

// Short names used in the spreadsheet -> official COAS names (from seed.ts).
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
  | "VISITING_LECTURER"
  | "VISITING_ASSISTANT";

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
  // Not in the client's ranking list yet; stored as-is so no one is lost.
  "Visiting Assistant Professor": "VISITING_ASSISTANT",
};

type Tenure = "TENURED" | "TENURE_TRACK" | "FIXED_TERM";

const TENURES: Record<string, Tenure> = {
  "Tenured": "TENURED",
  "On Tenure Track": "TENURE_TRACK",
  // Assumption: non-tenured faculty in this sheet are fixed-term
  // (instructional, lecturer and visiting ranks). Pending confirmation.
  "Not Tenured": "FIXED_TERM",
};

type SpaceType = "OFFICE" | "CUBICLE";

// "Office Description" column -> space type + window.
const DESCRIPTIONS: Record<string, { spaceType: SpaceType; hasWindow: boolean }> = {
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

// Reverse a mapping (database value -> spreadsheet text) for the export.
function reverse<T extends string>(map: Record<string, T>): Record<string, string> {
  return Object.fromEntries(Object.entries(map).map(([text, value]) => [value, text]));
}

const COLUMNS = [
  "Department", "Faculty Rank", "Faculty Name", "Tenure Description",
  "Office Location", "Office Description", "Other Notes",
];

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
// 1. Read the spreadsheet (nothing is saved yet)
// ---------------------------------------------------------------------------

type OfficeRow = {
  building: string;
  roomNumber: string;
  floor: number;
  spaceType: SpaceType;
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

export type ParsedSpreadsheet = {
  offices: Map<string, OfficeRow>;
  faculty: FacultyRow[];
  warnings: string[];
};

export async function parseSpreadsheet(data: ArrayBuffer): Promise<ParsedSpreadsheet> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(data);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("The file has no worksheets.");

  // Find each column by its header text so column order doesn't matter.
  const headers: Record<string, number> = {};
  sheet.getRow(1).eachCell((cell, col) => {
    headers[text(cell.value)] = col;
  });
  const missing = COLUMNS.filter((h) => !(h in headers));
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

    // The same office can appear on several rows (shared office).
    // Occupants are counted below, only for rows with a valid faculty member.
    if (!offices.has(key)) {
      const description = get("Office Description");
      let features = DESCRIPTIONS[description];
      if (!features) {
        warn(`office ${key} has no usable description ("${description || "-"}"), saved as OFFICE without window`);
        features = { spaceType: "OFFICE", hasWindow: false };
      }

      const notes = get("Other Notes");
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

  return { offices, faculty, warnings };
}

// ---------------------------------------------------------------------------
// 2. Compare with the database (preview) and optionally save (apply)
// ---------------------------------------------------------------------------

export type ImportReport = {
  applied: boolean;
  inFile: { offices: number; faculty: number };
  toAdd: { offices: number; faculty: number; allocations: number };
  sharedOffices: string[];
  warnings: string[];
};

export async function importSpreadsheet(
  parsed: ParsedSpreadsheet,
  { apply }: { apply: boolean }
): Promise<ImportReport> {
  const departments = await db.orm.public.Department.all();
  const departmentId = new Map(departments.map((d) => [d.name, d.id]));
  const missingDepartments = [...new Set(parsed.faculty.map((f) => f.departmentName))]
    .filter((name) => !departmentId.has(name));
  if (missingDepartments.length > 0) {
    throw new Error(`Run "npx tsx seed.ts" first. Missing departments: ${missingDepartments.join(", ")}`);
  }

  const toAdd = { offices: 0, faculty: 0, allocations: 0 };
  const officeId = new Map<string, number | undefined>();

  // ---- Offices: reuse if building + room already exists ----
  for (const [key, o] of parsed.offices) {
    let office = await db.orm.public.Office
      .where({ building: o.building, roomNumber: o.roomNumber })
      .first();

    if (!office) {
      toAdd.offices++;
      if (apply) {
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
      }
    }
    officeId.set(key, office?.id);
  }

  // ---- Faculty + their current office ----
  for (const f of parsed.faculty) {
    const deptId = departmentId.get(f.departmentName)!;
    let member = await db.orm.public.Faculty
      .where({ firstName: f.firstName, lastName: f.lastName, departmentId: deptId })
      .first();

    if (!member) {
      toAdd.faculty++;
      if (apply) {
        member = await db.orm.public.Faculty.create({
          firstName: f.firstName,
          lastName: f.lastName,
          email: null, // not provided by the spreadsheet
          tenureStatus: f.tenureStatus,
          facultyRank: f.facultyRank,
          departmentId: deptId,
        });
      }
    }

    // A new faculty member has no allocation yet; an existing one only
    // gets one if they don't already have an active office.
    const active = member
      ? await db.orm.public.Allocation.where({ facultyId: member.id, endedAt: null }).first()
      : null;

    if (!active) {
      toAdd.allocations++;
      const targetOffice = officeId.get(f.officeKey);
      if (apply && member && targetOffice) {
        await db.orm.public.Allocation.create({ facultyId: member.id, officeId: targetOffice });
      }
    }
  }

  return {
    applied: apply,
    inFile: { offices: parsed.offices.size, faculty: parsed.faculty.length },
    toAdd,
    sharedOffices: [...parsed.offices.entries()]
      .filter(([, o]) => o.occupants > 1)
      .map(([key, o]) => `${key} (${o.occupants} occupants)`),
    warnings: parsed.warnings,
  };
}

// ---------------------------------------------------------------------------
// 3. Export the current database in the same spreadsheet format
// ---------------------------------------------------------------------------

export async function exportSpreadsheet(): Promise<ArrayBuffer> {
  const [offices, faculty, allocations, departments] = await Promise.all([
    db.orm.public.Office.all(),
    db.orm.public.Faculty.all(),
    db.orm.public.Allocation.all(),
    db.orm.public.Department.all(),
  ]);

  const departmentText = reverse(DEPARTMENTS);
  const rankText = reverse(RANKS);
  const tenureText = reverse(TENURES);
  const departmentName = new Map(departments.map((d) => [d.id, d.name]));
  const active = allocations.filter((a) => a.endedAt === null);

  const describe = (o: { spaceType: SpaceType; hasWindow: boolean }) =>
    Object.entries(DESCRIPTIONS).find(
      ([, d]) => d.spaceType === o.spaceType && d.hasWindow === o.hasWindow
    )?.[0] ?? "-";

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Alpha order");
  sheet.addRow(COLUMNS).font = { bold: true };

  const sorted = [...offices].sort((a, b) =>
    `${a.building}-${a.roomNumber}`.localeCompare(`${b.building}-${b.roomNumber}`)
  );

  for (const office of sorted) {
    const location = `${office.building}-${office.roomNumber}`;
    const occupants = active
      .filter((a) => a.officeId === office.id)
      .map((a) => faculty.find((f) => f.id === a.facultyId))
      .filter((f) => f !== undefined);

    if (occupants.length === 0) {
      // Vacant office: one row with "-" for the faculty columns.
      sheet.addRow(["-", "-", "-", "-", location, describe(office), office.notes ?? ""]);
      continue;
    }

    for (const member of occupants) {
      const dept = departmentName.get(member.departmentId) ?? "";
      sheet.addRow([
        departmentText[dept] ?? dept,
        rankText[member.facultyRank] ?? member.facultyRank,
        `${member.lastName}, ${member.firstName}`,
        tenureText[member.tenureStatus] ?? member.tenureStatus,
        location,
        describe(office),
        office.notes ?? "",
      ]);
    }
  }

  sheet.columns.forEach((column) => (column.width = 28));
  return (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
}
