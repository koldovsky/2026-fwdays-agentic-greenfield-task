/**
 * Pure decision logic for the mid-session 401/403 hand-off (FR-SHELL-03).
 *
 * Framework-free: no DOM, no `next/*`, no `react`. The client glue that reads
 * the current location and navigates lives in `app/(cabinet)/auth-redirect.ts`,
 * built on these helpers. A retry against an expired session cannot succeed, so
 * a cabinet fetch that 401/403s redirects to sign-in; every other status flows
 * to the in-screen `ErrorState`.
 */

/** True only for authorization failures (401/403), which trigger the hand-off. */
export function shouldRedirectToSignIn(status: number): boolean {
  return status === 401 || status === 403;
}

/** Sign-in URL carrying a `next` back to the current screen (encoded). */
export function signInRedirectPath(currentPathWithQuery: string): string {
  return "/sign-in?next=" + encodeURIComponent(currentPathWithQuery);
}
