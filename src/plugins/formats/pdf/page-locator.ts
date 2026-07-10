// PDF page locators (the `page` locator scheme): a 1-based `position`/`page` plus a whole-publication
// `totalProgression` so the reader's position bar scrubs. Pure, DOM-free helpers shared by the
// Publication mapper and the navigator so a `currentLocator()` round-trips exactly through `goTo`.

import { MEDIA_TYPE_PDF, type Locator } from '@/core/model'

/** Build the locator for 1-based `page` of an `numPages`-page PDF (optionally titled). */
export function pdfPageLocator(page: number, numPages: number, title?: string): Locator {
  const totalProgression = numPages > 0 ? (page - 1) / numPages : 0
  return {
    href: `#page=${page}`,
    type: MEDIA_TYPE_PDF,
    title: title ?? `Page ${page}`,
    locations: { position: page, page, totalProgression },
  }
}

/** Resolve a locator back to a clamped 1-based page (the inverse of {@link pdfPageLocator}). */
export function pageFromLocator(locator: Locator, numPages: number): number {
  const { page, position, totalProgression } = locator.locations ?? {}
  const raw =
    page ??
    position ??
    (totalProgression !== undefined ? Math.round(totalProgression * numPages) + 1 : 1)
  return Math.min(Math.max(1, raw), Math.max(1, numPages))
}
