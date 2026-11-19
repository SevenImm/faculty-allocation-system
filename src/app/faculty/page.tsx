/**
 * Faculty Portal
 *
 * Shows the signed-in faculty member their own details and current office.
 * The faculty record is found through the account's facultyId link; if an
 * administrator did not set one, we fall back to matching the login email
 * against Faculty.email.
 *
 * Administrators can open this page too, but have no faculty record of
 * their own, so they see a pointer back to the admin dashboard.
 */

import type { Metadata } from "next";
import { db } from "@/prisma/db";
import { requireUser } from "@/lib/auth/dal";
import { RANK_LABELS, TENURE_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/dates";
import { Badge, ButtonLink, Card, EmptyState, formatEnum, StatCard } from "@/components/ui";
import { PageShell } from "@/components/layout";

export const metadata: Metadata = { title: "Faculty Portal" };

export default async function FacultyPage() {
  const user = await requireUser();

  const member =
    (user.facultyId
      ? await db.orm.public.Faculty.where({ id: user.facultyId }).first()
      : null) ??
    (await db.orm.public.Faculty.where({ email: user.email }).first());

  if (!member) {
    return (
      <PageShell
        eyebrow="Faculty"
        title={`Welcome, ${user.name}`}
        description="Your office details appear here once your account is linked to a faculty record."
      >
        <EmptyState
          title={
            user.role === "ADMIN"
              ? "Administrator accounts are not linked to a faculty record."
              : "Your account is not linked to a faculty record yet."
          }
          description={
            user.role === "ADMIN"
              ? "Faculty members see their own office on this page."
              : "Please ask an administrator to link your account."
          }
          action={
            user.role === "ADMIN" ? (
              <ButtonLink href="/admin">Go to the admin dashboard</ButtonLink>
            ) : undefined
          }
        />
      </PageShell>
    );
  }

  const department = await db.orm.public.Department.where({ id: member.departmentId }).first();

  // The current assignment is the allocation that has not ended.
  const current = await db.orm.public.Allocation.where({ facultyId: member.id, endedAt: null }).first();
  const office = current
    ? await db.orm.public.Office.where({ id: current.officeId }).first()
    : null;

  const history = await db.orm.public.Allocation.where({ facultyId: member.id })
    .orderBy((a) => a.assignedAt.desc())
    .all();
  const offices = history.length ? await db.orm.public.Office.all() : [];

  return (
    <PageShell
      eyebrow="Faculty"
      title={`${member.firstName} ${member.lastName}`}
      description={department ? department.name : "Your office assignment."}
    >
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Current office"
          value={office ? `${office.building} ${office.roomNumber}` : "None"}
          hint={
            office
              ? `Floor ${office.floor} · ${formatEnum(office.spaceType)} · ${office.hasWindow ? "Window" : "No window"}`
              : "No office is assigned to you right now."
          }
        />
        <StatCard
          label="Rank"
          value={RANK_LABELS[member.facultyRank] ?? formatEnum(member.facultyRank)}
        />
        <StatCard
          label="Tenure status"
          value={TENURE_LABELS[member.tenureStatus] ?? formatEnum(member.tenureStatus)}
        />
      </div>

      {current && office && (
        <Card className="mt-8 p-7">
          <h2 className="text-lg/7 font-medium text-gray-950">Office details</h2>
          <dl className="mt-4 grid gap-4 text-sm/6 sm:grid-cols-2">
            <div>
              <dt className="text-gray-500">Building</dt>
              <dd className="font-medium text-gray-950">{office.building}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Room</dt>
              <dd className="font-medium text-gray-950">{office.roomNumber}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Assigned since</dt>
              <dd className="font-medium text-gray-950">{formatDate(current.assignedAt)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Status</dt>
              <dd>
                <Badge tone="green">{formatEnum(office.status)}</Badge>
              </dd>
            </div>
            {office.notes && (
              <div className="sm:col-span-2">
                <dt className="text-gray-500">Notes</dt>
                <dd className="text-gray-950">{office.notes}</dd>
              </div>
            )}
          </dl>
        </Card>
      )}

      <div className="mt-12">
        <h2 className="text-2xl font-medium tracking-tight text-gray-950">Assignment history</h2>
        {history.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="No office assignments on record." />
          </div>
        ) : (
          <Card className="mt-4 overflow-hidden">
            <table className="min-w-full text-left text-sm/6">
              <thead className="bg-gray-50 font-mono text-xs/5 font-semibold tracking-widest text-gray-500 uppercase">
                <tr>
                  <th className="px-6 py-3">Office</th>
                  <th className="px-6 py-3">From</th>
                  <th className="px-6 py-3">To</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {history.map((allocation) => {
                  const o = offices.find((x) => x.id === allocation.officeId);
                  return (
                    <tr key={allocation.id}>
                      <td className="px-6 py-4 font-medium text-gray-950">
                        {o ? `${o.building} ${o.roomNumber}` : "Unknown office"}
                      </td>
                      <td className="px-6 py-4 text-gray-700">{formatDate(allocation.assignedAt)}</td>
                      <td className="px-6 py-4 text-gray-700">
                        {allocation.endedAt ? (
                          formatDate(allocation.endedAt)
                        ) : (
                          <Badge tone="green">Current</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </PageShell>
  );
}
