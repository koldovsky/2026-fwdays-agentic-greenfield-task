// Shared OPDS / Readium utilities, COMPOSED by the Komga (and later OPDS) connectors — never
// inherited (DESIGN-CONNECTORS.md §10). Intentionally minimal and behavioural: pure mapping helpers only, no
// connector base class (that is connector-opds, change 10). Komga speaks native REST and reuses
// these only where it exposes OPDS/Readium representations (e.g. its Readium WebPub manifest links).

import type { BookRef, MediaType } from '@/core/model'

/** A link as it appears in an OPDS feed entry or a Readium manifest (`rel` may be a list). */
export interface OpdsLink {
  href: string
  rel?: string | readonly string[]
  type?: MediaType
  title?: string
}

function rels(link: OpdsLink): readonly string[] {
  if (link.rel === undefined) return []
  return Array.isArray(link.rel) ? link.rel : [link.rel as string]
}

/**
 * Pick the best download link from a set of OPDS/Readium links: prefer an acquisition `rel`
 * (`http://opds-spec.org/acquisition*`), optionally constrained to a media `type`. Falls back to the
 * first `type`-matching link, then undefined. Pure — no DOM, no network.
 */
export function resolveAcquisitionLink(
  links: readonly OpdsLink[],
  options: { type?: MediaType } = {},
): OpdsLink | undefined {
  const typeMatches = (link: OpdsLink): boolean =>
    options.type === undefined || link.type === options.type
  const isAcquisition = (link: OpdsLink): boolean =>
    rels(link).some((rel) => rel.includes('acquisition'))

  return (
    links.find((link) => isAcquisition(link) && typeMatches(link)) ??
    links.find(isAcquisition) ??
    // Last resort: a link of the exact requested type even without an acquisition rel. Only when a
    // type is given — never fall through to an arbitrary (e.g. `self`/`image`) link.
    (options.type !== undefined ? links.find((link) => link.type === options.type) : undefined)
  )
}

/**
 * Parse an OPDS (Atom acquisition) feed into book references. Minimal: title, a stable id, and the
 * media type taken from the entry's acquisition link. Returns only entries that carry an acquisition
 * link (something the reader can actually open).
 */
export function parseOpdsEntries(feedXml: string, sourceId: string): BookRef[] {
  return parseOpds1Feed(feedXml, sourceId).books.map((entry) => entry.ref)
}

// --- Unified feed parsing (OPDS 1.x Atom + OPDS 2.0 JSON) -------------------
// `connector.opds` browses with these: an acquisition entry becomes a downloadable book; a navigation
// entry becomes a shelf the user browses into; and an OPDS-v2 progression link flips honest progress
// sync on. Pure (DOMParser/JSON.parse), no network — the connector owns the HTTP via its HostBridge.

/** A downloadable OPDS book: its `BookRef`, the acquisition href its bytes are fetched from, and an
 *  optional author label for the library card. */
export interface OpdsBookEntry {
  ref: BookRef
  downloadHref: string
  author?: string
}

/** An OPDS navigation entry — a sub-feed the user browses into (a "shelf"). */
export interface OpdsShelf {
  id: string
  title: string
  href: string
}

/** The parsed shape of an OPDS feed: its books, its shelves, and whether it advertises progression. */
export interface ParsedOpdsFeed {
  books: OpdsBookEntry[]
  shelves: OpdsShelf[]
  advertisesProgression: boolean
}

/** Rel that marks a sub-catalog/navigation link (a shelf), e.g. `subsection` or an OPDS-catalog type. */
function isNavigationLink(link: OpdsLink): boolean {
  const linkRels = rels(link)
  if (linkRels.some((rel) => rel.includes('acquisition'))) return false
  return (
    linkRels.includes('subsection') ||
    linkRels.includes('http://opds-spec.org/sort/new') ||
    (link.type?.includes('kind=navigation') ?? false) ||
    (link.type?.includes('opds-catalog') ?? false)
  )
}

/** Rel that marks an OPDS-v2 reading-progression endpoint (Readium / cantook progression). */
function isProgressionLink(link: OpdsLink): boolean {
  return rels(link).some((rel) => rel.includes('progression'))
}

