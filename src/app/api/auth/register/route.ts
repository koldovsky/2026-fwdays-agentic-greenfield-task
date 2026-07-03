// Email/password sign-up (FR-AUTH-01). Static segment wins over the
// [...nextauth] catch-all, so this coexists with the Auth.js routes. Returns
// machine-readable error codes; the sign-in feature maps them to i18n strings.
import { NextResponse } from "next/server";
import { registerWithPassword } from "@/shared/lib/auth";
import { createCredentialsRepo, createUserRepo } from "@/shared/lib/db";
import { getDb } from "@/shared/lib/db/pg";
import {
  checkRateLimitInMemory,
  clientIpFrom,
  recordRateLimitHitInMemory,
} from "@/shared/lib/rate-limit";

const MIN_PASSWORD_LENGTH = 8;

/** Per-IP sign-up throttle (add-security-hardening, NFR-SEC-04): at most
 * REGISTER_MAX_PER_IP *created accounts* per IP per window. Only a successful
 * creation records a hit — failed or rejected attempts are never charged
 * (mirrors the tailor budget rule); the uniform-copy 409/500 paths stay as-is
 * so throttling adds no account-enumeration signal. */
const REGISTER_WINDOW_MS = 60 * 60 * 1000;
const REGISTER_MAX_PER_IP = 5;

export async function POST(request: Request): Promise<NextResponse> {
  // Cheapest check first, before parsing or any DB work (NFR-SEC-04). The calm
  // machine-coded 429 carries no account detail; the sign-in error map folds
  // unknown codes to its generic copy (NFR-OBS-01).
  const ipKey = `register:ip:${clientIpFrom(
    request.headers.get("x-forwarded-for"),
    request.headers.get("x-real-ip"),
  )}`;
  if (!checkRateLimitInMemory(ipKey, REGISTER_WINDOW_MS, REGISTER_MAX_PER_IP).allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

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
    // Charge the per-IP window only for an account that was actually created.
    recordRateLimitHitInMemory(ipKey, REGISTER_WINDOW_MS);
    return NextResponse.json({ user: result.value }, { status: 201 });
  } catch (cause) {
    console.error("[register] unexpected failure", cause);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
