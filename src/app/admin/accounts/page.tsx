/**
 * Faculty Accounts  (/admin/accounts)
 *
 * One row per faculty member showing whether they can use the Faculty
 * Portal yet:
 *   Active       - they activated (or were given) a login account
 *   Code issued  - they have an activation code but have not used it
 *   Code expired - their code ran out; generate a new one
 *   No account   - nothing yet
 *
 * Instead of creating every account by hand, the administrator generates
 * activation codes (one at a time or for everyone at once) and hands them
 * out. Faculty then create their own account at /activate.
 */

import { redirect } from "next/navigation";
import { db } from "@/prisma/db";
import { requireAdmin } from "@/lib/auth/dal";
import { logChange } from "@/lib/history";
import { formatDate } from "@/lib/dates";
import { CODE_VALID_DAYS, formatCode, isExpired, issueCode } from "@/lib/activation";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  inputClass,
  selectClass,
  StatCard,
} from "@/components/ui";
import { PageShell } from "@/components/layout";

type Status = "active" | "code" | "expired" | "none";

const STATUS_LABEL: Record<Status, string> = {
  active: "Active",
  code: "Code issued",
  expired: "Code expired",
  none: "No account",
};

const STATUS_TONE = {
  active: "green",
  code: "gold",
  expired: "maroon",
  none: "gray",
} as const;

async function generateOne(formData: FormData) {
  "use server";
  await requireAdmin();

  const facultyId = Number(formData.get("facultyId"));
  const member = await db.orm.public.Faculty.where({ id: facultyId }).first();
  if (!member) redirect("/admin/accounts");
  if (await db.orm.public.User.where({ facultyId }).first()) redirect("/admin/accounts");

  await issueCode(facultyId);
  await logChange({
    action: "Generated activation code",
    entity: "User",
    entityId: null,
    details: `${member.firstName} ${member.lastName}`,
  });

  // "issued" changes the URL, so the page reloads with the new code (and highlights the row).
  const back = String(formData.get("back") ?? "");
  redirect(`/admin/accounts?${back ? `${back}&` : ""}issued=${facultyId}#faculty-${facultyId}`);
}

