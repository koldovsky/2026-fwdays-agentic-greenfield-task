// ADR-005: the service worker must NEVER intercept book-byte range reads — Workbox/Cache Storage
// cannot correctly cache a `206 Partial Content` response. Book bytes come either from OPFS
// (File.slice — no fetch at all) or from a remote server (a `Range` request, cross-origin), so we
// deny those here and let them go straight to network/storage, untouched by the SW.
//
// Pure + side-effect-free so it is unit-testable without a ServiceWorker environment. The caller
// passes the worker's own origin (`self.location.origin`) for the cross-origin check.
export function shouldBypassSW(request: Request, scopeOrigin: string): boolean {
  // The shell is served only via same-origin GETs; everything else bypasses.
  if (request.method !== 'GET') return true

  // Any byte-range read (a 206) is book bytes — never route it through the SW.
  if (request.headers.has('range')) return true

  let origin: string
  try {
    origin = new URL(request.url).origin
  } catch {
    // Unparseable URL — don't risk intercepting it.
    return true
  }
  return origin !== scopeOrigin
}
