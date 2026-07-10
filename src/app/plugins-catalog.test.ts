import { describe, expect, it, vi } from 'vitest'
import type { HttpClient } from '@/core/contracts'
import { InMemoryEnabledSetStore, PluginRegistry } from '@/core/registry'
import { createWebPluginBridge } from '@/platform/web'
import { KomgaConnector } from '@/plugins/connectors/komga'
import { createAppRegistry } from '@/app/app-registry'
import {
  KOMGA_MANIFEST,
  PDF_MANIFEST,
  bundledProbeEntries,
  komgaCatalogEntry,
  registerDefaultConnectors,
} from '@/app/plugins-catalog'

const config = { baseUrl: 'http://localhost:25600', email: 'reader@edda.test', password: 'pw' }
// A transport that throws if touched — proves construction performs no network I/O.
const inertHttp: HttpClient = {
  send: vi.fn(() => {
    throw new Error('no network during catalogue construction')
  }),
}
const bridge = createWebPluginBridge('connector.komga', KOMGA_MANIFEST, { baseHttp: inertHttp })

describe('KOMGA_MANIFEST', () => {
  it('declares a bundled, host-API ^1.0.0 connector with any-origin network and honest capabilities', () => {
    expect(KOMGA_MANIFEST.id).toBe('connector.komga')
    expect(KOMGA_MANIFEST.kind).toBe('connector')
    expect(KOMGA_MANIFEST.hostApi).toBe('^1.0.0')
    expect(KOMGA_MANIFEST.bundled).toBe(true)
    expect(KOMGA_MANIFEST.permissions?.network).toEqual(['*'])
    expect(KOMGA_MANIFEST.capabilities).toMatchObject({
      // Komga advertises OPDS v2 (feeds) + its native REST API — add-source-flow derives the maket's
      // "OPDS v2" chip and "opds v2 + rest" summary from this honest declaration (doc/web/05).
      protocols: ['opds2', 'komga-rest'],
      auth: ['basic'],
      progressSync: true,
    })
  })
})

describe('komgaCatalogEntry', () => {
  it('is lazy: building the entry does not import or instantiate the connector', () => {
    komgaCatalogEntry(config, bridge)
    expect(inertHttp.send).not.toHaveBeenCalled()
  })

  it('its loader dynamic-imports and builds a KomgaConnector on first use', async () => {
    const instance = await komgaCatalogEntry(config, bridge).loader()
    expect(instance).toBeInstanceOf(KomgaConnector)
    expect(instance.id).toBe('connector.komga')
  })
})

describe('bundledProbeEntries — detection staging', () => {
  it('marks the generic OPDS probe as a fallback, but not Komga’s dedicated-endpoint probe', () => {
    // Komga's probe hits a dedicated API path (`/api/v1/claim`, CORS-scoped to /api/**); the generic
    // OPDS probe sniffs the pasted URL itself. If OPDS ran eagerly alongside Komga, every successful
    // Komga connect would also fire a request straight at the pasted root — which Komga never sends
    // `Access-Control-Allow-Origin` on — logging a doomed CORS console error on the happy path. Marking
    // it `fallback: true` keeps the prober (`serverProbe`) from running it unless nothing more specific
    // already claimed the URL.
    const entries = bundledProbeEntries()
    const komga = entries.find((entry) => entry.manifest.id === 'connector.komga')
    const opds = entries.find((entry) => entry.manifest.id === 'connector.opds')
    expect(komga?.fallback).toBeFalsy()
    expect(opds?.fallback).toBe(true)
  })
})

describe('registerDefaultConnectors', () => {
  it('registers Komga as an available (installable) connector without loading its chunk', async () => {
    const registry = new PluginRegistry()
    registerDefaultConnectors(registry, { komga: config, bridge })
    expect(registry.available('connector').map((m) => m.id)).toEqual(['connector.komga'])
    expect((await registry.resolveConnector('connector.komga')).status).toBe('installable')
    expect(inertHttp.send).not.toHaveBeenCalled()
  })
})

describe('install-on-demand catalog manifests', () => {
  it('PDF_MANIFEST matches the maket (format.pdf · v1.0.3 · 1.2 MB, no network permission)', () => {
    expect(PDF_MANIFEST.id).toBe('format.pdf')
    expect(PDF_MANIFEST.version).toBe('1.0.3')
    expect(PDF_MANIFEST.kind).toBe('format')
    expect(PDF_MANIFEST.bundled).toBe(false)
    expect(PDF_MANIFEST.approxSizeKB).toBe(1229) // ⇒ "1.2 MB"
    expect(PDF_MANIFEST.permissions).toBeUndefined() // PDF reaches no network
    expect(PDF_MANIFEST.capabilities).toMatchObject({
      mediaTypes: ['application/pdf'],
      layout: 'fixed',
      locatorScheme: 'page',
    })
  })
})

describe('app registry — Extensions catalog composition', () => {
  it('installs OPDS/Komga/EPUB (bundled) and leaves only the real PDF format available', () => {
    const registry = createAppRegistry(new InMemoryEnabledSetStore(), new InMemoryEnabledSetStore())
    expect(
      registry
        .installed()
        .map((m) => m.id)
        .sort(),
    ).toEqual(['connector.komga', 'connector.opds', 'format.epub'])
    // Only plugins with a real runtime handler are catalogued — no Kavita/Calibre/CBZ vapour stubs.
    expect(
      registry
        .available()
        .map((m) => m.id)
        .sort(),
    ).toEqual(['format.pdf'])
  })

  it('install("format.pdf") is a dynamic import — it never touches globalThis.fetch (ADR-010)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const registry = createAppRegistry(new InMemoryEnabledSetStore(), new InMemoryEnabledSetStore())

    await registry.install('format.pdf')

    expect(registry.isEnabled('format.pdf')).toBe(true)
    expect(fetchSpy).not.toHaveBeenCalled() // "install" loads a bundled chunk, never downloads code
    fetchSpy.mockRestore()
  })

  it('a bundled plugin refuses to be disabled (load-bearing)', () => {
    const registry = createAppRegistry(new InMemoryEnabledSetStore(), new InMemoryEnabledSetStore())
    expect(() => registry.disable('format.epub')).toThrow()
    expect(registry.isEnabled('format.epub')).toBe(true)
  })
})
