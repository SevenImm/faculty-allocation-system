"use client";

import { useActionState } from "react";
import { changePassword, type PasswordState } from "./actions";
import { Button, Field, inputClass } from "@/components/ui";

export function PasswordForm() {
  const [state, action, pending] = useActionState<PasswordState, FormData>(
    changePassword,
    undefined
  );

  if (state?.done) {
    return (
      <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm/6 text-emerald-700 ring-1 ring-emerald-600/20">
        Your password was changed. Use the new one next time you log in.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-6">
      <Field label="Current password" htmlFor="current">
        <input id="current" name="current" type="password" autoComplete="current-password" required className={inputClass} />
      </Field>
      <Field label="New password" htmlFor="password" hint="At least 8 characters.">
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} className={inputClass} />
      </Field>
      <Field label="Confirm new password" htmlFor="confirm">
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" required className={inputClass} />
      </Field>

      {state?.error && (
        <p
          role="alert"
          className="rounded-lg bg-maroon-50 px-3 py-2 text-sm/5 font-medium text-maroon ring-1 ring-maroon/15"
        >
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Saving…" : "Change password"}
      </Button>
    </form>
  );
}
