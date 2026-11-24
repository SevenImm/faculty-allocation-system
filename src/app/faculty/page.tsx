/**
 * Faculty Portal
 *
 * Shows the signed-in faculty member ONLY their own information:
 * - current office, rank and tenure
 * - who they share their office with (if it is shared)
 * - where their office is (floor plan, once the images are added)
 * - upcoming office changes (once allocation proposals exist)
 * - a form to report a correction or an office problem, and their past reports
 * - who to contact about their office
 * - their assignment history
 *
 * On purpose, faculty never see vacant offices, other people's offices or
 * rankings: the client asked for this to avoid conflicts and self-allocation.
 *
 * The faculty record is found through the account's facultyId link; if an
 * administrator did not set one, we fall back to matching the login email.
 * Administrators can open this page too, but have no faculty record of
 * their own, so they see a pointer back to the admin dashboard.
 */

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/prisma/db";
import { requireUser } from "@/lib/auth/dal";
import { RANK_LABELS, TENURE_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/dates";
import { logChange } from "@/lib/history";
import { findFloorPlan } from "@/lib/floorPlans";
import { getUpcomingMove } from "@/lib/upcomingMove";
import { OFFICE_CONTACT } from "@/lib/officeContact";
import { buildingName } from "@/lib/buildings";
import {
  findFacultyForUser,
  MAX_MESSAGE_LENGTH,
  REQUEST_TOPICS,
  REQUEST_TYPE_LABELS,
} from "@/lib/facultyPortal";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  Field,
  formatEnum,
  inputClass,
  selectClass,
  StatCard,
} from "@/components/ui";
import { PageShell } from "@/components/layout";

export const metadata: Metadata = { title: "Faculty Portal" };

/* ------------------------------------------------------------------ */
/* Server Action: report a correction or an office problem             */
/* ------------------------------------------------------------------ */

async function submitRequest(formData: FormData) {
  "use server";

  const user = await requireUser();
  const member = await findFacultyForUser(user);
  if (!member) redirect("/faculty");

  // The select sends "CORRECTION|Rank" or "OFFICE_ISSUE|Keys or access".
  const [type, topic] = String(formData.get("topic") ?? "").split("|");
  const message = String(formData.get("message") ?? "").trim();

  const validTopics: readonly string[] =
    REQUEST_TOPICS[type as keyof typeof REQUEST_TOPICS] ?? [];
  if (!validTopics.includes(topic)) redirect("/faculty?error=topic#report");
  if (!message) redirect("/faculty?error=empty#report");
  if (message.length > MAX_MESSAGE_LENGTH) redirect("/faculty?error=long#report");

  const request = await db.orm.public.FacultyRequest.create({
    type: type as "CORRECTION" | "OFFICE_ISSUE",
    topic,
    message,
    facultyId: member.id,
  });

  await logChange({
    action: "Faculty request submitted",
    entity: "Request",
    entityId: request.id,
    details: `${member.firstName} ${member.lastName}: ${REQUEST_TYPE_LABELS[type]} (${topic})`,
  });

  redirect("/faculty?sent=1#report");
}

