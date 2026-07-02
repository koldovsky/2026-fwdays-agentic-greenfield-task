"use client";

// Email + password sign-in / sign-up form (FR-AUTH-01). Credentials sign-in
// goes through Auth.js (next-auth/react); sign-up first registers via
// /api/auth/register, then signs in with the same credentials. Failure copy is
// uniform — it never reveals whether an email is registered. Google OAuth
// (FR-AUTH-02) is added here once client credentials exist.
import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { t, type Locale } from "@/shared/lib/i18n";
import { Button } from "@/shared/ui";
import { registerAccount } from "../api/register";
import { authErrorMessage, type AuthErrorCode } from "../lib/errors";

type Mode = "sign-in" | "sign-up";

export interface SignInFormProps {
  /** UI locale; Ukrainian-first (NFR-I18N-01). */
  readonly locale?: Locale;
  /** Where to navigate after successful authentication. */
  readonly redirectTo?: string;
}

const fieldClass =
  "w-full rounded-sm border border-hairline bg-white px-3 py-2 text-base text-ink " +
  "placeholder:text-ink-faint focus:outline-2 focus:outline-offset-1 focus:outline-brand";

const labelClass = "block text-sm font-semibold text-ink";

export function SignInForm({ locale = "uk", redirectTo = "/tailor" }: SignInFormProps) {
  const copy = t(locale);
  const [mode, setMode] = useState<Mode>("sign-in");
  const [error, setError] = useState<AuthErrorCode | null>(null);
  const [pending, setPending] = useState(false);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "").trim();

    setPending(true);
    setError(null);
    try {
      if (mode === "sign-up") {
        const registerError = await registerAccount(
          name === "" ? { email, password } : { email, password, name },
        );
        if (registerError !== null) {
          setError(registerError);
          return;
        }
      }
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        // Sign-up path: the account was just created, so a failed follow-up
        // sign-in must not strand the user in sign-up mode (retrying there
        // would hit email_taken). Land them on sign-in with the uniform error.
        setMode("sign-in");
        setError("invalid_credentials");
        return;
      }
      // Full navigation so server components re-read the session cookie.
      window.location.assign(redirectTo);
    } catch {
      setError("generic");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h1 className="font-display text-2xl tracking-tight text-ink">
        {mode === "sign-in" ? copy.auth.signInTitle : copy.auth.signUpTitle}
      </h1>

      {mode === "sign-up" && (
        <label className={labelClass}>
          {copy.auth.nameLabel}
          <input name="name" type="text" autoComplete="name" className={`mt-1 ${fieldClass}`} />
        </label>
      )}

      <label className={labelClass}>
        {copy.auth.emailLabel}
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className={`mt-1 ${fieldClass}`}
        />
      </label>

      <label className={labelClass}>
        {copy.auth.passwordLabel}
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
          className={`mt-1 ${fieldClass}`}
        />
      </label>

      {error !== null && (
        <p role="alert" className="text-sm text-gap">
          {authErrorMessage(copy, error)}
        </p>
      )}

      <Button type="submit" size="md" disabled={pending}>
        {mode === "sign-in" ? copy.auth.signInAction : copy.auth.signUpAction}
      </Button>

      <p className="text-sm text-ink-soft">
        {mode === "sign-in" ? copy.auth.noAccountPrompt : copy.auth.haveAccountPrompt}{" "}
        <button
          type="button"
          className="cursor-pointer font-semibold text-brand"
          onClick={() => switchMode(mode === "sign-in" ? "sign-up" : "sign-in")}
        >
          {mode === "sign-in" ? copy.auth.signUpAction : copy.auth.signInAction}
        </button>
      </p>
    </form>
  );
}
