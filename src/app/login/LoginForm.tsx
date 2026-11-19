"use client";

/**
 * Login form (and first-run administrator form).
 *
 * This runs in the browser only so it can show the error message returned
 * by the Server Action without a full page reload. useActionState gives us
 * the last result and a pending flag for the submit button.
 */

import { useActionState } from "react";
import { login, setupFirstAdmin, type LoginState } from "./actions";
import { Button, Field, inputClass } from "@/components/ui";

function ErrorMessage({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-lg bg-maroon-50 px-3 py-2 text-sm/5 font-medium text-maroon ring-1 ring-maroon/15"
    >
      {message}
    </p>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, undefined);

  return (
    <form action={action} className="space-y-6">
      {next && <input type="hidden" name="next" value={next} />}

      <Field label="Email" htmlFor="email">
        {/* React clears the form after a Server Action runs, so the email
            comes back from the action to save retyping it after an error. */}
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          autoFocus
          defaultValue={state?.email ?? ""}
          className={inputClass}
        />
      </Field>

      <Field label="Password" htmlFor="password">
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </Field>

      <ErrorMessage message={state?.error} />

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Logging in…" : "Log in"}
      </Button>
    </form>
  );
}

export function SetupForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    setupFirstAdmin,
    undefined
  );

  return (
    <form action={action} className="space-y-6">
      <Field label="Your name" htmlFor="name">
        <input id="name" name="name" autoComplete="name" required autoFocus className={inputClass} />
      </Field>

      <Field label="Email" htmlFor="email">
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

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Password" htmlFor="password" hint="At least 8 characters.">
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
            minLength={8}
            className={inputClass}
          />
        </Field>
      </div>

      <ErrorMessage message={state?.error} />

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Creating account…" : "Create administrator account"}
      </Button>
    </form>
  );
}
