// Dexie storage layer (offline registry + progress outbox). jsdom ships no IndexedDB, so the durable
// store is exercised on `fake-indexeddb` (a faithful IndexedDB), injected into Dexie — no global
// pollution, each test isolated by its own `IDBFactory`. Proves: rows persist across a simulated reload
// (a fresh `EddaDb` over the SAME backing), the compound key keeps the two media types of one title
// distinct, and the v1→v2 schema migration applies cleanly without losing rows.

import { afterEach, describe, expect, it } from 'vitest'
import Dexie from 'dexie'
import { IDBFactory, IDBKeyRange as FDBKeyRange } from 'fake-indexeddb'
import { MEDIA_TYPE_EPUB, MEDIA_TYPE_PDF, type Locator } from '@/core/model'
import {
  EddaDb,
  isOfflineAvailable,
  keyTuple,
  opfsKeyFor,
  toOutboxRecord,
  type DownloadRecord,
} from './db'

let dbs: EddaDb[] = []

function open(indexedDB: IDBFactory, name = 'edda-test'): EddaDb {
  const db = new EddaDb({ name, indexedDB, IDBKeyRange: FDBKeyRange })
  dbs.push(db)
  return db
}

afterEach(() => {
  for (const db of dbs) db.close()
  dbs = []
})

const pensees: DownloadRecord = {
  sourceId: 'connector-komga',
  bookId: 'book-1',
  mediaType: MEDIA_TYPE_EPUB,
  title: 'Pensées',
  size: 123_456,
  state: 'complete',
  downloadedAt: 1_700_000_000_000,
  opfsKey: opfsKeyFor({
    sourceId: 'connector-komga',
    bookId: 'book-1',
    mediaType: MEDIA_TYPE_EPUB,
  }),
}

describe('EddaDb — download registry', () => {
  it('persists a registry entry across a simulated reload (a fresh EddaDb over the same backing)', async () => {
    const factory = new IDBFactory()

    const first = open(factory)
    await first.downloads.put(pensees)
    first.close()

    // "Reload": a brand-new EddaDb instance over the same IndexedDB backing.
    const reopened = open(factory)
    const got = await reopened.downloads.get(keyTuple(pensees))
    expect(got).toEqual(pensees)
    expect(got && isOfflineAvailable(got)).toBe(true)
  })

  it('keeps the EPUB and the PDF of the same title as two distinct rows (compound key)', async () => {
    const db = open(new IDBFactory())
    const epub: DownloadRecord = { ...pensees, mediaType: MEDIA_TYPE_EPUB }
    const pdf: DownloadRecord = {
      ...pensees,
      mediaType: MEDIA_TYPE_PDF,
      opfsKey: opfsKeyFor({ ...pensees, mediaType: MEDIA_TYPE_PDF }),
    }
    await db.downloads.bulkPut([epub, pdf])

    expect(await db.downloads.count()).toBe(2)
    expect(await db.downloads.get(keyTuple(epub))).toMatchObject({ mediaType: MEDIA_TYPE_EPUB })
    expect(await db.downloads.get(keyTuple(pdf))).toMatchObject({ mediaType: MEDIA_TYPE_PDF })
    // Distinct OPFS keys → distinct files (no byte collision between the two formats).
    expect(epub.opfsKey).not.toBe(pdf.opfsKey)
  })

  it('removes a registry entry by its compound key', async () => {
    const db = open(new IDBFactory())
    await db.downloads.put(pensees)
    await db.downloads.delete(keyTuple(pensees))
    expect(await db.downloads.get(keyTuple(pensees))).toBeUndefined()
  })
})

describe('EddaDb — progress outbox', () => {
  const locator: Locator = {
    href: 'book-1',
    type: MEDIA_TYPE_EPUB,
    locations: { totalProgression: 0.5 },
  }

  it('persists a pending outbox row across a reload', async () => {
    const factory = new IDBFactory()
    const first = open(factory)
    await first.outbox.put(
      toOutboxRecord({
        ref: {
          sourceId: 'connector-komga',
          bookId: 'book-1',
          mediaType: MEDIA_TYPE_EPUB,
          title: 'Pensées',
        },
        locator,
        queuedAt: 1_700_000_000_000,
      }),
    )
    first.close()

    const reopened = open(factory)
    const rows = await reopened.outbox.toArray()
    expect(rows).toHaveLength(1)
    expect(rows[0]?.locator.locations?.totalProgression).toBe(0.5)
  })
})

describe('opfsKeyFor — human-readable, injective, filesystem-safe OPFS name', () => {
  it('uses the title as the base name + the media-type extension (recognisable, not opaque)', () => {
    const key = opfsKeyFor({
      sourceId: 'connector-komga',
      bookId: '01H8',
      mediaType: MEDIA_TYPE_EPUB,
      title: 'Pensées',
    })
    expect(key.startsWith('Pensées [')).toBe(true)
    expect(key.endsWith('.epub')).toBe(true)
  })

  it('stays injective across distinct keys (no `__`-delimiter masquerade)', () => {
    // The readable name appends a length-prefixed hash of (sourceId, bookId, mediaType), so two keys
    // that could once have collided into one opaque filename stay distinct.
    const a = opfsKeyFor({ sourceId: 'a__b', bookId: 'c', mediaType: MEDIA_TYPE_EPUB })
    const b = opfsKeyFor({ sourceId: 'a', bookId: 'b__c', mediaType: MEDIA_TYPE_EPUB })
    expect(a).not.toBe(b)
    // Same title, different book → different file (the hash disambiguates the identical base name).
    const t1 = opfsKeyFor({ sourceId: 's', bookId: '1', mediaType: MEDIA_TYPE_EPUB, title: 'Dune' })
    const t2 = opfsKeyFor({ sourceId: 's', bookId: '2', mediaType: MEDIA_TYPE_EPUB, title: 'Dune' })
    expect(t1).not.toBe(t2)
  })

  it('strips path separators so the OPFS name cannot traverse directories', () => {
    const key = opfsKeyFor({ sourceId: 'src', bookId: 'a/../../b', mediaType: MEDIA_TYPE_EPUB })
    expect(key.includes('/')).toBe(false)
    expect(key.includes('\\')).toBe(false)
    // Distinct ids stay distinct.
    expect(opfsKeyFor({ sourceId: 'src', bookId: 'a', mediaType: MEDIA_TYPE_EPUB })).not.toBe(key)
  })
})

describe('EddaDb — schema migration', () => {
  it('applies the v1→v2 migration cleanly and keeps existing rows', async () => {
    const factory = new IDBFactory()

    // Open at v1 only and seed a row.
    const v1 = new Dexie('edda-migrate', { indexedDB: factory, IDBKeyRange: FDBKeyRange })
    v1.version(1).stores({
      downloads: '[sourceId+bookId+mediaType], state, downloadedAt',
      outbox: '[sourceId+bookId+mediaType], queuedAt',
    })
    await v1.table('downloads').put(pensees)
    v1.close()

    // Reopen with the full EddaDb (declares v1 AND v2) → Dexie runs the upgrade.
    const upgraded = new EddaDb({
      name: 'edda-migrate',
      indexedDB: factory,
      IDBKeyRange: FDBKeyRange,
    })
    dbs.push(upgraded)
    expect(upgraded.verno).toBeGreaterThanOrEqual(2)
    // Existing row survived the migration…
    expect(await upgraded.downloads.get(keyTuple(pensees))).toEqual(pensees)
    // …and the new `title` index (added in v2) is queryable.
    const byTitle = await upgraded.downloads.where('title').equals('Pensées').toArray()
    expect(byTitle).toHaveLength(1)
  })
})
