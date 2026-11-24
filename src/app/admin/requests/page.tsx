/**
 * Faculty Requests  (/admin/requests)
 *
 * Corrections and office problems that faculty members reported from the
 * Faculty Portal. Open requests come first. An administrator can mark a
 * request resolved, optionally with a short note that the faculty member
 * will see, or reopen it.
 *
 * A request never changes data by itself: the administrator makes the
 * actual fix through the normal admin pages (e.g. Edit Faculty).
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { Temporal } from "temporal-polyfill";
import { db } from "@/prisma/db";
import { requireAdmin } from "@/lib/auth/dal";
import { logChange } from "@/lib/history";
import { formatDateTime } from "@/lib/dates";
import { REQUEST_TYPE_LABELS } from "@/lib/facultyPortal";
import { Badge, Button, Card, EmptyState, SectionHeading, inputClass } from "@/components/ui";
import { PageShell } from "@/components/layout";

async function resolveRequest(formData: FormData) {
  "use server";
  await requireAdmin();

  const id = Number(formData.get("requestId"));
  const note = String(formData.get("adminNote") ?? "").trim().slice(0, 500);
  const request = await db.orm.public.FacultyRequest.where({ id }).first();
  if (!request) redirect("/admin/requests");

  await db.orm.public.FacultyRequest.where({ id }).update({
    status: "RESOLVED",
    adminNote: note || null,
    resolvedAt: Temporal.Now.plainDateTimeISO(),
    seenByFaculty: false, // the faculty member gets a notice next time they open the portal
  });
  await logChange({
    action: "Resolved faculty request",
    entity: "Request",
    entityId: id,
    details: `${REQUEST_TYPE_LABELS[request.type]} (${request.topic})${note ? `: ${note}` : ""}`,
  });

  redirect("/admin/requests");
}

async function reopenRequest(formData: FormData) {
  "use server";
  await requireAdmin();

  const id = Number(formData.get("requestId"));
  const request = await db.orm.public.FacultyRequest.where({ id }).first();
  if (!request) redirect("/admin/requests");

  await db.orm.public.FacultyRequest.where({ id }).update({ status: "OPEN", resolvedAt: null, seenByFaculty: true });
  await logChange({
    action: "Reopened faculty request",
    entity: "Request",
    entityId: id,
    details: `${REQUEST_TYPE_LABELS[request.type]} (${request.topic})`,
  });

  redirect("/admin/requests");
}

export default async function RequestsPage() {
  await requireAdmin();

  const requests = await db.orm.public.FacultyRequest.orderBy((r) => r.id.desc()).all();
  const faculty = await db.orm.public.Faculty.all();
  const nameOf = (id: number) => {
    const member = faculty.find((f) => f.id === id);
    return member ? `${member.firstName} ${member.lastName}` : "Deleted faculty member";
  };

  const open = requests.filter((r) => r.status === "OPEN");
  const resolved = requests.filter((r) => r.status === "RESOLVED");

  const list = (items: typeof requests) => (
    <Card className="mt-6 overflow-hidden">
      <ul className="divide-y divide-black/5">
        {items.map((request) => (
          <li key={request.id} className="flex flex-col gap-4 p-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 lg:max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/admin/faculty/${request.facultyId}/edit`}
                  className="font-medium text-gray-950 hover:text-maroon"
                >
                  {nameOf(request.facultyId)}
                </Link>
                <Badge tone={request.type === "CORRECTION" ? "maroon" : "gold"}>
                  {REQUEST_TYPE_LABELS[request.type]}
                </Badge>
                <span className="text-sm/6 text-gray-500">{request.topic}</span>
              </div>
              <p className="mt-2 text-sm/6 break-words text-gray-700">{request.message}</p>
              {request.adminNote && (
                <p className="mt-2 text-sm/6 text-gray-600">
                  <span className="font-medium text-gray-950">Note: </span>
                  {request.adminNote}
                </p>
              )}
              <p className="mt-2 text-xs/5 text-gray-500">
                Sent {formatDateTime(request.createdAt)}
                {request.resolvedAt && ` · Resolved ${formatDateTime(request.resolvedAt)}`}
              </p>
            </div>

            {request.status === "OPEN" ? (
              <form action={resolveRequest} className="flex w-full flex-col gap-2 lg:w-80">
                <input type="hidden" name="requestId" value={request.id} />
                <input
                  name="adminNote"
                  maxLength={500}
                  placeholder="Note for the faculty member (optional)"
                  className={inputClass}
                />
                <Button type="submit" className="self-start">
                  Mark resolved
                </Button>
              </form>
            ) : (
              <form action={reopenRequest}>
                <input type="hidden" name="requestId" value={request.id} />
                <Button type="submit" variant="outline">
                  Reopen
                </Button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );

  return (
    <PageShell
      eyebrow="Admin · Requests"
      title="Faculty Requests"
      description="Corrections and office problems reported from the Faculty Portal."
    >
      <SectionHeading
        title="Open"
        description={`${open.length} request${open.length === 1 ? "" : "s"} waiting for review.`}
      />
      {open.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No open requests." description="New reports from faculty appear here." />
        </div>
      ) : (
        list(open)
      )}

      {resolved.length > 0 && (
        <div className="mt-14">
          <SectionHeading title="Resolved" />
          {list(resolved)}
        </div>
      )}
    </PageShell>
  );
}
