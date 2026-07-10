// The declared-network origin allowlist, shared by every credentialed egress in `platform/web`. Extracted
// into this LEAF module (imports only `@/core/contracts`) so BOTH the HostBridge HTTP client
// (`PermissionEnforcingHttpClient`, in `./index`) and the streamed offline-download path
// (`./connector-download`) enforce the SAME check without importing the `platform/web` barrel — which would
// form an import cycle. Pure policy: no DOM, no `fetch`.

import type { PluginPermissions } from '@/core/contracts'

/**
 * Is `url`'s origin permitted by a plugin's declared `network` allowlist?
 * - `undefined` (no declaration) denies everything.
 * - `'*'` (or `'*'` inside the array) allows any origin.
 * - otherwise the URL's origin must equal a declared entry's origin (an entry may be a full URL or a bare
 *   origin string). A non-parseable `url` denies (fail closed).
 */
export function originAllowed(url: string, allowed: PluginPermissions['network']): boolean {
  if (allowed === undefined) return false
  if (allowed === '*') return true
  let origin: string
  try {
    origin = new URL(url).origin
  } catch {
    return false
  }
  return allowed.some((entry) => {
    if (entry === '*') return true
    try {
      return new URL(entry).origin === origin
    } catch {
      return entry === origin
    }
  })
}
