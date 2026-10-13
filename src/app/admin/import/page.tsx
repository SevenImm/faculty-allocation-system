/**
 * Import Spreadsheet Page
 *
 * Lets the administrator upload the master spreadsheet
 * ("Current Faculty Office Spaces") and add any offices, faculty and
 * current assignments that are not in the system yet.
 *
 * Existing records are never duplicated or overwritten.
 */

import Link from "next/link";
import ImportForm from "./ImportForm";

export default function ImportPage() {
  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold">Import Spreadsheet</h1>

      <p className="mt-4 max-w-2xl">
        Upload the Current Faculty Office Spaces file (.xlsx). Press Preview to
        see what will be added, then Import to save it. Only records that are
        missing are added; nothing already in the system is changed.
      </p>

      <ImportForm />

      <Link href="/admin" className="mt-8 inline-block border p-2 font-semibold">
        Back to Dashboard
      </Link>
    </main>
  );
}
