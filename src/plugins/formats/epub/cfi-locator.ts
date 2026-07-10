// CFI ↔ Locator adapter (ADR-003). foliate speaks EPUB CFI + DOM `Range`; the sync engine stores the
// platform-neutral core/model `Locator`. This adapter converts between them and round-trips stably:
// `cfi → Locator → cfi` is identity, and a `Range → Locator → Range` resolves to the same selection.
//
// Boundary rules this file upholds:
//  - It models the position with the `@readium/shared` Locator vocabulary INTERNALLY (where a CFI lives
//    in `locations.fragments`), then emits a PLAIN, serializable core/model Locator (CFI in
//    `locations.cfi`) — no `@readium/shared` class instance ever leaks into core/model.
//  - The foliate CFI engine (epubcfi.js) is reached ONLY via dynamic `import()`, so the heavy engine
//    stays code-split; the pure string round-trip needs no engine and stays synchronous.

import { Locator as RWLocator, LocatorLocations as RWLocations } from '@readium/shared'
import { MEDIA_TYPE_EPUB, type Locator, type LocatorLocations } from '@/core/model'

/** Positional extras a caller may attach when building a Locator from a CFI. */
export interface CfiLocatorExtras {
  title?: string
  progression?: number
  totalProgression?: number
  position?: number
}

const EPUBCFI = /^epubcfi\(/

/** Project the internal `@readium/shared` Locator down to a plain core/model Locator literal. */
function readiumToCore(rw: RWLocator): Locator {
  const fragments = rw.locations.fragments ?? []
  const cfi = fragments.find((fragment) => EPUBCFI.test(fragment)) ?? fragments[0]

  const locations: LocatorLocations = {}
  if (cfi) locations.cfi = cfi
  if (rw.locations.progression !== undefined) locations.progression = rw.locations.progression
  if (rw.locations.totalProgression !== undefined)
    locations.totalProgression = rw.locations.totalProgression
  if (rw.locations.position !== undefined) locations.position = rw.locations.position

  const locator: Locator = { href: rw.href, type: rw.type }
  if (rw.title) locator.title = rw.title
  if (Object.keys(locations).length) locator.locations = locations
  return locator
}

/**
 * Build a plain core/model `Locator` from an EPUB CFI. The CFI is carried both in the internal
 * Readium `fragments` and, on output, in the neutral `locations.cfi`. `type` is the publication media
 * type (`application/epub+zip`) since a CFI is a publication-level coordinate.
 */
export function cfiToLocator(cfi: string, href: string, extras: CfiLocatorExtras = {}): Locator {
  const rw = new RWLocator({
    href,
    type: MEDIA_TYPE_EPUB,
    title: extras.title,
    locations: new RWLocations({
      fragments: [cfi],
      progression: extras.progression,
      totalProgression: extras.totalProgression,
      position: extras.position,
    }),
  })
  return readiumToCore(rw)
}

/** Read the EPUB CFI back out of a Locator (the inverse of {@link cfiToLocator}). */
export function locatorToCfi(locator: Locator): string | undefined {
  return locator.locations?.cfi
}

/**
 * Build a Locator from a DOM `Range` (a text selection within a content document). Optionally prefix
 * the in-document CFI with the spine-item CFI (`spineCfi`) via the `!` indirection step so the result
 * addresses a position in the whole publication. Lazy-imports foliate's CFI engine.
 */
export async function domRangeToLocator(
  range: Range,
  href: string,
  options: { spineCfi?: string; extras?: CfiLocatorExtras } = {},
): Promise<Locator> {
  const CFI = await import('foliate-js/epubcfi.js')
  const inDocumentCfi = CFI.fromRange(range)
  const cfi = options.spineCfi ? CFI.joinIndir(options.spineCfi, inDocumentCfi) : inDocumentCfi
  return cfiToLocator(cfi, href, options.extras)
}

/**
 * Resolve a Locator's CFI back to a DOM `Range` within the given content `doc`. Expects an
 * in-document CFI (no spine prefix); full publication CFIs are resolved by the Navigator through
 * foliate's own `book.resolveCFI`. Lazy-imports foliate's CFI engine. Returns `undefined` when the
 * Locator carries no CFI.
 */
export async function locatorToDomRange(
  locator: Locator,
  doc: Document,
): Promise<Range | undefined> {
  const cfi = locatorToCfi(locator)
  if (!cfi) return undefined
  const CFI = await import('foliate-js/epubcfi.js')
  return CFI.toRange(doc, CFI.parse(cfi))
}
