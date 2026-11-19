/**
 * Login page.
 *
 * - Already signed in? Go straight to that user's home page.
 * - No accounts in the database yet? Show the first-run form that creates
 *   the initial administrator.
 * - Otherwise show the normal email + password form.
 *
 * ?next=/some/path is added by proxy.ts when a visitor is sent here from
 * a protected page, so they return there after logging in.
 */

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/prisma/db";
import { getCurrentUser } from "@/lib/auth/dal";
import { homeFor } from "@/lib/auth/session-token";
import { FormCard } from "@/components/ui";
import { PageShell } from "@/components/layout";
import { LoginForm, SetupForm } from "./LoginForm";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));

  const { next } = await searchParams;
  const firstRun = (await db.orm.public.User.first()) === null;

  if (firstRun) {
    return (
      <PageShell
        eyebrow="Welcome"
        title="Set up the first administrator"
        description="No accounts exist yet. Create the first administrator account to start using the system. Administrators can add more users later."
      >
        <FormCard title="Administrator account">
          <SetupForm />
        </FormCard>
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow="Account"
      title="Log in"
      description="Sign in with the email and password an administrator gave you."
    >
      <FormCard
        title="Your credentials"
        description="Administrators manage the whole system; faculty members see their own office."
      >
        <LoginForm next={next} />
      </FormCard>
    </PageShell>
  );
}
