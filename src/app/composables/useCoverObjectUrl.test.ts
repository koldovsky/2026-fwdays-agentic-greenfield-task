import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import { flushPromises } from '@vue/test-utils'
import type { Connector } from '@/core/contracts'
import { MEDIA_TYPE_EPUB, type BookRef } from '@/core/model'
import { useCoverObjectUrl } from '@/app/composables/useCoverObjectUrl'

const BOOK: BookRef = {
  sourceId: 'connector.komga',
  bookId: 'bk1',
  mediaType: MEDIA_TYPE_EPUB,
  title: 'Book 1',
}

// jsdom doesn't implement object URLs — install test doubles so the composable can create/revoke them.
let urlCounter = 0
const createObjectURL = vi.fn(() => `blob:mock/${urlCounter++}`)
const revokeObjectURL = vi.fn()

beforeEach(() => {
  urlCounter = 0
  createObjectURL.mockClear()
  revokeObjectURL.mockClear()
  URL.createObjectURL = createObjectURL as unknown as typeof URL.createObjectURL
  URL.revokeObjectURL = revokeObjectURL as unknown as typeof URL.revokeObjectURL
})
afterEach(() => {
  vi.restoreAllMocks()
})

/** Minimal Connector test double exposing only what the composable reads. */
function fakeConnector(over: Partial<Connector> = {}): Connector {
  return {
    id: 'connector.komga',
    progressSync: true,
    probe: async () => true,
    browse: async () => [],
    getBook: async () => ({ title: 'x', authors: [] }),
    content: async () => new Uint8Array(),
    progressStrategy: () => ({
      getProgress: async () => undefined,
      setProgress: async () => {},
    }),
    ...over,
  } as Connector
}

/** Run a composable inside an effect scope and let its immediate async watcher settle. */
async function runScope<T>(fn: () => T): Promise<{ stop: () => void; result: T }> {
  const scope = effectScope()
  const result = scope.run(fn) as T
  await flushPromises()
  return { stop: () => scope.stop(), result }
}

describe('useCoverObjectUrl', () => {
  it('fetches authed cover bytes and exposes a blob: URL (never a bare cross-origin <img>)', async () => {
    const coverBytes = vi.fn(async () => new Uint8Array([1, 2, 3]))
    const connector = fakeConnector({ coverBytes })
    const { stop, result } = await runScope(() =>
      useCoverObjectUrl(
        () => connector,
        () => BOOK,
        () => 'http://komga.test/thumbnail',
      ),
    )
    // The cover is fetched THROUGH the connector (which carries auth), not as a bare image request.
    expect(coverBytes).toHaveBeenCalledWith(BOOK)
    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(result.src.value).toBe('blob:mock/0')
    stop()
  })

  it('falls back to the public coverHref when the connector exposes no coverBytes', async () => {
    const connector = fakeConnector() // no coverBytes ⇒ public cover path
    const { stop, result } = await runScope(() =>
      useCoverObjectUrl(
        () => connector,
        () => BOOK,
        () => 'http://opds.test/cover.jpg',
      ),
    )
    expect(createObjectURL).not.toHaveBeenCalled()
    expect(result.src.value).toBe('http://opds.test/cover.jpg')
    stop()
  })

  it('falls back to the placeholder (NOT the authed href) when an authed cover fetch fails', async () => {
    // The href for an authed source IS the credential-protected /thumbnail URL — falling back to it would
    // re-point the <img> at it and re-trip the native Basic-auth popup. A failed authed fetch must yield
    // the colour placeholder (undefined), never the href.
    const coverBytes = vi.fn(async () => {
      throw new Error('401 Unauthorized')
    })
    const connector = fakeConnector({ coverBytes })
    const { stop, result } = await runScope(() =>
      useCoverObjectUrl(
        () => connector,
        () => BOOK,
        () => 'http://komga.test/thumbnail',
      ),
    )
    expect(result.src.value).toBeUndefined()
    expect(createObjectURL).not.toHaveBeenCalled()
    stop()
  })

  it('exposes no src when there is no book ref at all', async () => {
    const connector = fakeConnector({ coverBytes: vi.fn(async () => new Uint8Array([1])) })
    const { stop, result } = await runScope(() =>
      useCoverObjectUrl(
        () => connector,
        () => undefined,
        () => undefined,
      ),
    )
    expect(result.src.value).toBeUndefined()
    expect(createObjectURL).not.toHaveBeenCalled()
    stop()
  })

  it('revokes the object URL when the scope is disposed (no blob leak)', async () => {
    const coverBytes = vi.fn(async () => new Uint8Array([1]))
    const connector = fakeConnector({ coverBytes })
    const { stop } = await runScope(() =>
      useCoverObjectUrl(
        () => connector,
        () => BOOK,
        () => undefined,
      ),
    )
    expect(createObjectURL).toHaveBeenCalledTimes(1)
    stop()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock/0')
  })
})