const ERRORS: Record<string, string> = {
  topic: "Please choose what your report is about.",
  empty: "Please describe the problem before sending.",
  long: `Please keep your message under ${MAX_MESSAGE_LENGTH} characters.`,
};

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default async function FacultyPage({ searchParams }: PageProps<"/faculty">) {
  const user = await requireUser();
  const params = await searchParams;
  const member = await findFacultyForUser(user);

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

  // Officemates: other people with an active assignment to the SAME office.
  const officemates = office
    ? await Promise.all(
        (await db.orm.public.Allocation.where({ officeId: office.id, endedAt: null }).all())
          .filter((allocation) => allocation.facultyId !== member.id)
          .map(async (allocation) => {
            const mate = await db.orm.public.Faculty.where({ id: allocation.facultyId }).first();
            const mateDepartment = mate
              ? await db.orm.public.Department.where({ id: mate.departmentId }).first()
              : null;
            return mate
              ? { id: mate.id, name: `${mate.firstName} ${mate.lastName}`, department: mateDepartment?.name }
              : null;
          })
      ).then((list) => list.filter((mate) => mate !== null))
    : [];

  const floorPlan = office ? findFloorPlan(office.building, office.floor) : null;
  const upcomingMove = await getUpcomingMove(member.id);

  const history = await db.orm.public.Allocation.where({ facultyId: member.id })
    .orderBy((a) => a.assignedAt.desc())
    .all();
  const offices = history.length ? await db.orm.public.Office.all() : [];

  const requests = await db.orm.public.FacultyRequest.where({ facultyId: member.id })
    .orderBy((r) => r.id.desc())
    .all();

  // Answers the member has not seen yet: show them once, then mark them seen.
  const newAnswers = requests.filter((r) => r.status === "RESOLVED" && !r.seenByFaculty);
  if (newAnswers.length > 0) {
    await db.orm.public.FacultyRequest.where({ facultyId: member.id, seenByFaculty: false }).updateAndCount({
      seenByFaculty: true,
    });
  }

  const fullBuildingName = office ? buildingName(office.building) : null;
  const errorMessage = params.error ? ERRORS[String(params.error)] : undefined;
  const contactLines = [
    OFFICE_CONTACT.email && { label: "Email", value: OFFICE_CONTACT.email },
    OFFICE_CONTACT.phone && { label: "Phone", value: OFFICE_CONTACT.phone },
    OFFICE_CONTACT.location && { label: "Location", value: OFFICE_CONTACT.location },
  ].filter((line): line is { label: string; value: string } => Boolean(line));

  return (
    <PageShell
      eyebrow="Faculty"
      title={`${member.firstName} ${member.lastName}`}
      description={department ? department.name : "Your office assignment."}
      actions={
        <ButtonLink href="#report" variant="secondary">
          Report a correction or problem
        </ButtonLink>
      }
    >
      {/* ---------------- Notices ---------------- */}
      {params.welcome && (
        <p className="mb-8 rounded-xl bg-emerald-50 px-5 py-4 text-sm/6 text-emerald-700 ring-1 ring-emerald-600/20">
          Welcome! Your account is ready. You can change your password anytime from{" "}
          <a href="/account/password" className="font-medium underline">Password</a> at the top of the page.
        </p>
      )}
      {newAnswers.length > 0 && (
        <Card className="mb-8 border-l-4 border-gold p-6">
          <h2 className="text-base/7 font-medium text-gray-950">
            The COAS office answered {newAnswers.length === 1 ? "your report" : `${newAnswers.length} of your reports`}
          </h2>
          <ul className="mt-2 space-y-2">
            {newAnswers.map((answer) => (
              <li key={answer.id} className="text-sm/6 text-gray-700">
                <span className="font-medium text-gray-950">
                  {REQUEST_TYPE_LABELS[answer.type]} · {answer.topic}:
                </span>{" "}
                {answer.adminNote ?? "Marked as resolved."}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* ---------------- Summary ---------------- */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Current office"
          value={office ? `${office.building} ${office.roomNumber}` : "None"}
          hint={
            office
              ? `${fullBuildingName ? `${fullBuildingName} · ` : ""}Floor ${office.floor} · ${formatEnum(office.spaceType)} · ${office.hasWindow ? "Window" : "No window"}`
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

      {/* ---------------- Upcoming move ---------------- */}
      <Card className="mt-8 flex flex-col gap-1 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base/7 font-medium text-gray-950">Upcoming office changes</h2>
          {upcomingMove ? (
            <p className="text-sm/6 text-gray-700">
              You are moving to{" "}
              <span className="font-medium text-gray-950">
                {upcomingMove.building} {upcomingMove.roomNumber}
              </span>{" "}
              on {formatDate(upcomingMove.effectiveDate)}.
            </p>
          ) : (
            <p className="text-sm/6 text-gray-600">
              No upcoming office changes. You will see a move here once it has been approved.
            </p>
          )}
        </div>
        <div className="mt-2 self-start sm:mt-0 sm:self-auto">
          <Badge tone={upcomingMove ? "gold" : "gray"}>
            {upcomingMove ? "Approved move" : "Nothing scheduled"}
          </Badge>
        </div>
      </Card>

      {/* ---------------- Office details + officemates | Find my office ---------------- */}
      {current && office && (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Card className="p-7">
            <h2 className="text-lg/7 font-medium text-gray-950">Office details</h2>
            <dl className="mt-4 grid gap-4 text-sm/6 sm:grid-cols-2">
              <div>
                <dt className="text-gray-500">Building</dt>
                <dd className="font-medium text-gray-950">{office.building}</dd>
                {fullBuildingName && <dd className="text-gray-600">{fullBuildingName}</dd>}
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
                <dt className="text-gray-500">Shared office</dt>
                <dd className="font-medium text-gray-950">
                  {office.capacity > 1 ? `Yes, up to ${office.capacity} people` : "No"}
                </dd>
              </div>
              {office.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-gray-500">Notes</dt>
                  <dd className="text-gray-950">{office.notes}</dd>
                </div>
              )}
            </dl>

            <div className="mt-6 border-t border-black/5 pt-5">
              <h3 className="text-sm/6 font-medium text-gray-950">Officemates</h3>
              {officemates.length === 0 ? (
                <p className="mt-1 text-sm/6 text-gray-600">
                  {office.capacity > 1
                    ? "Nobody else is assigned to this office right now."
                    : "You have this office to yourself."}
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {officemates.map((mate) => (
                    <li key={mate.id} className="flex items-center gap-3 text-sm/6">
                      <span className="flex size-8 items-center justify-center rounded-full bg-gold-100 text-xs font-semibold text-gold-700 ring-1 ring-gold-600/25">
                        {mate.name
                          .split(" ")
                          .map((part) => part[0])
                          .slice(0, 2)
                          .join("")}
                      </span>
                      <span>
                        <span className="font-medium text-gray-950">{mate.name}</span>
                        {mate.department && (
                          <span className="block text-xs/5 text-gray-500">{mate.department}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          <Card className="flex flex-col p-7">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-lg/7 font-medium text-gray-950">Find my office</h2>
              <span className="text-sm/6 text-gray-500">
                {office.building} · Floor {office.floor}
              </span>
            </div>
            {floorPlan ? (
              <figure className="mt-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={floorPlan}
                  alt={`Floor plan of ${office.building}, floor ${office.floor}`}
                  className="w-full rounded-lg ring-1 ring-black/10"
                />
                <figcaption className="mt-2 text-sm/6 text-gray-600">
                  Your office is <span className="font-medium text-gray-950">{office.building} {office.roomNumber}</span>.
                </figcaption>
              </figure>
            ) : (
              <div className="mt-4 flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-black/15 bg-gray-50 px-6 py-10 text-center">
                <p className="text-3xl font-medium tracking-tight text-maroon">
                  {office.building} {office.roomNumber}
                </p>
                {fullBuildingName && <p className="mt-1 text-sm/6 text-gray-700">{fullBuildingName}</p>}
                <p className="mt-1 text-sm/6 text-gray-600">Floor {office.floor}</p>
                <p className="mt-4 text-xs/5 text-gray-500">The floor plan for this building is not available yet.</p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ---------------- Report a correction or problem ---------------- */}
      <div id="report" className="mt-12 grid scroll-mt-8 gap-6 lg:grid-cols-5">
        <Card className="p-7 lg:col-span-3">
          <h2 className="text-lg/7 font-medium text-gray-950">Report a correction or problem</h2>
          <p className="mt-1 text-sm/6 text-gray-600">
            Is something on this page wrong, or is there a problem with your office? Let the COAS
            office know. They will review it and update your information.
          </p>

          {params.sent && (
            <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm/6 text-emerald-700 ring-1 ring-emerald-600/20">
              Thank you. Your report was sent to the COAS office.
            </p>
          )}
          {errorMessage && (
            <p className="mt-4 rounded-lg bg-maroon-50 px-4 py-3 text-sm/6 text-maroon ring-1 ring-maroon/15">
              {errorMessage}
            </p>
          )}

          <form action={submitRequest} className="mt-6 space-y-5">
            <Field label="What is it about?" htmlFor="topic">
              <select id="topic" name="topic" required defaultValue="" className={selectClass}>
                <option value="" disabled>
                  Choose one…
                </option>
                <optgroup label="Something in my information is wrong">
                  {REQUEST_TOPICS.CORRECTION.map((topic) => (
                    <option key={topic} value={`CORRECTION|${topic}`}>
                      {topic}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="A problem with my office">
                  {REQUEST_TOPICS.OFFICE_ISSUE.map((topic) => (
                    <option key={topic} value={`OFFICE_ISSUE|${topic}`}>
                      {topic}
                    </option>
                  ))}
                </optgroup>
              </select>
            </Field>

            <Field
              label="Details"
              htmlFor="message"
              hint={`For a correction, include the right value. Up to ${MAX_MESSAGE_LENGTH} characters.`}
            >
              <textarea
                id="message"
                name="message"
                rows={4}
                required
                maxLength={MAX_MESSAGE_LENGTH}
                placeholder="e.g. My rank should be Associate Professor since Fall 2026."
                className={inputClass}
              />
            </Field>

            <Button type="submit">Send report</Button>
          </form>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card className="p-7">
            <h2 className="text-lg/7 font-medium text-gray-950">Your reports</h2>
            {requests.length === 0 ? (
              <p className="mt-2 text-sm/6 text-gray-600">You have not sent any reports.</p>
            ) : (
              <ul className="mt-4 divide-y divide-black/5">
                {requests.map((request) => (
                  <li key={request.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm/6 font-medium text-gray-950">
                        {REQUEST_TYPE_LABELS[request.type]} · {request.topic}
                      </p>
                      <Badge tone={request.status === "RESOLVED" ? "green" : "gold"}>
                        {request.status === "RESOLVED" ? "Resolved" : "Open"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm/6 text-gray-600">{request.message}</p>
                    {request.adminNote && (
                      <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-sm/6 text-gray-700 ring-1 ring-black/5">
                        <span className="font-medium text-gray-950">COAS office: </span>
                        {request.adminNote}
                      </p>
                    )}
                    <p className="mt-1 text-xs/5 text-gray-500">Sent {formatDate(request.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-7">
            <h2 className="text-lg/7 font-medium text-gray-950">Need help with your office?</h2>
            <p className="mt-1 text-sm/6 text-gray-600">
              For keys, furniture or anything urgent, contact:
            </p>
            <p className="mt-4 text-sm/6 font-medium text-gray-950">{OFFICE_CONTACT.name}</p>
            <p className="text-sm/6 text-gray-500">{OFFICE_CONTACT.role}</p>
            {contactLines.length > 0 ? (
              <dl className="mt-3 space-y-1 text-sm/6">
                {contactLines.map((line) => (
                  <div key={line.label} className="flex gap-2">
                    <dt className="text-gray-500">{line.label}:</dt>
                    <dd className="text-gray-950 select-all">{line.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-3 text-xs/5 text-gray-500">Contact details will be added soon.</p>
            )}
          </Card>
        </div>
      </div>

      {/* ---------------- Assignment history ---------------- */}
      <div className="mt-12">
        <h2 className="text-2xl font-medium tracking-tight text-gray-950">Assignment history</h2>
        {history.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="No office assignments on record." />
          </div>
        ) : (
          <Card className="mt-4 overflow-hidden">
            <div className="overflow-x-auto">
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
            </div>
          </Card>
        )}
      </div>
    </PageShell>
  );
}
