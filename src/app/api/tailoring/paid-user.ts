// Shared session gate for the tailoring-history routes (FR-HISTORY-01/02,
// FR-TAILOR-04). Not a route file (Next only treats `route.ts` as an endpoint),
// so it is safe to co-locate here.
//
// History read is OPEN TO ALL LOGGED-IN USERS (persist-tailoring-lifecycle): the
// free-tier cap and the upgrade paywall live at run START and at export, not at
// history access. An anonymous caller gets 401; owner-scoping (IDOR, NFR-SEC-02)
// is enforced downstream in the read service (cross-user reads return 404). An
// unreadable session degrades to the stricter outcome (unauthorized), never a
// raw 500 (NFR-OBS-01).
import { currentUserId } from "@/app/auth";

export type AuthedUserResult =
  | { readonly ok: true; readonly userId: string }
  | { readonly ok: false; readonly status: 401 };

/**
 * Resolve the signed-in caller for a history route. Any authenticated user is
 * admitted; only an anonymous / unreadable session is rejected (401).
 */
export async function resolveAuthedUser(): Promise<AuthedUserResult> {
  let userId: string | null = null;
  try {
    userId = await currentUserId();
  } catch {
    userId = null;
  }
  if (userId === null) return { ok: false, status: 401 };
  return { ok: true, userId };
}

/** The calm coded JSON body for an unauthenticated history request. */
export function authGateError(): { error: string } {
  return { error: "unauthorized" };
}
