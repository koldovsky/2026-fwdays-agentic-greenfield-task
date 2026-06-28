import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getAuthEnv } from "@/lib/env";
import { verifyAccessToken } from "@/lib/auth/tokens";
import { ACCESS_COOKIE } from "@/lib/auth/cookies";

/**
 * Server-only read of the signed-in HR user for display in the cabinet shell
 * (NFR-SEC-02). Co-located with the cabinet route group (not in `lib/`, which
 * stays framework-free): it imports `next/headers` + `lib/db`, so it can only
 * run server-side and never reaches the browser bundle.
 *
 * Reads the httpOnly access cookie, verifies it, and loads the `HrUser` by `sub`
 * — selecting only id, name, and email. Returns `null` when the cookie is
 * absent or invalid; the proxy already guarantees auth on cabinet routes, so
 * this is a defensive display read, never the gate.
 *
 * Defensive by design (FR-SHELL-03): any failure — a misconfigured env or a
 * transient DB outage — degrades to "no user shown" rather than throwing a raw
 * 500, because the sidebar identity is decorative, not load-bearing.
 */
export type CurrentHrUser = {
  id: string;
  name: string;
  email: string;
};

export async function getCurrentHrUser(): Promise<CurrentHrUser | null> {
  const store = await cookies();
  const accessToken = store.get(ACCESS_COOKIE)?.value;
  if (accessToken === undefined) {
    return null;
  }

  try {
    const env = getAuthEnv();
    const payload = await verifyAccessToken(accessToken, env.AUTH_JWT_SECRET);
    if (payload === null) {
      return null;
    }

    const user = await db.hrUser.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true },
    });
    if (user === null) {
      return null;
    }

    // `name` is optional in the schema; fall back to the email for display so
    // the sidebar always has an accessible label.
    return { id: user.id, name: user.name ?? user.email, email: user.email };
  } catch {
    // Env misconfig or DB outage: degrade to no user, never surface a raw 500.
    return null;
  }
}
