"use server";

/**
 * Server Actions for the Import Spreadsheet page.
 * They run on the server, where the database connection lives.
 */

import { parseSpreadsheet, importSpreadsheet, type ImportReport } from "@/lib/spreadsheet";
import { logChange } from "@/lib/history";

export type ImportResult =
  | { ok: true; report: ImportReport }
  | { ok: false; error: string };

async function run(formData: FormData, apply: boolean): Promise<ImportResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Please choose an .xlsx file first." };
  }
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return { ok: false, error: "Only .xlsx files are supported." };
  }

  try {
    const parsed = await parseSpreadsheet(await file.arrayBuffer());
    const report = await importSpreadsheet(parsed, { apply });

    if (apply) {
      const { offices, faculty, allocations } = report.toAdd;
      await logChange({
        action: "Imported spreadsheet",
        entity: "Import",
        details: `${file.name}: added ${offices} offices, ${faculty} faculty, ${allocations} assignments`,
      });
    }

    return { ok: true, report };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not read the file." };
  }
}

// Reads the file and reports what WOULD be added. Saves nothing.
export async function previewImport(formData: FormData) {
  return run(formData, false);
}

// Reads the file and saves only the records that are missing.
export async function applyImport(formData: FormData) {
  return run(formData, true);
}
