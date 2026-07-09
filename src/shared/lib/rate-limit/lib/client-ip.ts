// Client-IP key derivation for rate limiting (NFR-SEC-04). Pure string work
// (TC-PURE-01): callers pass raw header values, no Request/Headers globals.
// x-forwarded-for is client-influenceable without a trusted proxy config —
// acceptable for a soft deterrent (design.md "IP header spoofing" risk); the
// durable per-account usage counter is the real budget control.

/**
 * First hop of an `x-forwarded-for` list, else the `x-real-ip` value, else
 * `"unknown"` (direct connections with no proxy headers share one bucket).
 */
export function clientIpFrom(forwardedFor: string | null, realIp: string | null): string {
  const firstHop = forwardedFor?.split(",")[0]?.trim() ?? "";
  if (firstHop !== "") return firstHop;
  const real = realIp?.trim() ?? "";
  return real !== "" ? real : "unknown";
}