async function generateMissing() {
  "use server";
  await requireAdmin();

  const faculty = await db.orm.public.Faculty.all();
  const users = await db.orm.public.User.all();
  const codes = await db.orm.public.ActivationCode.all();

  let count = 0;
  for (const member of faculty) {
    if (users.some((u) => u.facultyId === member.id)) continue;
    const existing = codes.find((c) => c.facultyId === member.id);
    if (existing && !isExpired(existing.expiresAt)) continue;
    await issueCode(member.id);
    count++;
  }

  if (count > 0) {
    await logChange({
      action: "Generated activation codes",
      entity: "User",
      entityId: null,
      details: `${count} faculty member${count === 1 ? "" : "s"} without an account`,
    });
  }

  redirect(`/admin/accounts?generated=${count}`);
}

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    department?: string;
    generated?: string;
    issued?: string;
  }>;
}) {
  await requireAdmin();
  const filters = await searchParams;
  const q = (filters.q ?? "").trim().toLowerCase();

  const faculty = await db.orm.public.Faculty.orderBy((f) => f.lastName.asc()).all();
  const users = await db.orm.public.User.all();
  const codes = await db.orm.public.ActivationCode.all();
  const departments = await db.orm.public.Department.all();

  const rows = faculty.map((member) => {
    const user = users.find((u) => u.facultyId === member.id);
    const code = codes.find((c) => c.facultyId === member.id);
    const status: Status = user
      ? "active"
      : code
        ? isExpired(code.expiresAt)
          ? "expired"
          : "code"
        : "none";
    return {
      member,
      user,
      code,
      status,
      department: departments.find((d) => d.id === member.departmentId)?.name,
    };
  });

  const count = (status: Status) => rows.filter((row) => row.status === status).length;
  const waiting = count("none") + count("expired");

  const visible = rows.filter((row) => {
    if (q && !`${row.member.firstName} ${row.member.lastName} ${row.user?.email ?? ""}`.toLowerCase().includes(q)) {
      return false;
    }
    if (filters.status && row.status !== filters.status) return false;
    if (filters.department && row.member.departmentId !== Number(filters.department)) return false;
    return true;
  });

  // Keep the current filters when a single code is generated.
  const back = new URLSearchParams(
    Object.entries({ q: filters.q, status: filters.status, department: filters.department }).filter(
      (entry): entry is [string, string] => Boolean(entry[1])
    )
  ).toString();

  return (
    <PageShell
      eyebrow="Admin · Accounts"
      title="Faculty Accounts"
      description="See who can use the Faculty Portal, and hand out activation codes so faculty create their own accounts."
      actions={
        <>
          <ButtonLink href="/admin/users" variant="secondary">
            All user accounts
          </ButtonLink>
          <ButtonLink href="/admin/users/add" variant="secondary">
            + Add user by hand
          </ButtonLink>
        </>
      }
    >
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active accounts" value={count("active")} hint={`of ${rows.length} faculty`} />
        <StatCard label="Codes issued" value={count("code")} hint="Waiting to be used" />
        <StatCard label="Codes expired" value={count("expired")} hint={`Codes last ${CODE_VALID_DAYS} days`} />
        <StatCard label="No account" value={count("none")} />
      </div>

      <Card className="mt-8 flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-base/7 font-medium text-gray-950">How faculty get access</h2>
          <p className="text-sm/6 text-gray-600">
            Give each faculty member their code. They open <span className="font-mono text-gray-950">/activate</span>{" "}
            (also linked from the login page), enter the code, their email and a password they choose.
            Each code works once and expires after {CODE_VALID_DAYS} days.
          </p>
        </div>
        <form action={generateMissing}>
          <Button type="submit" disabled={waiting === 0}>
            Generate codes for {waiting} without access
          </Button>
        </form>
      </Card>

      {filters.generated !== undefined && (
        <p className="mt-6 rounded-lg bg-emerald-50 px-4 py-3 text-sm/6 text-emerald-700 ring-1 ring-emerald-600/20">
          {Number(filters.generated) === 0
            ? "Everyone already has an account or a valid code."
            : `Generated ${filters.generated} new activation code${filters.generated === "1" ? "" : "s"}.`}
        </p>
      )}

      <form method="get" className="mt-8 flex flex-wrap gap-3">
        <input
          name="q"
          defaultValue={filters.q ?? ""}
          placeholder="Search name or email"
          className={`${inputClass} w-full sm:w-64`}
        />
        <select name="status" defaultValue={filters.status ?? ""} className={`${selectClass} w-full sm:w-48`}>
          <option value="">Any status</option>
          {(Object.keys(STATUS_LABEL) as Status[]).map((status) => (
            <option key={status} value={status}>
              {STATUS_LABEL[status]}
            </option>
          ))}
        </select>
        <select
          name="department"
          defaultValue={filters.department ?? ""}
          className={`${selectClass} w-full sm:w-72`}
        >
          <option value="">All departments</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline">
          Search
        </Button>
        <ButtonLink href="/admin/accounts" variant="outline">
          Clear
        </ButtonLink>
      </form>
      <p className="mt-3 text-sm/6 text-gray-600">
        Showing {visible.length} of {rows.length} faculty members
      </p>

      {visible.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="No faculty members match your search." />
        </div>
      ) : (
        <Card className="mt-4 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm/6">
              <thead className="bg-gray-50 font-mono text-xs/5 font-semibold tracking-widest text-gray-500 uppercase">
                <tr>
                  <th className="px-6 py-3">Faculty member</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Login / code</th>
                  <th className="px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {visible.map(({ member, user, code, status, department }) => (
                  <tr
                    key={member.id}
                    id={`faculty-${member.id}`}
                    className={`scroll-mt-8 align-top hover:bg-gray-50/60 ${
                      Number(filters.issued) === member.id ? "bg-gold-100/60" : ""
                    }`}
                  >
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-950">
                        {member.firstName} {member.lastName}
                      </p>
                      <p className="text-gray-500">{department ?? "—"}</p>
                    </td>
                    <td className="px-6 py-4">
                      <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      {user ? (
                        <>
                          <p className="text-gray-950">{user.email}</p>
                          <p className="text-xs/5 text-gray-500">Since {formatDate(user.createdAt)}</p>
                        </>
                      ) : code ? (
                        <>
                          <p
                            className={`font-mono text-base tracking-widest select-all ${
                              status === "expired" ? "text-gray-400 line-through" : "text-gray-950"
                            }`}
                          >
                            {formatCode(code.code)}
                          </p>
                          <p className="text-xs/5 text-gray-500">
                            {status === "expired" ? "Expired" : "Expires"} {formatDate(code.expiresAt)}
                          </p>
                        </>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {!user && (
                        <form action={generateOne} className="flex justify-end">
                          <input type="hidden" name="facultyId" value={member.id} />
                          <input type="hidden" name="back" value={back} />
                          <Button type="submit" variant="outline">
                            {code ? "New code" : "Generate code"}
                          </Button>
                        </form>
                      )}
                    </td>
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
