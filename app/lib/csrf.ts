import "server-only";

import { headers } from "next/headers";

/**
 * Explicit same-origin check for state-changing Server Actions. Throws if the
 * request's Origin header doesn't match the Host header it arrived on.
 */
export async function assertSameOrigin() {
  const headersList = await headers();
  const origin = headersList.get("origin");
  const host = headersList.get("host");

  if (!origin || !host) {
    throw new Error("Missing origin or host header.");
  }

  if (new URL(origin).host !== host) {
    throw new Error("Cross-origin request blocked.");
  }
}
