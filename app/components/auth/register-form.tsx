"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, Card, Input } from "@notely-design/components";
import { register } from "@/app/actions/auth";

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(register, undefined);

  return (
    <Card padding={24}>
      <h1 className="t-h2 mb-1" style={{ color: "var(--color-text)" }}>
        Create your account
      </h1>
      <p
        className="mb-6 text-sm"
        style={{ color: "var(--color-text-secondary)" }}
      >
        Start taking notes in a calm, focused space.
      </p>

      <form action={formAction} className="flex flex-col gap-4" noValidate>
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          error={state?.errors?.email?.[0]}
        />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          helperText="At least 8 characters, with a letter and a number."
          error={state?.errors?.password?.[0]}
        />
        {state?.message && (
          <p className="text-sm" style={{ color: "var(--color-danger)" }}>
            {state.message}
          </p>
        )}
        <Button type="submit" fullWidth loading={pending}>
          Create account
        </Button>
      </form>

      <p
        className="mt-6 text-center text-sm"
        style={{ color: "var(--color-text-secondary)" }}
      >
        Already have an account?{" "}
        <Link href="/login" style={{ color: "var(--color-primary)" }}>
          Log in
        </Link>
      </p>
    </Card>
  );
}
