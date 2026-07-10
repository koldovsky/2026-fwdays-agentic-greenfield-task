import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { DetectedServer } from '@/core/dispatch'
import { KOMGA_CAPABILITIES } from '@/plugins/connectors/komga'
import { OPDS_CAPABILITIES } from '@/plugins/connectors/opds'
import { KOMGA_MANIFEST, OPDS_MANIFEST } from '@/app/plugins-catalog'
import { useLibraryStore } from '@/app/stores/libraryStore'
import { useSourcesStore, type SourceRecord } from '@/app/stores/sourcesStore'

const KOMGA_DETECTED: DetectedServer = {
  connectorId: 'connector.komga',
  kind: 'komga',
  capabilities: KOMGA_CAPABILITIES,
  manifest: KOMGA_MANIFEST,
}

const CREDS = { username: 'reader@edda.test', password: 'edda-reader-pw' }
const BASE_URL = 'http://localhost:25600'

function readPersistedSources(): SourceRecord[] {
  const raw = localStorage.getItem('edda.sources')
  return raw ? (JSON.parse(raw) as SourceRecord[]) : []
}

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

afterEach(() => {
  localStorage.clear()
})

describe('sourcesStore — credential boundary (load-bearing security)', () => {
  it('persists a SOURCE record with NO credentials and a SEPARATE credential record', async () => {
    const store = useSourcesStore()
    const record = await store.connect({ detected: KOMGA_DETECTED, baseUrl: BASE_URL, ...CREDS })

    const [persisted] = readPersistedSources()
    expect(persisted).toBeDefined()
    // The syncable source record must carry no secret — only a reference to the on-device creds.
    expect('username' in (persisted as object)).toBe(false)
    expect('password' in (persisted as object)).toBe(false)
    expect(persisted?.credentialRef).toBe(`edda.creds.${record.sourceId}`)
    expect(persisted?.connectorId).toBe('connector.komga')
    expect(persisted?.kind).toBe('komga')

    // Credentials live under their own distinct key, never inside edda.sources.
    const creds = JSON.parse(localStorage.getItem(`edda.creds.${record.sourceId}`) ?? 'null')
    expect(creds).toEqual(CREDS)
    expect(`edda.creds.${record.sourceId}`).not.toBe('edda.sources')
  })

  it('writes no secret substring into the syncable source metadata', async () => {
    await useSourcesStore().connect({ detected: KOMGA_DETECTED, baseUrl: BASE_URL, ...CREDS })
    const rawSources = localStorage.getItem('edda.sources') ?? ''
    expect(rawSources).not.toContain(CREDS.password)
    expect(rawSources).not.toContain(CREDS.username)
  })

  it('surfaces the connected source in the sidebar list and sets it as the Library connector', async () => {
    const store = useSourcesStore()
    await store.connect({ detected: KOMGA_DETECTED, baseUrl: BASE_URL, ...CREDS })
    expect(store.sources).toHaveLength(1)
    expect(store.sources[0]?.name).toBe('Komga server')
    expect(store.sources[0]?.descriptor).toBe('komga · localhost:25600')
    expect(useLibraryStore().connector?.id).toBe('connector.komga')
  })
})

describe('sourcesStore — bare-OPDS fallback connects like any other source', () => {
  it('persists an OPDS source and makes the generic OPDS connector the Library connector', async () => {
    const detected: DetectedServer = {
      connectorId: 'connector.opds',
      kind: 'opds',
      capabilities: OPDS_CAPABILITIES,
      manifest: OPDS_MANIFEST,
    }
    const store = useSourcesStore()
    await store.connect({
      detected,
      baseUrl: 'https://feed.example/opds',
      username: '',
      password: '',
    })

    expect(store.sources[0]?.name).toBe('OPDS feed')
    expect(store.sources[0]?.descriptor).toBe('opds · feed.example')
    expect(useLibraryStore().connector?.id).toBe('connector.opds')
    const [record] = readPersistedSources()
    expect(record?.connectorId).toBe('connector.opds')
    expect(record?.kind).toBe('opds')
  })
})

describe('sourcesStore — sourceId lifecycle', () => {
  it('mints the sourceId once and REUSES it on rehydrate (never re-minted)', async () => {
    const original = await useSourcesStore().connect({
      detected: KOMGA_DETECTED,
      baseUrl: BASE_URL,
      ...CREDS,
    })
    expect(original.sourceId).toMatch(/[0-9a-f-]{36}/)

    // Simulate a reload: a fresh Pinia over the SAME persisted localStorage.
    setActivePinia(createPinia())
    const reloaded = useSourcesStore()
    await reloaded.rehydrate()

    expect(reloaded.sources).toHaveLength(1)
    expect(reloaded.sources[0]?.sourceId).toBe(original.sourceId)
    expect(useLibraryStore().connector?.id).toBe('connector.komga')
  })
})

describe('sourcesStore — no persistence without connect (Cancel is a no-op)', () => {
  it('persists nothing and lists no sources until connect is called', async () => {
    const store = useSourcesStore()
    await store.rehydrate()
    expect(store.sources).toHaveLength(0)
    expect(localStorage.getItem('edda.sources')).toBeNull()
  })
})
