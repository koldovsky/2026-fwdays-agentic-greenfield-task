// Map a parsed foliate `EPUB` onto Edda's platform-neutral, Readium-aligned `Publication`
// (core/model). PURE + DOM-free: it reads only the already-parsed book's plain fields, so it runs in
// jsdom and emits plain serializable shapes — no foliate/@readium class instances cross the boundary.
// foliate's metadata is messy (title is `string | { [lang]: string }`; authors are
// `string | {name} | Array<…>`; language is `string | string[]`); these helpers flatten it
// defensively. `import type` only — the foliate engine itself is reached lazily from index.ts.

import type { EPUB, EpubMetadata, EpubTocItem } from 'foliate-js/epub.js'
import {
  MEDIA_TYPE_EPUB,
  type Locator,
  type Publication,
  type PublicationLayout,
} from '@/core/model'

/** Flatten foliate's `string | { [lang]: string }` language-map down to a single display string. */
export function normalizeText(value: unknown): string | undefined {
  if (value == null) return undefined
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length ? trimmed : undefined
  }
  if (typeof value === 'object') {
    for (const candidate of Object.values(value as Record<string, unknown>)) {
      const text = normalizeText(candidate)
      if (text) return text
    }
  }
  return undefined
}

/** Flatten a contributor (`string | { name } | Array<…>`) into a single human author string. */
export function normalizeContributor(value: unknown): string | undefined {
  if (value == null) return undefined
  if (typeof value === 'string') return normalizeText(value)
  if (Array.isArray(value)) {
    const names = value.map(normalizeContributor).filter((x): x is string => Boolean(x))
    return names.length ? names.join(', ') : undefined
  }
  if (typeof value === 'object') {
    return normalizeText((value as { name?: unknown }).name)
  }
  return undefined
}

/** First language tag (foliate yields `string | string[]`), e.g. `en`. */
export function normalizeLanguage(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const lang = normalizeText(entry)
      if (lang) return lang
    }
    return undefined
  }
  return normalizeText(value)
}

/** Depth-first flatten of foliate's TOC tree into ordered `Locator`s (entries with a real href). */
export function flattenToc(items: readonly EpubTocItem[] | null | undefined): Locator[] {
  const out: Locator[] = []
  const walk = (nodes: readonly EpubTocItem[] | null | undefined): void => {
    if (!nodes) return
    for (const node of nodes) {
      const href = typeof node.href === 'string' ? node.href : undefined
      if (href) {
        const locator: Locator = { href, type: MEDIA_TYPE_EPUB }
        const title = normalizeText(node.label)
        if (title) locator.title = title
        out.push(locator)
      }
      walk(node.subitems)
    }
  }
  walk(items)
  return out
}

function mapLayout(rendition: { layout?: string } | undefined): PublicationLayout {
  return rendition?.layout === 'pre-paginated' ? 'fixed' : 'reflowable'
}

/**
 * Build the spine `readingOrder` in document order. Each entry carries the spine-level CFI
 * (`section.cfi`, the start-of-resource coordinate) and a 1-based `position`, so the reading order
 * is itself a list of real, navigable, fixture-derived locators.
 */
function mapReadingOrder(sections: EPUB['sections']): Locator[] {
  return sections.map((section, index) => {
    const locations: Locator['locations'] = { position: index + 1 }
    if (typeof section.cfi === 'string' && section.cfi.length) locations.cfi = section.cfi
    return { href: section.id, type: MEDIA_TYPE_EPUB, locations }
  })
}

/** Normalise a parsed foliate `EPUB` into a plain `Publication` (metadata + spine + flattened TOC). */
export function toPublication(book: EPUB): Publication {
  const metadata: EpubMetadata = book.metadata ?? {}
  const title = normalizeText(metadata.title) ?? 'Untitled'
  const author = normalizeContributor(metadata.author ?? metadata.creator)
  const language = normalizeLanguage(metadata.language)

  const publication: Publication = {
    metadata: { title },
    readingOrder: mapReadingOrder(book.sections ?? []),
    layout: mapLayout(book.rendition),
  }
  if (author) publication.metadata.author = author
  if (language) publication.metadata.language = language

  const toc = flattenToc(book.toc)
  if (toc.length) publication.tableOfContents = toc

  return publication
}
