// Credential-isolation gate on the streamed offline-download path. The descriptor `url` comes from the
// server's manifest (untrusted) while `headers` carries the user's credentials, so `connectorDownloadStream`
// must refuse to `fetch` a URL whose origin is outside the connector's declared allowlist — the reader
// credentials must NEVER reach a foreign origin (the ch7 credential-isolation class, fixed at the root).

import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Connector } from '@/core/contracts'
import { MEDIA_TYPE_EPUB, type BookRef } from '@/core/model'
import { connectorDownloadStream, type DownloadDescriptor } from './connector-download'

const REF: BookRef = {
  sourceId: 'connector-komga',
  bookId: 'book-1',
  mediaType: MEDIA_TYPE_EPUB,
  title: 'Pensées',
}

// Built at runtime so no base64 Basic-Auth literal lands in the repo (secret scanners flag the pattern).
const CREDS = `Basic ${btoa('reader@edda.test:edda-reader-pw')}`

/** A streaming connector that returns a fixed (possibly hostile) download descriptor. */
function streamingConnector(descriptor: DownloadDescriptor): Connector {
  return { downloadDescriptor: vi.fn().mockResolvedValue(descriptor) } as unknown as Connector
}

function oneChunkBody(bytes: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes)
      controller.close()
    },
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('connectorDownloadStream — credential-isolation origin gate', () => {
  it('refuses a cross-origin download href and NEVER issues the credentialed fetch', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    // A malicious/compromised server returns an acquisition href at a foreign origin.
    const connector = streamingConnector({
      url: 'https://attacker.tld/collect',
      headers: { Authorization: CREDS },
      allowedOrigins: ['http://localhost:25600'],
    })

    await expect(connectorDownloadStream(connector, REF)).rejects.toThrow(/allowed origins/i)
    // The whole point: the reader credentials never left the device — no fetch was made at all.
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('allows a same-origin download href and fetches with redirect:"error" (no transparent cross-origin follow)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      body: oneChunkBody(new Uint8Array([1, 2, 3])),
    } as unknown as Response)
    const connector = streamingConnector({
      url: 'http://localhost:25600/api/v1/books/book-1/file',
      headers: { Authorization: CREDS },
      allowedOrigins: ['http://localhost:25600'],
    })

    const stream = await connectorDownloadStream(connector, REF)
    expect(stream).toBeInstanceOf(ReadableStream)
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:25600/api/v1/books/book-1/file',
      expect.objectContaining({ redirect: 'error', headers: { Authorization: CREDS } }),
    )
  })

  it('denies when the connector declares no allowed origins (fail closed)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const connector = streamingConnector({
      url: 'http://localhost:25600/api/v1/books/book-1/file',
      headers: { Authorization: CREDS },
      allowedOrigins: undefined,
    })

    await expect(connectorDownloadStream(connector, REF)).rejects.toThrow(/allowed origins/i)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('falls back to the connector buffered content() when there is no descriptor (no fetch, no gate)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const connector = {
      content: vi.fn().mockResolvedValue(new Uint8Array([4, 5, 6])),
    } as unknown as Connector

    const stream = await connectorDownloadStream(connector, REF)
    const reader = stream.getReader()
    const { value } = await reader.read()
    expect(value).toEqual(new Uint8Array([4, 5, 6]))
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