/** Parse an OPDS 1.x Atom feed into books + shelves. */
export function parseOpds1Feed(feedXml: string, sourceId: string): ParsedOpdsFeed {
  const doc = new DOMParser().parseFromString(feedXml, 'application/xml')
  if (doc.querySelector('parsererror')) {
    return { books: [], shelves: [], advertisesProgression: false }
  }

  const books: OpdsBookEntry[] = []
  const shelves: OpdsShelf[] = []
  let advertisesProgression = false

  for (const entry of Array.from(doc.getElementsByTagName('entry'))) {
    const links: OpdsLink[] = Array.from(entry.getElementsByTagName('link')).map((el) => ({
      href: el.getAttribute('href') ?? '',
      rel: el.getAttribute('rel') ?? undefined,
      type: el.getAttribute('type') ?? undefined,
    }))
    if (links.some(isProgressionLink)) advertisesProgression = true

    const title = entry.getElementsByTagName('title')[0]?.textContent?.trim() ?? 'Untitled'
    const id = entry.getElementsByTagName('id')[0]?.textContent?.trim()
    const author = entry
      .getElementsByTagName('author')[0]
      ?.getElementsByTagName('name')[0]
      ?.textContent?.trim()
    const acquisition = resolveAcquisitionLink(links)
    if (acquisition?.type) {
      books.push({
        ref: { sourceId, bookId: id ?? acquisition.href, mediaType: acquisition.type, title },
        downloadHref: acquisition.href,
        ...(author ? { author } : {}),
      })
      continue
    }
    const navigation = links.find(isNavigationLink)
    if (navigation) shelves.push({ id: id ?? navigation.href, title, href: navigation.href })
  }
  return { books, shelves, advertisesProgression }
}

// --- OPDS 2.0 JSON shapes (only the fields read) ---------------------------
interface Opds2Link {
  href?: string
  rel?: string | string[]
  type?: string
  title?: string
}
interface Opds2Publication {
  metadata?: { title?: string; identifier?: string; author?: unknown }
  links?: Opds2Link[]
}
interface Opds2Feed {
  links?: Opds2Link[]
  publications?: Opds2Publication[]
  navigation?: Opds2Link[]
}

function opds2Author(author: unknown): string | undefined {
  if (typeof author === 'string') return author
  if (Array.isArray(author)) return opds2Author(author[0])
  if (author && typeof author === 'object' && 'name' in author) {
    const name = (author as { name?: unknown }).name
    return typeof name === 'string' ? name : undefined
  }
  return undefined
}

/** Parse an OPDS 2.0 JSON feed into books + shelves. */
export function parseOpds2Feed(json: string, sourceId: string): ParsedOpdsFeed {
  let feed: Opds2Feed
  try {
    feed = JSON.parse(json) as Opds2Feed
  } catch {
    return { books: [], shelves: [], advertisesProgression: false }
  }

  const toOpdsLink = (link: Opds2Link): OpdsLink => ({
    href: link.href ?? '',
    rel: link.rel,
    type: link.type,
  })

  const books: OpdsBookEntry[] = []
  for (const publication of feed.publications ?? []) {
    const links = (publication.links ?? []).map(toOpdsLink)
    const acquisition = resolveAcquisitionLink(links)
    if (!acquisition?.type) continue
    const title = publication.metadata?.title?.trim() || 'Untitled'
    const id = publication.metadata?.identifier ?? acquisition.href
    const ref: BookRef = { sourceId, bookId: id, mediaType: acquisition.type, title }
    const author = opds2Author(publication.metadata?.author)
    books.push({ ref, downloadHref: acquisition.href, ...(author ? { author } : {}) })
  }

  const shelves: OpdsShelf[] = (feed.navigation ?? [])
    .filter((link) => link.href)
    .map((link, index) => ({
      id: link.href ?? String(index),
      title: link.title ?? link.href ?? `Shelf ${index + 1}`,
      href: link.href ?? '',
    }))

  const advertisesProgression = (feed.links ?? []).map(toOpdsLink).some(isProgressionLink)
  return { books, shelves, advertisesProgression }
}

/** Parse any OPDS feed (auto-routes by `isJson`). */
export function parseOpdsFeed(body: string, isJson: boolean, sourceId: string): ParsedOpdsFeed {
  return isJson ? parseOpds2Feed(body, sourceId) : parseOpds1Feed(body, sourceId)
}
