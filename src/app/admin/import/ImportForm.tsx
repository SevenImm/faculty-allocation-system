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
    <div className="mt-6 max-w-2xl">
      <form ref={formRef} onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-4">
        <input
          type="file"
          name="file"
          accept=".xlsx"
          className="border p-2"
          onChange={() => setResult(null)}
        />

        <div className="flex gap-4">
          <button
            type="button"
            disabled={busy}
            onClick={() => handle(previewImport)}
            className="border p-2 font-semibold"
          >
            {busy ? "Working..." : "Preview"}
          </button>

          {report && !report.applied && !nothingToAdd && (
            <button
              type="button"
              disabled={busy}
              onClick={() => handle(applyImport)}
              className="border p-2 font-semibold"
            >
              Import
            </button>
          )}
        </div>
      </form>

      {result && !result.ok && (
        <p className="mt-6 border p-4 text-red-600">{result.error}</p>
      )}

      {report && (
        <div className="mt-6 border p-4">
          <h2 className="text-xl font-semibold">
            {report.applied ? "Import complete" : "Preview (nothing saved yet)"}
          </h2>

          <p className="mt-2">
            In file: {report.inFile.offices} offices, {report.inFile.faculty} faculty
          </p>
          <p>
            {report.applied ? "Added" : "Will add"}: {report.toAdd.offices} offices,{" "}
            {report.toAdd.faculty} faculty, {report.toAdd.allocations} assignments
          </p>
          {nothingToAdd && !report.applied && (
            <p className="mt-2">Everything in this file is already in the system.</p>
          )}

          {report.sharedOffices.length > 0 && (
            <p className="mt-2">Shared offices: {report.sharedOffices.join(", ")}</p>
          )}

          {report.warnings.length > 0 && (
            <>
              <h3 className="mt-4 font-semibold">
                Rows to review ({report.warnings.length})
              </h3>
              <ul className="mt-2 list-disc pl-6">
                {report.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
