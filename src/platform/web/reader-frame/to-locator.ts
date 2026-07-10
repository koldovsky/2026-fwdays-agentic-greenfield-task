// foliate `FoliateLocation` -> neutral `core/model` Locator, run INSIDE the reader frame (ADR-013).
// foliate speaks spine-index + CFI + total-progression; the bridge carries the plain, serializable
// `Locator` this produces. Moved verbatim from the old in-app navigator (the mapping is unchanged — only
// WHERE it runs moved to the reader origin, where the engine emits the location). `cfiToLocator` is
// reused from the EPUB plugin (a pure string round-trip, no engine needed) via the `@` alias.

import type { FoliateLocation } from 'foliate-js/view.js'
import {
  MEDIA_TYPE_EPUB,
  type Locator,
  type LocatorLocations,
  type Publication,
} from '@/core/model'
import { cfiToLocator, type CfiLocatorExtras } from '@/plugins/formats/epub/cfi-locator'

/** Clamp a progression fraction into the valid 0..1 range (a dragged scrubber can overshoot). */
export function clampFraction(fraction: number): number {
  if (Number.isNaN(fraction)) return 0
  return Math.max(0, Math.min(1, fraction))
}

/**
 * Map foliate's relocate detail to a neutral Locator, resolving the spine href from the publication's
 * `readingOrder` (built in-frame from the same bytes). A full in-content CFI is preferred; otherwise a
 * plain `{ href, locations }` Locator carries the position/progression the position bar reads.
 */
export function toLocator(detail: FoliateLocation | undefined, publication: Publication): Locator {
  const fallback: Locator = publication.readingOrder[0] ?? { href: '', type: MEDIA_TYPE_EPUB }
  const index = detail?.section?.current
  const href =
    typeof index === 'number'
      ? (publication.readingOrder[index]?.href ?? fallback.href)
      : fallback.href
  const extras: CfiLocatorExtras = {}
  if (typeof detail?.fraction === 'number') extras.totalProgression = detail.fraction
  // foliate page indices are 0-based; the position bar shows a 1-based folio.
  if (typeof detail?.location?.current === 'number') extras.position = detail.location.current + 1
  // The chapter heading the position bar labels ("Chapter I") — the TOC entry for this position.
  const chapter = detail?.tocItem?.label
  if (typeof chapter === 'string' && chapter) extras.title = chapter

  if (typeof detail?.cfi === 'string' && detail.cfi.length) {
    return cfiToLocator(detail.cfi, href, extras)
  }
  const locator: Locator = { href, type: MEDIA_TYPE_EPUB }
  if (extras.title) locator.title = extras.title
  const locations: LocatorLocations = {}
  if (extras.totalProgression !== undefined) locations.totalProgression = extras.totalProgression
  if (extras.position !== undefined) locations.position = extras.position
  if (Object.keys(locations).length) locator.locations = locations
  return locator
}
