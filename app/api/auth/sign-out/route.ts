import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { revokeSession } from "@/lib/auth/session";
import { ACCESS_COOKIE, REFRESH_COOKIE, clearedCookieOptions } from "@/lib/auth/cookies";

/**
 * Sign-out (FR-AUTH-05): revoke the current refresh session server-side so it
 * can never mint another access token, then clear both cookies and return to
 * sign-in. Cookies are cleared on the returned response so the Set-Cookie
 * headers travel with the redirect.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const store = await cookies();
  const refreshToken = store.get(REFRESH_COOKIE)?.value;
  if (refreshToken !== undefined) {
    await revokeSession(refreshToken);
  }

  const secure = process.env.NODE_ENV === "production";
  const response = NextResponse.redirect(new URL("/sign-in", request.url), { status: 303 });
  response.cookies.set(ACCESS_COOKIE, "", clearedCookieOptions(secure));
  response.cookies.set(REFRESH_COOKIE, "", clearedCookieOptions(secure));
  return response;
}
