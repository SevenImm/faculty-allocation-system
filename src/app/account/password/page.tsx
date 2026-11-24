/** Change password  (/account/password) - any signed-in user. */

import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/dal";
import { FormCard } from "@/components/ui";
import { PageShell } from "@/components/layout";
import { PasswordForm } from "./PasswordForm";

export const metadata: Metadata = { title: "Change password" };

export default async function ChangePasswordPage() {
  const user = await requireUser();

  return (
    <PageShell eyebrow="Account" title="Change password" description={`Signed in as ${user.email}.`}>
      <FormCard title="New password">
        <PasswordForm />
      </FormCard>
    </PageShell>
  );
}
