import { NextResponse, type NextRequest } from "next/server";
import { getAuthEnv } from "@/lib/env";
import {
  DEFAULT_ACCESS_TTL,
  DEFAULT_REFRESH_TTL,
  durationToMs,
  signAccessToken,
  verifyAccessToken,
} from "@/lib/auth/tokens";
import { rotateSession } from "@/lib/auth/session";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  authCookieOptions,
  clearedCookieOptions,
} from "@/lib/auth/cookies";
import { safeNextPath } from "@/lib/auth/redirect";

/**
 * Cabinet route guard + transparent refresh (FR-AUTH-01, FR-AUTH-03). Next 16
 * renamed the `middleware` convention to `proxy`, which runs on the Node.js
 * runtime — so the shared `lib/db` Prisma client runs here directly and the
 * refresh needs no separate endpoint. The `runtime` option is unavailable in
 * proxy and must not be set.
 *
 * - Valid access token → pass through.
 * - Expired/absent access token but a live refresh token → rotate the session,
 *   set new cookies on the response, pass through (the user never sees a step).
 * - Otherwise → redirect to /sign-in?next=… and clear any stale cookies.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const env = getAuthEnv();
  const secure = process.env.NODE_ENV === "production";

  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  if (accessToken !== undefined) {
    const payload = await verifyAccessToken(accessToken, env.AUTH_JWT_SECRET);
    if (payload !== null) {
      return NextResponse.next();
    }
  }

  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (refreshToken !== undefined) {
    const accessTtl = env.AUTH_ACCESS_TTL ?? DEFAULT_ACCESS_TTL;
    const refreshTtlMs = durationToMs(env.AUTH_REFRESH_TTL ?? DEFAULT_REFRESH_TTL);
    const rotated = await rotateSession(refreshToken, refreshTtlMs);
    if (rotated !== null) {
      const newAccess = await signAccessToken({ sub: rotated.subject }, env.AUTH_JWT_SECRET, accessTtl);
      const response = NextResponse.next();
      response.cookies.set(
        ACCESS_COOKIE,
        newAccess,
        authCookieOptions(Math.floor(durationToMs(accessTtl) / 1000), secure),
      );
      response.cookies.set(
        REFRESH_COOKIE,
        rotated.token,
        authCookieOptions(Math.floor(refreshTtlMs / 1000), secure),
      );
      return response;
    }
  }

  const next = safeNextPath(request.nextUrl.pathname + request.nextUrl.search);
  const signInUrl = new URL("/sign-in", request.nextUrl);
  signInUrl.searchParams.set("next", next);
  const response = NextResponse.redirect(signInUrl);
  response.cookies.set(ACCESS_COOKIE, "", clearedCookieOptions(secure));
  response.cookies.set(REFRESH_COOKIE, "", clearedCookieOptions(secure));
  return response;
}

export const config = {
  // Guard every route except sign-in, the auth API, respondent links, and
  // Next's static assets. Exclusions are anchored to a segment boundary
  // (`($|/)`) so a future route like /sign-instead or /respondent stays
  // guarded rather than being silently un-guarded by a prefix match.
  matcher: [
    "/((?!sign-in(?:$|/)|api/auth(?:$|/)|respond(?:$|/)|_next/static|_next/image|favicon.ico).*)",
  ],
};
