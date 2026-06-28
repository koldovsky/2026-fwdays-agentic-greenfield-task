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
 * Rewrite the access/refresh token values inside the ORIGINAL `cookie` header
 * in place, leaving every other cookie's original encoded value byte-for-byte
 * untouched. Returns the rewritten header, or null when there was none. Each
 * `name=value` segment is replaced wholesale only when its name matches an auth
 * cookie; unmatched segments are passed through verbatim (no re-encoding).
 */
function forwardCookieHeader(
  original: string | null,
  newAccess: string,
  newRefresh: string,
): string | null {
  if (original === null) {
    return null;
  }
  let sawAccess = false;
  const rewritten = original
    .split(";")
    .map((segment) => {
      const name = segment.slice(0, segment.indexOf("=")).trim();
      const lead = segment.slice(0, segment.length - segment.trimStart().length);
      if (name === ACCESS_COOKIE) {
        sawAccess = true;
        return `${lead}${ACCESS_COOKIE}=${newAccess}`;
      }
      if (name === REFRESH_COOKIE) {
        return `${lead}${REFRESH_COOKIE}=${newRefresh}`;
      }
      return segment;
    })
    .join(";");
  // Refresh succeeded but no access cookie was present (expired and dropped):
  // append the fresh one so the downstream render sees a valid token.
  return sawAccess ? rewritten : `${rewritten}; ${ACCESS_COOKIE}=${newAccess}`;
}

/**
 * Cabinet route guard + transparent refresh (FR-AUTH-01, FR-AUTH-03). Next 16
 * renamed the `middleware` convention to `proxy`, which runs on the Node.js
 * runtime — so the shared `lib/db` Prisma client runs here directly and the
 * refresh needs no separate endpoint. The `runtime` option is unavailable in
 * proxy and must not be set.
 *
 * - Valid access token → pass through.
 * - Expired/absent access token but a live refresh token → rotate the session,
 *   forward the rotated tokens on the same-request headers so the downstream
 *   render sees the fresh session immediately, set new cookies on the response,
 *   and pass through (the user never sees a step).
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

      // Forward the rotated tokens to the SAME-request downstream render. Without
      // this, the Server Component layout reads the still-stale `Cookie` header
      // and `getCurrentHrUser` finds no valid access token for one render after a
      // silent refresh (the sidebar would show no user). We take the ORIGINAL
      // incoming `cookie` header and replace ONLY the two auth-token values in
      // place — every other cookie's original encoded value is left byte-for-byte
      // untouched — then still set the response cookies so the browser persists
      // them. The token values are url-safe base64 (no `;`/`=`), so injecting
      // them raw is safe.
      const forwardedHeaders = new Headers(request.headers);
      const forwardedCookie = forwardCookieHeader(
        request.headers.get("cookie"),
        newAccess,
        rotated.token,
      );
      if (forwardedCookie !== null) {
        forwardedHeaders.set("cookie", forwardedCookie);
      }

      const response = NextResponse.next({ request: { headers: forwardedHeaders } });
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
