"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, Card, Input } from "@notely-design/components";
import { login } from "@/app/actions/auth";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <Card padding={24}>
      <h1 className="t-h2 mb-1" style={{ color: "var(--color-text)" }}>
        Welcome back
      </h1>
      <p
        className="mb-6 text-sm"
        style={{ color: "var(--color-text-secondary)" }}
      >
        Log in to get back to your notes.
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
          autoComplete="current-password"
          required
          error={state?.errors?.password?.[0]}
        />
        {state?.message && (
          <p className="text-sm" style={{ color: "var(--color-danger)" }}>
            {state.message}
          </p>
        )}
        <Button type="submit" fullWidth loading={pending}>
          Log in
        </Button>
      </form>

      <p
        className="mt-6 text-center text-sm"
        style={{ color: "var(--color-text-secondary)" }}
      >
        New to Notely?{" "}
        <Link href="/register" style={{ color: "var(--color-primary)" }}>
          Create an account
        </Link>
      </p>
    </Card>
  );
}
