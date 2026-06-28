"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getAuthEnv } from "@/lib/env";
import { signInInputSchema } from "@/lib/schemas/auth";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import {
  DEFAULT_ACCESS_TTL,
  DEFAULT_REFRESH_TTL,
  durationToMs,
  signAccessToken,
} from "@/lib/auth/tokens";
import { ACCESS_COOKIE, REFRESH_COOKIE, authCookieOptions } from "@/lib/auth/cookies";
import { safeNextPath } from "@/lib/auth/redirect";
import { uk } from "@/lib/i18n/uk";

export type SignInState = { error: string | null };

// Compared against when the email is unknown, so a missing user and a wrong
// password take the same time — no account enumeration via response timing.
const DUMMY_HASH = hashPassword("kolo360-timing-equaliser");

/**
 * Sign-in (FR-AUTH-02, FR-AUTH-04). Zod-parses the input, looks up the single
 * HR account in `HrUser`, verifies the password (constant-time), then issues a
 * session and sets both httpOnly cookies. Any failure returns one generic
 * message (no enumeration). Used with `useActionState`, so the first arg is the
 * previous state.
 */
export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const parsed = signInInputSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: uk.auth.invalidCredentials };
  }
  const { email, password } = parsed.data;

  let destination: string | null = null;
  try {
    const user = await db.hrUser.findUnique({ where: { email } });
    const passwordOk = verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
    if (user === null || !passwordOk) {
      return { error: uk.auth.invalidCredentials };
    }

    const env = getAuthEnv();
    const accessTtl = env.AUTH_ACCESS_TTL ?? DEFAULT_ACCESS_TTL;
    const refreshTtlMs = durationToMs(env.AUTH_REFRESH_TTL ?? DEFAULT_REFRESH_TTL);

    const { token: refreshToken } = await createSession(user.id, refreshTtlMs);
    const accessToken = await signAccessToken({ sub: user.id }, env.AUTH_JWT_SECRET, accessTtl);

    const secure = process.env.NODE_ENV === "production";
    const store = await cookies();
    store.set(ACCESS_COOKIE, accessToken, authCookieOptions(Math.floor(durationToMs(accessTtl) / 1000), secure));
    store.set(REFRESH_COOKIE, refreshToken, authCookieOptions(Math.floor(refreshTtlMs / 1000), secure));

    const nextRaw = formData.get("next");
    destination = safeNextPath(typeof nextRaw === "string" ? nextRaw : null);
  } catch {
    return { error: uk.auth.genericError };
  }

  redirect(destination);
}
