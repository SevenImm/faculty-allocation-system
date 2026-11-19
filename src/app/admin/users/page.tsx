/**
 * User Accounts (admin only)
 *
 * Lists every login account with its role and, for faculty accounts, the
 * faculty record it is linked to. Administrators can add accounts and
 * delete them (but not their own, so nobody locks themselves out).
 */

import { db } from "@/prisma/db";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { logChange } from "@/lib/history";
import { formatDateTime } from "@/lib/dates";
import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";
import { Badge, ButtonLink, Card, EmptyState, SectionHeading } from "@/components/ui";
import { PageShell } from "@/components/layout";

export default async function UsersPage() {
  const me = await requireAdmin();

  const users = await db.orm.public.User.orderBy((u) => u.name.asc()).all();
  const faculty = await db.orm.public.Faculty.all();

  async function deleteUser(formData: FormData) {
    "use server";
    const admin = await requireAdmin();

    const userId = Number(formData.get("userId"));
    if (userId === admin.id) redirect("/admin/users");

    const user = await db.orm.public.User.where({ id: userId }).first();
    if (user) {
      await db.orm.public.User.where({ id: userId }).delete();
      await logChange({
        action: "Deleted user account",
        entity: "User",
        entityId: userId,
        details: `${user.name} (${user.email}, ${user.role.toLowerCase()})`,
      });
    }

    redirect("/admin/users");
  }

  const rows = users.map((user) => ({
    user,
    faculty: user.facultyId ? faculty.find((f) => f.id === user.facultyId) : undefined,
  }));

  return (
    <PageShell
      eyebrow="Admin · Users"
      title="User Accounts"
      description="Who can sign in, and what they can do."
      actions={<ButtonLink href="/admin/users/add">+ Add User</ButtonLink>}
    >
      <SectionHeading
        title="Accounts"
        description={`${users.length} account${users.length === 1 ? "" : "s"}. Administrators manage everything; faculty accounts only see their own office.`}
      />

      {rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No accounts yet." />
        </div>
      ) : (
        <Card className="mt-6 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm/6">
              <thead className="bg-gray-50 font-mono text-xs/5 font-semibold tracking-widest text-gray-500 uppercase">
                <tr>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Linked faculty record</th>
                  <th className="px-6 py-3">Created</th>
                  <th className="px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {rows.map(({ user, faculty: member }) => (
                  <tr key={user.id} className="align-top hover:bg-gray-50/60">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-950">
                        {user.name}
                        {user.id === me.id && (
                          <span className="ml-2 text-xs/5 font-normal text-gray-500">(you)</span>
                        )}
                      </p>
                      <p className="text-gray-500">{user.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <Badge tone={user.role === "ADMIN" ? "maroon" : "gold"}>
                        {user.role === "ADMIN" ? "Admin" : "Faculty"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {member ? (
                        `${member.firstName} ${member.lastName}`
                      ) : user.role === "FACULTY" ? (
                        <span className="text-gray-400">Not linked</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                      {formatDateTime(user.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      {user.id !== me.id && (
                        <form action={deleteUser} className="flex justify-end">
                          <input type="hidden" name="userId" value={user.id} />
                          <ConfirmDeleteButton
                            name={`the account for ${user.name}`}
                            label="Delete"
                            warning="They will no longer be able to sign in."
                          />
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
