/**
 * Change History Page  (/admin/history)
 *
 * Lists every change recorded in the ChangeLog table, newest first:
 * edits, deletes, status changes, assignments and imports.
 */

import Link from "next/link";
import { db } from "@/prisma/db";

export default async function HistoryPage() {
  const entries = await db.orm.public.ChangeLog
    .orderBy((c) => c.id.desc())
    .limit(500)
    .all();

  // "2026-10-27T11:05:12.000" -> "2026-10-27 11:05"
  const when = (value: unknown) => String(value).replace("T", " ").slice(0, 16);

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold">Change History</h1>

      <p className="mt-2">Newest first. Showing the last {entries.length} changes.</p>

      {entries.length === 0 ? (
        <p className="mt-4">No changes have been recorded yet.</p>
      ) : (
        <table className="mt-6 w-full border-collapse">
          <thead>
            <tr className="border-b text-left">
              <th className="p-2">When</th>
              <th className="p-2">Action</th>
              <th className="p-2">Details</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b align-top">
                <td className="whitespace-nowrap p-2">{when(entry.createdAt)}</td>
                <td className="whitespace-nowrap p-2">{entry.action}</td>
                <td className="p-2">{entry.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Link href="/admin" className="mt-8 inline-block border p-2 font-semibold">
        Back to Dashboard
      </Link>
    </main>
  );
}
