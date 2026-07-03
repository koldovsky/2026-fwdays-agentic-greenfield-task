// Client call to POST /api/auth/register (FR-AUTH-01). Returns null on
// success, a normalized error code otherwise.
import { toAuthErrorCode, type AuthErrorCode } from "../lib/errors";

export interface RegisterInput {
  readonly email: string;
  readonly password: string;
  readonly name?: string;
}

export async function registerAccount(input: RegisterInput): Promise<AuthErrorCode | null> {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (response.ok) return null;
  const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
  return toAuthErrorCode(body?.error);
}
