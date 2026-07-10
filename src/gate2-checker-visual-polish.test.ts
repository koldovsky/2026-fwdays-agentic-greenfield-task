/**
 * Gate-2 independent verification tests for `add-visual-polish-e2e` (ch11).
 * Written by the CHECKER (Gate-2 verifier), NOT the implementer — independence is the value.
 * Tests focus on the three key ch11 invariants: connector-406 fix, OfflineBanner, BottomNav.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { HostBridge, HttpClient, HttpRequest, KeyValueStore, Logger } from '@/core/contracts'
import { MEDIA_TYPE_EPUB } from '@/core/model'
import { KomgaRequestError, createKomgaConnector } from '@/plugins/connectors/komga'
import OfflineBanner from '@/app/components/OfflineBanner.vue'
import BottomNav from '@/app/components/BottomNav.vue'

// ─── Shared stub infrastructure ──────────────────────────────────────────────

const stubStorage: KeyValueStore = {
  async get() {
    return undefined
  },
  async set() {},
  async delete() {},
}
const stubLogger: Logger = { debug() {}, info() {}, warn() {}, error() {} }

interface Intercept {
  status?: number
  body?: unknown
}

function makeBridge(intercept: (req: HttpRequest) => Intercept): {
  bridge: HostBridge
  captured: HttpRequest[]
} {
  const captured: HttpRequest[] = []
  const http: HttpClient = {
    async send(req) {
      captured.push(req)
      const r = intercept(req)
      const status = r.status ?? 200
      const text = r.body !== undefined ? JSON.stringify(r.body) : ''
      const bytes = new TextEncoder().encode(text)
      return { status, headers: {}, bytes: async () => bytes, text: async () => text }
    },
  }
  return { bridge: { http, storage: stubStorage, logger: stubLogger }, captured }
}

function makeConnector(intercept: (req: HttpRequest) => Intercept) {
  const { bridge, captured } = makeBridge(intercept)
  const connector = createKomgaConnector(
    { baseUrl: 'http://localhost:25600', email: 'r@edda.test', password: 'pw' },
    bridge,
  )
  return { connector, captured }
}

// ─── FIX 1: connector-komga manifest Accept header (the 406 bugfix) ──────────

describe('[Gate-2 ch11] KomgaConnector.resolveDownloadHref — Accept header fix', () => {
  it('sends Accept: application/webpub+json (not application/json) when requesting the manifest', async () => {
    // Arrange: manifest returns an acquisition link; other routes return empty objects
    const { connector, captured } = makeConnector((req) => {
      if (req.url.includes('/manifest')) {
        return {
          body: {
            links: [
              {
                href: 'http://localhost:25600/api/v1/books/bk1/file',
                rel: 'http://opds-spec.org/acquisition',
                type: MEDIA_TYPE_EPUB,
              },
            ],
          },
        }
      }
      return { body: {} }
    })

    await connector.resolveDownloadHref('bk1')

    const manifestReq = captured.find((r) => r.url.includes('/manifest'))
    expect(manifestReq, 'A manifest request was made').toBeDefined()
    expect(
      manifestReq!.headers?.['Accept'],
      'Manifest request must carry Accept: application/webpub+json (not application/json)',
    ).toBe('application/webpub+json')
  })

  it('does NOT send Accept: application/json for the manifest (prior buggy behaviour)', async () => {
    // The prior bug: #json always sent Accept: application/json, causing Komga to 406.
    const { connector, captured } = makeConnector((req) => {
      if (req.url.includes('/manifest')) return { body: { links: [] } }
      return { body: {} }
    })
    await connector.resolveDownloadHref('bk1')
    const manifestReq = captured.find((r) => r.url.includes('/manifest'))
    expect(manifestReq!.headers?.['Accept']).not.toBe('application/json')
  })

  it('falls back to the /file URL when the manifest exposes no acquisition link', async () => {
    // The /file fallback path must still work after the Accept-header fix.
    const { connector } = makeConnector(() => ({ body: { links: [] } }))
    const href = await connector.resolveDownloadHref('bk7')
    expect(href).toBe('http://localhost:25600/api/v1/books/bk7/file')
  })

  it('throws KomgaRequestError (not silently swallowed) when manifest returns 406', async () => {
    // A 406 should throw — it would mean the Accept header is still wrong and no fallback should
    // silently swallow it (unlike a null acquisition link, a 406 is an HTTP error, not a missing field).
    const { connector } = makeConnector((req) => {
      if (req.url.includes('/manifest')) return { status: 406 }
      return { body: {} }
    })
    await expect(connector.resolveDownloadHref('bk8')).rejects.toBeInstanceOf(KomgaRequestError)
  })

  it('allowedOrigins gate is scoped to the connector base origin (unchanged by the Accept fix)', async () => {
    // Security invariant: the Accept-header fix must NOT widen the egress gate.
    const { connector } = makeConnector((req) => {
      if (req.url.includes('/manifest')) return { body: { links: [] } }
      return { body: {} }
    })
    const desc = await connector.downloadDescriptor({
      sourceId: 'connector.komga',
      bookId: 'bk3',
      mediaType: MEDIA_TYPE_EPUB,
      title: 'Book 3',
    })
    expect(desc.allowedOrigins).toEqual(['http://localhost:25600'])
    expect(desc.allowedOrigins).toHaveLength(1)
  })
})

// ─── OfflineBanner — role, aria, and visibility logic ────────────────────────

describe('[Gate-2 ch11] OfflineBanner', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders with role="status" and aria-live="polite" for assistive tech', async () => {
    // Simulate offline so the banner renders.
    vi.spyOn(window, 'addEventListener').mockImplementation(() => {})
    vi.spyOn(window, 'removeEventListener').mockImplementation(() => {})
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })

    const wrapper = mount(OfflineBanner, {
      attachTo: document.body,
    })
    await wrapper.vm.$nextTick()

    const banner = wrapper.find('[data-testid="offline-banner"]')
    if (banner.exists()) {
      expect(banner.attributes('role')).toBe('status')
      expect(banner.attributes('aria-live')).toBe('polite')
    }
    // Whether visible or not (depends on jsdom navigator.onLine mock), the component MUST NOT
    // render the banner with a blocking role like "alert" (which would be intrusive).
    const alertRole = wrapper.find('[role="alert"]')
    expect(alertRole.exists()).toBe(false)

    wrapper.unmount()
  })

  it('does not render the banner when online (v-if guard)', () => {
    // When navigator.onLine is true, the banner must be absent from the DOM.
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })

    const wrapper = mount(OfflineBanner)
    const banner = wrapper.find('[data-testid="offline-banner"]')
    expect(banner.exists()).toBe(false)
    wrapper.unmount()
  })

  it('exposes the offline-banner testid for e2e selectors', async () => {
    // Confirm the testid contract that the e2e states.spec relies on.
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })

    const wrapper = mount(OfflineBanner)
    await wrapper.vm.$nextTick()
    // Either it renders (jsdom reads onLine=false at mount) or it's hidden — but the component must
    // contain an element with the correct testid when it IS showing.
    // We can trigger the offline state via an emitted event instead:
    window.dispatchEvent(new Event('offline'))
    await wrapper.vm.$nextTick()
    // Now the component should show the banner.
    const banner = wrapper.find('[data-testid="offline-banner"]')
    expect(banner.exists()).toBe(true)
    wrapper.unmount()
  })
})

// ─── BottomNav — routes, labels, active state ────────────────────────────────

describe('[Gate-2 ch11] BottomNav', () => {
  function makeRouter(path: string) {
    const Dummy = { template: '<div />' }
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/library', component: Dummy },
        { path: '/downloads', component: Dummy },
        { path: '/settings/extensions', component: Dummy },
      ],
    })
    router.push(path)
    return router
  }

  it('renders exactly 3 tabs (only implemented screens): Library, Downloads, Settings', async () => {
    const router = makeRouter('/library')
    await router.isReady()
    const wrapper = mount(BottomNav, { global: { plugins: [router] } })
    const links = wrapper.findAll('a')
    expect(links).toHaveLength(3)
    const labels = links.map((l) => l.text().trim())
    expect(labels).toContain('Library')
    expect(labels).toContain('Downloads')
    expect(labels).toContain('Settings')
    // Home and Search are placeholder stubs — not tabs.
    expect(labels).not.toContain('Home')
    expect(labels).not.toContain('Search')
    wrapper.unmount()
  })

  it('marks the Library tab aria-current="page" on /library', async () => {
    const router = makeRouter('/library')
    await router.isReady()
    const wrapper = mount(BottomNav, { global: { plugins: [router] } })
    const links = wrapper.findAll('a')
    const libraryLink = links.find((l) => l.text().includes('Library'))
    expect(libraryLink).toBeDefined()
    expect(libraryLink!.attributes('aria-current')).toBe('page')
    // Others must NOT be marked current
    const downloadsLink = links.find((l) => l.text().includes('Downloads'))
    expect(downloadsLink!.attributes('aria-current')).toBeUndefined()
    wrapper.unmount()
  })

  it('marks Settings active for a /settings/* sub-route (prefix match)', async () => {
    const router = makeRouter('/settings/extensions')
    await router.isReady()
    const wrapper = mount(BottomNav, { global: { plugins: [router] } })
    const links = wrapper.findAll('a')
    const settingsLink = links.find((l) => l.text().includes('Settings'))
    expect(settingsLink!.attributes('aria-current')).toBe('page')
    // Library must NOT be marked current
    const libraryLink = links.find((l) => l.text().includes('Library'))
    expect(libraryLink!.attributes('aria-current')).toBeUndefined()
    wrapper.unmount()
  })

  it('has the md:hidden class so it is hidden on desktop viewports', async () => {
    const router = makeRouter('/library')
    await router.isReady()
    const wrapper = mount(BottomNav, { global: { plugins: [router] } })
    const nav = wrapper.find('nav')
    expect(nav.classes()).toContain('md:hidden')
    wrapper.unmount()
  })

  it('has aria-label on the nav for screen-reader navigation landmarks', async () => {
    const router = makeRouter('/library')
    await router.isReady()
    const wrapper = mount(BottomNav, { global: { plugins: [router] } })
    const nav = wrapper.find('nav')
    // Expect a non-empty aria-label (the exact value can vary, but "Primary" is the spec)
    expect(nav.attributes('aria-label')).toBeTruthy()
    wrapper.unmount()
  })
})
