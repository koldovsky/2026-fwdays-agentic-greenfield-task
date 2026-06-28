/**
 * Cookie names and options for the auth tokens (FR-AUTH-04). Framework-free:
 * returns plain option objects that both `next/headers` `cookies()` and a
 * `NextResponse`'s `cookies` accept, so the same definition is reused on
 * sign-in, sign-out, and transparent refresh — no copy-paste.
 *
 * Both tokens are `httpOnly` (never readable by client JS), `SameSite=Lax`,
 * `Secure` in production, and `Path=/` so the proxy receives them on every
 * cabinet route and can refresh in place.
 */
export const ACCESS_COOKIE = "access_token";
export const REFRESH_COOKIE = "refresh_token";

type AuthCookieOptions = {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: "/";
  maxAge: number;
};

export function authCookieOptions(maxAgeSeconds: number, secure: boolean): AuthCookieOptions {
  return { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: maxAgeSeconds };
}

/** Options that immediately expire a cookie (sign-out / failed refresh). */
export function clearedCookieOptions(secure: boolean): AuthCookieOptions {
  return authCookieOptions(0, secure);
}
