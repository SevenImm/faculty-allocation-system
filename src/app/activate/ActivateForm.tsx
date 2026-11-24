"use client";

import { useActionState } from "react";
import { activateAccount, type ActivateState } from "./actions";
import { Button, Field, inputClass } from "@/components/ui";

export function ActivateForm({ initialCode }: { initialCode?: string }) {
  const [state, action, pending] = useActionState<ActivateState, FormData>(
    activateAccount,
    undefined
  );

  return (
    <form action={action} className="space-y-6">
      <Field label="Activation code" htmlFor="code" hint="The code the COAS office gave you, e.g. K7MQ-4XTP.">
        <input
          id="code"
          name="code"
          required
          autoFocus
          autoComplete="one-time-code"
          autoCapitalize="characters"
          spellCheck={false}
          defaultValue={state?.code ?? initialCode ?? ""}
          className={`${inputClass} font-mono tracking-widest uppercase`}
        />
      </Field>

      <Field label="Email" htmlFor="email" hint="You will use this email to log in.">
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state?.email ?? ""}
          className={inputClass}
        />
      </Field>

      <Field label="Choose a password" htmlFor="password" hint="At least 8 characters.">
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={inputClass}
        />
      </Field>

      <Field label="Confirm password" htmlFor="confirm">
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          className={inputClass}
        />
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
        {pending ? "Activating…" : "Activate my account"}
      </Button>
    </form>
  );
}
