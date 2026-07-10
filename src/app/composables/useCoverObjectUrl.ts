import { onScopeDispose, ref, watch, type Ref } from 'vue'
import type { Connector } from '@/core/contracts'
import type { BookRef } from '@/core/model'

/**
 * Resolve a book cover to a displayable image `src`, keeping auth-protected covers off the bare-`<img>`
 * network path.
 *
 * Komga (and any HTTP-Basic source) serves covers behind auth, so a bare cross-origin
 * `<img src="…/thumbnail">` 401s and trips the browser's NATIVE credential dialog — a popup on every
 * book open. When the active connector exposes authed {@link Connector.coverBytes}, we fetch the bytes
 * through it (the connector owns the Authorization header) and hand the `<img>` a same-origin `blob:`
 * URL we create and revoke. Otherwise we fall back to the connector-supplied `coverHref` (public
 * covers) — or `undefined`, which renders the colour placeholder.
 *
 * The object URL is revoked on teardown and whenever the inputs change, so blobs never leak; an
 * in-flight fetch that is superseded (or that fails) resolves to the fallback without clobbering a
 * newer run's result.
 *
 * Inputs are getters (not refs) so callers pass `() => store.connector` etc. without unwrapping the
 * markRaw/shallowRef connector — reading a method off it never makes the connector reactive.
 */
export function useCoverObjectUrl(
  connector: () => Connector | null | undefined,
  bookRef: () => BookRef | undefined,
  coverHref: () => string | undefined,
): { src: Ref<string | undefined> } {
  const src = ref<string | undefined>(undefined)
  let objectUrl: string | undefined
  let seq = 0

  function revoke(): void {
    if (objectUrl !== undefined) {
      URL.revokeObjectURL(objectUrl)
      objectUrl = undefined
    }
  }

  watch(
    [connector, bookRef, coverHref],
    async ([activeConnector, book, href]) => {
      const mine = ++seq
      revoke()
      src.value = undefined
      if (book === undefined) return

      // Authed source → fetch the cover through the connector and show a blob URL the host owns. If the
      // authed fetch FAILS, keep the colour placeholder (src stays undefined) — NEVER fall back to `href`:
      // for an authed source `coverHref` is the same credential-protected URL, so a bare <img> there would
      // re-trip the native Basic-auth popup this composable exists to prevent.
      if (activeConnector?.coverBytes !== undefined) {
        try {
          const bytes = await activeConnector.coverBytes(book)
          if (mine !== seq) return // a newer run superseded this one; drop the stale bytes
          // Copy into a fresh ArrayBuffer-backed view: coverBytes' Uint8Array may be a slice of a larger
          // buffer (or SharedArrayBuffer-backed), neither of which the Blob ctor's BlobPart type accepts.
          objectUrl = URL.createObjectURL(new Blob([new Uint8Array(bytes)]))
          src.value = objectUrl
        } catch {
          // Authed fetch failed → keep the placeholder (src is already undefined). Deliberately NOT `href`.
        }
        return
      }
      // No authed cover path (public connector): the href is directly loadable; absent ⇒ placeholder.
      src.value = href
    },
    { immediate: true },
  )

  onScopeDispose(revoke)

  return { src }
}
