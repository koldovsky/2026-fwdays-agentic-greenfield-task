"use client";

import { shouldRedirectToSignIn, signInRedirectPath } from "@/lib/http/auth-redirect";

/**
 * Client DOM glue for the mid-session 401/403 hand-off (FR-SHELL-03). The pure
 * decision lives in `lib/http/auth-redirect.ts`; this thin layer reads
 * `window.location` and navigates, so the DOM stays out of the framework-free
 * `lib/`. The next slice (cycles/employees data fetching) wires `fetchOrRedirect`
 * into its loaders.
 */

/** Thrown after the redirect has been initiated, so callers stop processing. */
export class AuthRedirectError extends Error {
  constructor() {
    super("Redirecting to sign-in after an authorization failure");
    this.name = "AuthRedirectError";
  }
}

function redirectToSignIn(): never {
  const current = window.location.pathname + window.location.search;
  window.location.assign(signInRedirectPath(current));
  throw new AuthRedirectError();
}

/**
 * `fetch` that hands a 401/403 off to the auth flow. On 401/403 it redirects to
 * sign-in and throws `AuthRedirectError` (the redirect supersedes any handling).
 * Otherwise it returns the `Response` unchanged — including non-OK non-auth
 * responses — so the caller can branch into its `ErrorState`.
 */
export async function fetchOrRedirect(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(input, init);
  if (shouldRedirectToSignIn(response.status)) {
    redirectToSignIn();
  }
  return response;
}
