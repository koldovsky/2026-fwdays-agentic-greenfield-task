// Email/password sign-up (FR-AUTH-01). Static segment wins over the
// [...nextauth] catch-all, so this coexists with the Auth.js routes. Returns
// machine-readable error codes; the sign-in feature maps them to i18n strings.
import { NextResponse } from "next/server";
import { registerWithPassword } from "@/shared/lib/auth";
import { createCredentialsRepo, createUserRepo } from "@/shared/lib/db";
import { getDb } from "@/shared/lib/db/pg";

const MIN_PASSWORD_LENGTH = 8;

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { email, password, name } = (body ?? {}) as {
    email?: unknown;
    password?: unknown;
    name?: unknown;
  };
  if (typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json({ error: "weak_password" }, { status: 400 });
  }

  // Infra failures (DB down, env unset) must not leak a raw 500 with a stack:
  // fail calm with a machine code the sign-in error-map folds to `generic`
  // (NFR-OBS-01). Details go to the server log only.
  try {
    const db = getDb();
    const result = await registerWithPassword(
      { users: createUserRepo(db), credentials: createCredentialsRepo(db) },
      { email, password, name: typeof name === "string" && name !== "" ? name : null },
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }
    return NextResponse.json({ user: result.value }, { status: 201 });
  } catch (cause) {
    console.error("[register] unexpected failure", cause);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
