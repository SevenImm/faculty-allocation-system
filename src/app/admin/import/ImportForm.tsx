"use client";

/**
 * Upload form for the master spreadsheet.
 *
 * Step 1: choose the file and press "Preview" -> shows what would be added.
 * Step 2: press "Import" -> saves only the missing records.
 *
 * This runs in the browser so the selected file stays selected between
 * the preview and the import.
 */

import { useRef, useState } from "react";
import { previewImport, applyImport, type ImportResult } from "./actions";
import { Badge, Button, Card } from "@/components/ui";

export default function ImportForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);

  async function handle(action: typeof previewImport) {
    if (!formRef.current) return;
    setBusy(true);
    setResult(await action(new FormData(formRef.current)));
    setBusy(false);
  }

  const report = result?.ok ? result.report : null;
  const nothingToAdd =
    report && report.toAdd.offices + report.toAdd.faculty + report.toAdd.allocations === 0;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <Card>
        <form ref={formRef} onSubmit={(e) => e.preventDefault()} className="p-7 sm:p-10">
          <h2 className="text-base/6 font-medium text-gray-950">Spreadsheet file</h2>
          <p className="mt-1 text-sm/5 text-gray-600">Choose the .xlsx file, then preview it.</p>

          <label className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gold-200 bg-gold-50 px-6 py-10 text-center hover:border-gold">
            <span className="text-sm/6 font-medium text-gray-950">Click to choose a file</span>
            <span className="text-xs/5 text-gray-500">Excel .xlsx only</span>
            <input
              type="file"
              name="file"
              accept=".xlsx"
              className="mt-4 block w-full max-w-xs text-sm text-gray-700 file:mr-3 file:rounded-full file:border-0 file:bg-maroon file:px-4 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-maroon-800"
              onChange={() => setResult(null)}
            />
          </label>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant={report && !report.applied && !nothingToAdd ? "secondary" : "primary"}
              disabled={busy}
              onClick={() => handle(previewImport)}
            >
              {busy ? "Working..." : "Preview"}
            </Button>

            {report && !report.applied && !nothingToAdd && (
              <Button type="button" disabled={busy} onClick={() => handle(applyImport)}>
                Import
              </Button>
            )}
          </div>
        </form>
      </Card>

      {result && !result.ok && (
        <p className="rounded-xl bg-maroon-50 px-5 py-4 text-sm/6 font-medium text-maroon ring-1 ring-maroon/15">
          {result.error}
        </p>
      )}

      {report && (
        <Card className="relative overflow-hidden p-7 sm:p-10">
          <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-gold to-maroon" />
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-medium tracking-tight text-gray-950">
              {report.applied ? "Import complete" : "Preview"}
            </h2>
            <Badge tone={report.applied ? "green" : "gold"}>
              {report.applied ? "Saved" : "Nothing saved yet"}
            </Badge>
          </div>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-gray-50 p-4 ring-1 ring-black/5">
              <dt className="font-mono text-xs/5 font-semibold tracking-widest text-gray-500 uppercase">
                In file
              </dt>
              <dd className="mt-1 text-sm/6 text-gray-950">
                {report.inFile.offices} offices, {report.inFile.faculty} faculty
              </dd>
            </div>
            <div className="rounded-lg bg-gray-50 p-4 ring-1 ring-black/5">
              <dt className="font-mono text-xs/5 font-semibold tracking-widest text-gray-500 uppercase">
                {report.applied ? "Added" : "Will add"}
              </dt>
              <dd className="mt-1 text-sm/6 text-gray-950">
                {report.toAdd.offices} offices, {report.toAdd.faculty} faculty,{" "}
                {report.toAdd.allocations} assignments
              </dd>
            </div>
          </dl>

          {nothingToAdd && !report.applied && (
            <p className="mt-4 text-sm/6 text-gray-600">
              Everything in this file is already in the system.
            </p>
          )}

          {report.sharedOffices.length > 0 && (
            <p className="mt-4 text-sm/6 text-gray-700">
              <span className="font-medium">Shared offices:</span>{" "}
              {report.sharedOffices.join(", ")}
            </p>
          )}

          {report.warnings.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm/6 font-medium text-gray-950">
                Rows to review ({report.warnings.length})
              </h3>
              <ul className="mt-2 list-disc space-y-1 pl-6 text-sm/6 text-gray-700 marker:text-gold">
                {report.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
