/**
 * Change History Page  (/admin/history)
 *
 * Lists every change recorded in the ChangeLog table, newest first:
 * edits, deletes, status changes, assignments and imports.
 */

import { Badge, ButtonLink, Card, EmptyState, PageShell } from "@/components/ui";
import { db } from "@/prisma/db";

export default async function HistoryPage() {
  const entries = await db.orm.public.ChangeLog
    .orderBy((c) => c.id.desc())
    .limit(500)
    .all();

  // "2026-10-27T11:05:12.000" -> "2026-10-27 11:05"
  const when = (value: unknown) => String(value).replace("T", " ").slice(0, 16);

  return (
    <PageShell
      eyebrow="Admin"
      title="Change History"
      description={`Newest first. Showing the last ${entries.length} changes.`}
      actions={
        <ButtonLink href="/admin" variant="secondary">
          Back to Dashboard
        </ButtonLink>
      }
    >
      {entries.length === 0 ? (
        <EmptyState title="No changes have been recorded yet." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm/6">
              <thead className="bg-gray-50 font-mono text-xs/5 font-semibold tracking-widest text-gray-500 uppercase">
                <tr>
                  <th className="px-6 py-3">When</th>
                  <th className="px-6 py-3">Action</th>
                  <th className="px-6 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {entries.map((entry) => (
                  <tr key={entry.id} className="align-top hover:bg-gray-50/60">
                    <td className="px-6 py-4 font-mono text-xs/6 whitespace-nowrap text-gray-500">
                      {when(entry.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge tone={entry.action.startsWith("Deleted") ? "maroon" : "gold"}>
                        {entry.action}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{entry.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </PageShell>
  );
}
