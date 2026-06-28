"use client";

import { useActionState } from "react";
import { signIn, type SignInState } from "./actions";
import { uk } from "@/lib/i18n/uk";

const INITIAL: SignInState = { error: null };

const fieldClass =
  "w-full rounded-[var(--radius-md)] border border-line-strong bg-paper px-[var(--space-7)] py-[var(--space-6)] text-ink " +
  "outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]";

export function SignInForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signIn, INITIAL);
  const t = uk.auth;

  return (
    <form action={formAction} className="flex flex-col gap-[var(--space-8)]">
      <input type="hidden" name="next" value={next} />

      <div className="flex flex-col gap-[var(--space-4)]">
        <label htmlFor="email" className="text-ink-muted">
          {t.emailLabel}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className={fieldClass}
        />
      </div>

      <div className="flex flex-col gap-[var(--space-4)]">
        <label htmlFor="password" className="text-ink-muted">
          {t.passwordLabel}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={fieldClass}
        />
      </div>

      {state.error !== null ? (
        <p
          role="alert"
          aria-live="polite"
          className="rounded-[var(--radius-md)] bg-[var(--danger-fill)] px-[var(--space-7)] py-[var(--space-6)] text-[var(--danger-ink)]"
        >
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className={
          "rounded-[var(--radius-md)] bg-accent px-[var(--space-7)] py-[var(--space-6)] text-surface " +
          "outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 " +
          "disabled:opacity-60"
        }
      >
        {pending ? t.submitting : t.submit}
      </button>
    </form>
  );
}
