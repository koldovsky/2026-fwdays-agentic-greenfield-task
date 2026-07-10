import { describe, expect, it } from 'vitest'
import type { LibraryBrowseEntry, Locator, Publication } from '@/core/model'
import { locatorLocationsFromSnapshot, progressSnapshotFromLocator } from '@/core/model'
import {
  SCHEMA_VERSION,
  SerializationError,
  parseLibraryBrowseEntry,
  parseLocator,
  parsePublication,
  serializeLibraryBrowseEntry,
  serializeLocator,
  serializePublication,
} from '@/core/model/serialization'

const locator: Locator = {
  href: 'chapter-3.xhtml',
  type: 'application/epub+zip',
  title: 'Chapter 3',
  locations: { progression: 0.5, totalProgression: 0.38, position: 12, cfi: 'epubcfi(/6/8!/4/2)' },
  text: { before: '…before ', highlight: 'the', after: ' after…' },
}

const publication: Publication = {
  metadata: { title: 'Pride and Prejudice', author: 'Jane Austen', language: 'en' },
  readingOrder: [{ href: 'ch1.xhtml', type: 'application/epub+zip' }],
  tableOfContents: [{ href: 'ch1.xhtml', type: 'application/epub+zip', title: 'Chapter 1' }],
  layout: 'reflowable',
}

const entry: LibraryBrowseEntry = {
  sourceId: 'home-server',
  bookId: 'saltmoon',
  mediaType: 'application/vnd.comicbook+zip',
  title: 'Saltmoon',
  seriesLabel: 'Vol. 4 · R. Okonkwo',
  coverColor: '#3f6b70',
  spineLabel: 'VOL. 4',
  sourceLabel: 'komga',
  addedAt: '2026-05-08T09:00:00.000Z',
  progress: { position: 88, totalPositions: 192 },
}

describe('serialization — round-trip conformance (native-client baseline)', () => {
  it('round-trips a Locator identically (parse∘serialize is the identity)', () => {
    expect(parseLocator(serializeLocator(locator))).toEqual(locator)
  })

  it('round-trips a Publication identically, layout discriminator included', () => {
    expect(parsePublication(serializePublication(publication))).toEqual(publication)
  })

  it('round-trips a LibraryBrowseEntry identically, progress snapshot included', () => {
    expect(parseLibraryBrowseEntry(serializeLibraryBrowseEntry(entry))).toEqual(entry)
  })

  it('serialize → parse → serialize is a stable string for every type', () => {
    for (const stable of [
      serializeLocator(parseLocator(serializeLocator(locator))) === serializeLocator(locator),
      serializePublication(parsePublication(serializePublication(publication))) ===
        serializePublication(publication),
      serializeLibraryBrowseEntry(parseLibraryBrowseEntry(serializeLibraryBrowseEntry(entry))) ===
        serializeLibraryBrowseEntry(entry),
    ]) {
      expect(stable).toBe(true)
    }
  })
})

describe('serialization — versioned envelope', () => {
  it('stamps an explicit schemaVersion on every type', () => {
    for (const json of [
      serializeLocator(locator),
      serializePublication(publication),
      serializeLibraryBrowseEntry(entry),
    ]) {
      expect(JSON.parse(json).schemaVersion).toBe(SCHEMA_VERSION)
      expect(SCHEMA_VERSION).toBe(1)
    }
  })

  it('tags the envelope type so a payload cannot be parsed as the wrong type', () => {
    expect(JSON.parse(serializeLocator(locator)).type).toBe('Locator')
    // A Publication envelope parsed as a Locator must throw, not silently coerce.
    expect(() => parseLocator(serializePublication(publication))).toThrow(SerializationError)
  })

  it('throws SerializationError on an unknown schema version', () => {
    const future = JSON.stringify({ schemaVersion: 2, type: 'Locator', payload: locator })
    expect(() => parseLocator(future)).toThrow(SerializationError)
    expect(() => parseLocator(future)).toThrow(/schemaVersion/)
  })

  it('throws SerializationError on malformed JSON or a non-envelope', () => {
    expect(() => parseLocator('not json at all')).toThrow(SerializationError)
    expect(() => parseLocator(JSON.stringify({ nope: true }))).toThrow(SerializationError)
  })
})

describe('serialization — only JSON-native values cross the boundary', () => {
  it('contains no Date, function, or other non-JSON value (addedAt stays a string)', () => {
    const payload = JSON.parse(serializeLibraryBrowseEntry(entry)).payload
    expect(typeof payload.addedAt).toBe('string')
    // A deep clone via JSON must equal the parsed value ⇒ it is pure JSON-native data.
    expect(JSON.parse(JSON.stringify(payload))).toEqual(payload)
  })
})

describe('Locator ↔ ProgressSnapshot converter (shared by the native client)', () => {
  it('derives a snapshot from a Locator and projects it back over the shared fields', () => {
    const snapshot = progressSnapshotFromLocator(locator)
    expect(snapshot).toEqual({ totalProgression: 0.38, position: 12 })
    expect(locatorLocationsFromSnapshot(snapshot)).toEqual({ totalProgression: 0.38, position: 12 })
  })

  it('omits absent fields rather than emitting undefined keys (keeps round-trips clean)', () => {
    expect(progressSnapshotFromLocator({ href: 'x', type: 'application/pdf' })).toEqual({})
  })
})

describe('serialization — reading-time estimate & last-read survive a Locator round-trip', () => {
  const withEstimate: Locator = {
    href: 'ch14.xhtml',
    type: 'application/epub+zip',
    locations: { totalProgression: 0.38, minutesLeft: 72 },
    lastReadAt: '2026-06-29T10:00:00.000Z',
    lastReadDevice: 'Phone',
  }

  it('keeps locations.minutesLeft and the last-read metadata across serialize → parse', () => {
    expect(parseLocator(serializeLocator(withEstimate))).toEqual(withEstimate)
  })

  it('the Locator ↔ ProgressSnapshot converters carry minutesLeft and last-read', () => {
    const snapshot = progressSnapshotFromLocator(withEstimate)
    expect(snapshot).toEqual({
      totalProgression: 0.38,
      minutesLeft: 72,
      lastReadAt: '2026-06-29T10:00:00.000Z',
      lastReadDevice: 'Phone',
    })
    // The inverse covers the positional `locations` (minutesLeft included); the top-level last-read
    // metadata is stamped onto the locator by the sync strategy, not by this locations projection.
    expect(locatorLocationsFromSnapshot(snapshot)).toEqual({
      totalProgression: 0.38,
      minutesLeft: 72,
    })
  })
})
