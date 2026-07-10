import { describe, expect, it, vi } from 'vitest'
import type { FormatHandler, PluginManifest, Resolution } from '@/core/contracts'
import type { BookRef, MediaType } from '@/core/model'
import {
  CAPABILITY_MISSING_EVENT,
  type CapabilityMissingPayload,
  type EddaEvents,
  SimpleEventBus,
} from '@/core/event-bus'
import { CapabilityDispatcher, type FormatResolver } from '@/core/dispatch'

const PDF_MANIFEST = {
  id: 'format.pdf',
  name: 'PDF support',
  version: '1.0.3',
  kind: 'format',
  hostApi: '^1.0.0',
  bundled: false,
  approxSizeKB: 1229,
  capabilities: { mediaTypes: ['application/pdf'], extensions: ['pdf'] },
} satisfies PluginManifest

const fakeHandler = { id: 'format.epub' } as FormatHandler

/** A resolver that knows EPUB (installed/ready) and PDF (catalog-only/installable); else unsupported. */
function resolver(): FormatResolver {
  return {
    resolveFormat(mediaType: MediaType): Promise<Resolution<FormatHandler>> {
      if (mediaType === 'application/epub+zip') {
        return Promise.resolve({ status: 'ready', instance: fakeHandler })
      }
      if (mediaType === 'application/pdf') {
        return Promise.resolve({ status: 'installable', suggestion: PDF_MANIFEST })
      }
      return Promise.resolve({ status: 'unsupported' })
    },
  }
}

function ref(mediaType: MediaType): BookRef {
  return { sourceId: 's', bookId: 'b', mediaType, title: 'Dorian Gray' }
}

describe('CapabilityDispatcher.openBook', () => {
  it('an installed format resolves to ready and emits no CapabilityMissing', async () => {
    const bus = new SimpleEventBus<EddaEvents>()
    const seen = vi.fn()
    bus.on(CAPABILITY_MISSING_EVENT, seen)
    const dispatcher = new CapabilityDispatcher(resolver(), bus)

    const resolution = await dispatcher.openBook(ref('application/epub+zip'))

    expect(resolution.status).toBe('ready')
    expect(seen).not.toHaveBeenCalled()
  })

  it('a known-but-not-installed format resolves to installable and emits the suggestion', async () => {
    const bus = new SimpleEventBus<EddaEvents>()
    let received: CapabilityMissingPayload | undefined
    bus.on(CAPABILITY_MISSING_EVENT, (payload) => (received = payload))
    const dispatcher = new CapabilityDispatcher(resolver(), bus)

    const resolution = await dispatcher.openBook(ref('application/pdf'))

    expect(resolution.status).toBe('installable')
    expect(received?.suggestion.id).toBe('format.pdf')
    expect(received?.suggestion.version).toBe('1.0.3')
    expect(received?.suggestion.approxSizeKB).toBe(1229)
    expect(received?.bookRef.title).toBe('Dorian Gray')
  })

  it('an unknown media type resolves to unsupported and emits nothing', async () => {
    const bus = new SimpleEventBus<EddaEvents>()
    const seen = vi.fn()
    bus.on(CAPABILITY_MISSING_EVENT, seen)
    const dispatcher = new CapabilityDispatcher(resolver(), bus)

    const resolution = await dispatcher.openBook(ref('application/x-mobipocket-ebook'))

    expect(resolution.status).toBe('unsupported')
    expect(seen).not.toHaveBeenCalled()
  })

  it('trusts the connector media type over a misleading file extension', async () => {
    const bus = new SimpleEventBus<EddaEvents>()
    const dispatcher = new CapabilityDispatcher(resolver(), bus)

    // Connector metadata says PDF; the resource carries a misleading `.bin` extension.
    const resolution = await dispatcher.openBook(ref('application/pdf'), { extension: 'bin' })

    expect(resolution.status).toBe('installable')
  })

  it('re-issuing openBook after the resolver reports ready opens without a second prompt (retry)', async () => {
    const bus = new SimpleEventBus<EddaEvents>()
    const prompts = vi.fn()
    bus.on(CAPABILITY_MISSING_EVENT, prompts)
    // A resolver that flips PDF from installable → ready after "install".
    let installed = false
    const flipping: FormatResolver = {
      resolveFormat: (mediaType) =>
        Promise.resolve(
          mediaType === 'application/pdf' && installed
            ? { status: 'ready', instance: fakeHandler }
            : mediaType === 'application/pdf'
              ? { status: 'installable', suggestion: PDF_MANIFEST }
              : { status: 'unsupported' },
        ),
    }
    const dispatcher = new CapabilityDispatcher(flipping, bus)

    expect((await dispatcher.openBook(ref('application/pdf'))).status).toBe('installable')
    installed = true
    expect((await dispatcher.openBook(ref('application/pdf'))).status).toBe('ready')
    expect(prompts).toHaveBeenCalledOnce() // only the first (pre-install) open prompted
  })
})
