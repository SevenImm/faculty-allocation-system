/**
 * Account activation  (/activate)
 *
 * Public page where a faculty member uses the one-time code from the COAS
 * office to create their own login account. ?code=K7MQ-4XTP pre-fills it.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { homeFor } from "@/lib/auth/session-token";
import { FormCard } from "@/components/ui";
import { PageShell } from "@/components/layout";
import { ActivateForm } from "./ActivateForm";

export const metadata: Metadata = { title: "Activate your account" };

export default async function ActivatePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));

  const { code } = await searchParams;

  return (
    <PageShell
      eyebrow="Faculty"
      title="Activate your account"
      description="Use the activation code from the COAS office to create your Faculty Portal account."
    >
      <FormCard title="Create your account">
        <ActivateForm initialCode={typeof code === "string" ? code : undefined} />
        <p className="mt-6 text-center text-sm/6 text-gray-600">
          Already activated?{" "}
          <Link href="/login" className="font-medium text-maroon hover:underline">
            Log in
          </Link>
        </p>
      </FormCard>
    </PageShell>
  );
}
