/**
 * Gate-2 checker: independent acceptance assertions for the add-app-shell spec.
 * Written by the checker agent — a DIFFERENT agent than the one that implemented the code.
 *
 * Coverage focus: gaps in the maker's test suite, not duplicates of what already passes.
 */
import { afterEach, describe, expect, it } from 'vitest'
import { markRaw } from 'vue'
import { pwaManifest } from './pwa-manifest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { PiniaColada } from '@pinia/colada'
import type { Connector, ProgressSyncStrategy } from '@/core/contracts'
import type { BookMeta } from '@/core/model'
import { MEDIA_TYPE_EPUB } from '@/core/model'
import { useLibraryStore } from './stores/libraryStore'
import { shouldBypassSW } from './sw-bypass'
import AppShell from './layouts/AppShell.vue'
import NavSidebar from './components/NavSidebar.vue'
import LibraryView from './views/LibraryView.vue'
import ReaderView from './views/ReaderView.vue'

const ORIGIN = 'https://edda.test'

// Helper — minimal router for shell/sidebar tests.
function makeSettingsRouter(): Router {
  const Dummy = { template: '<div />' }
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/home', component: Dummy },
      { path: '/library', component: Dummy },
      { path: '/search', component: Dummy },
      { path: '/downloads', component: Dummy },
      { path: '/settings/extensions', component: Dummy },
      { path: '/settings/reading', component: Dummy },
      { path: '/settings/general', component: Dummy },
      { path: '/settings/sources/add', component: Dummy },
    ],
  })
}

// ─── shouldBypassSW — additional checker edge cases ───────────────────────────
//
// Maker's tests cover: GET→false, POST→true, Range→true, cross-origin→true.
// Checker adds non-GET methods not tested and the exact plan wording for Range.

describe('shouldBypassSW — checker edge cases (ADR-005)', () => {
  it('returns true for Range: bytes=0-1023 (exact wording from the spec plan)', () => {
    const req = new Request(`${ORIGIN}/book/ch1.epub`, {
      headers: { Range: 'bytes=0-1023' },
    })
    expect(shouldBypassSW(req, ORIGIN)).toBe(true)
  })

  it('returns true for a HEAD request (non-GET)', () => {
    expect(shouldBypassSW(new Request(`${ORIGIN}/healthz`, { method: 'HEAD' }), ORIGIN)).toBe(true)
  })

  it('returns true for a PATCH request (non-GET)', () => {
    expect(shouldBypassSW(new Request(`${ORIGIN}/api/progress`, { method: 'PATCH' }), ORIGIN)).toBe(
      true,
    )
  })

  it('returns true for OPTIONS (preflight — non-GET)', () => {
    expect(shouldBypassSW(new Request(`${ORIGIN}/api`, { method: 'OPTIONS' }), ORIGIN)).toBe(true)
  })

  it('returns true for about:blank (non-http(s) origin ≠ scope origin)', () => {
    // new URL('about:blank').origin === 'null'  ≠  ORIGIN → bypass
    expect(shouldBypassSW(new Request('about:blank'), ORIGIN)).toBe(true)
  })

  it('returns false for a same-origin navigation GET with no Range header', () => {
    expect(shouldBypassSW(new Request(`${ORIGIN}/library`), ORIGIN)).toBe(false)
  })
})

// ─── AppShell — DOM structure ─────────────────────────────────────────────────

describe('AppShell', () => {
  it('renders slotted content inside a <main> element', () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: { template: '<div />' } }],
    })
    const wrapper = mount(AppShell, {
      global: { plugins: [router] },
      slots: { default: '<p data-testid="inner">slot body</p>' },
    })
    const main = wrapper.find('main')
    expect(main.exists()).toBe(true)
    expect(main.html()).toContain('slot body')
  })

  it('renders NavSidebar as an <aside> element within the shell', () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div />' } },
        // sidebar routes
        { path: '/home', component: { template: '<div />' } },
        { path: '/library', component: { template: '<div />' } },
        { path: '/search', component: { template: '<div />' } },
        { path: '/downloads', component: { template: '<div />' } },
        { path: '/settings/sources/add', component: { template: '<div />' } },
        { path: '/settings/extensions', component: { template: '<div />' } },
        { path: '/settings/general', component: { template: '<div />' } },
      ],
    })
    const wrapper = mount(AppShell, {
      global: { plugins: [router] },
      slots: { default: '' },
    })
    expect(wrapper.find('aside').exists()).toBe(true)
  })
})

// ─── ReaderView — full-bleed reader shell (implemented in add-reader-navigation) ──
//
// The placeholder that merely echoed the route params is now the real Reader screen. These checks
// pin its stable shell contract in jsdom (where foliate can't render): full-bleed (no <aside>), the
// top-bar identity from connector metadata, and the "← Library" back control returning to /library.
// The renderer lifecycle (markRaw / destroy) and the two-page render are covered by
// useNavigator.test.ts and the reader e2e respectively.
//
// ADR-013 (reader origin isolation): book content renders only inside a cross-origin frame. In jsdom
// the reader CANNOT establish that frame, so it must FAIL CLOSED — surface an error and render no book
// content (no <foliate-view>, no reader <iframe>) on the app origin. The stub connector's `content()`
// rejects, exercising exactly that path; the assertion below pins "no book content on the app origin".

/** A jsdom-safe stub connector: resolves catalog metadata; `content()` rejects so foliate never loads. */
function makeStubConnector(): Connector {
  const strategy: ProgressSyncStrategy = {
    getProgress: () => Promise.resolve(undefined),
    setProgress: () => Promise.resolve(),
  }
  return {
    id: 'connector-stub',
    progressSync: false,
    probe: () => Promise.resolve(true),
    browse: () => Promise.resolve([]),
    getBook: (ref): Promise<BookMeta> =>
      Promise.resolve({
        title: 'Pride and Prejudice',
        authors: ['Jane Austen'],
        breadcrumb: [ref.bookId],
      }),
    content: () => Promise.reject(new Error('stub: no bytes in jsdom')),
    progressStrategy: () => strategy,
  }
}

function makeReaderRouter(): Router {
  const Dummy = { template: '<div />' }
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/library', component: Dummy },
      { path: '/reader/:sourceId/:bookId/:mediaType', component: ReaderView, props: true },
    ],
  })
}

async function mountReader(): Promise<ReturnType<typeof mount>> {
  const pinia = createPinia()
  const router = makeReaderRouter()
  useLibraryStore(pinia).setConnector(markRaw(makeStubConnector()))
  const wrapper = mount(ReaderView, {
    props: { sourceId: 'home-server', bookId: 'pride-and-prejudice', mediaType: MEDIA_TYPE_EPUB },
    global: { plugins: [pinia, PiniaColada, router] },
  })
  await flushPromises()
  return wrapper
}

describe('ReaderView — full-bleed reader shell', () => {
  // mount() installs the test pinia as the globally-active one; clear it so later suites that rely on
  // no active pinia (the LibraryView empty-state checks) are not polluted.
  afterEach(() => setActivePinia(undefined))

  it('is full-bleed: renders no <aside> (sidebar exclusion is App.vue responsibility)', async () => {
    const wrapper = await mountReader()
    expect(wrapper.find('aside').exists()).toBe(false)
  })

  it('shows the book identity from connector metadata in the top bar', async () => {
    const wrapper = await mountReader()
    expect(wrapper.find('[data-testid="reader-title"]').text()).toBe('Pride and Prejudice')
    // The author line is uppercased by CSS; the DOM text is as authored.
    expect(wrapper.text()).toContain('Jane Austen')
  })

  it('renders the raw foliate mount element and a "← Library" back control', async () => {
    const wrapper = await mountReader()
    expect(wrapper.find('[data-testid="reader-mount"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Library')
  })

  it('FAILS CLOSED in jsdom (ADR-013): renders no book content on the app origin', async () => {
    const wrapper = await mountReader()
    // The reader cannot establish the cross-origin frame here, so it renders NO book content on the app
    // origin — no foliate engine and no reader iframe ever mount where `edda.creds.*` lives.
    expect(wrapper.find('foliate-view').exists()).toBe(false)
    expect(wrapper.find('[data-testid="reader-mount"] iframe').exists()).toBe(false)
  })
})

// ─── LibraryView — acceptance: "Library empty → styled EmptyState (not raw <p>)" ─

describe('LibraryView — empty state acceptance criterion', () => {
  async function mountLibrary(): Promise<ReturnType<typeof mount>> {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/library', component: { template: '<div />' } },
        { path: '/settings/sources/add', component: { template: '<div />' } },
      ],
    })
    await router.push('/library')
    await router.isReady()
    return mount(LibraryView, { global: { plugins: [router] } })
  }

  it('renders an h1 page title with the display font class', async () => {
    const wrapper = await mountLibrary()
    const h1 = wrapper.find('h1')
    expect(h1.exists()).toBe(true)
    expect(h1.text()).toContain('Your library')
    // font-display class from design system
    expect(h1.classes().join(' ')).toContain('font-display')
  })

  it('renders EmptyState as a styled section (h2 title, not a raw bare <p>)', async () => {
    const wrapper = await mountLibrary()
    // EmptyState renders its title in an <h2>
    const h2 = wrapper.find('h2')
    expect(h2.exists()).toBe(true)
    expect(h2.text()).toContain('Connect a source to begin')
    // The EmptyState container has design-system flex layout classes
    expect(wrapper.find('.flex.flex-col.items-center').exists()).toBe(true)
  })

  it('renders an "Add source" call-to-action button in the EmptyState', async () => {
    const wrapper = await mountLibrary()
    // The action slot in EmptyState is a BaseButton
    const button = wrapper.find('button')
    expect(button.exists()).toBe(true)
    expect(button.text()).toContain('Add source')
  })
})

// ─── NavSidebar — Settings active-link coverage ──────────────────────────────
//
// Maker's NavSidebar.test.ts checks the Settings *region* exists on /settings/extensions
// but does NOT verify that the Extensions link within it carries aria-current="page".
// This is the acceptance criterion: "active item aria-current="page"" in settings mode too.

describe('NavSidebar — active link in Settings region', () => {
  it('marks Extensions as aria-current="page" when at /settings/extensions', async () => {
    const router = makeSettingsRouter()
    await router.push('/settings/extensions')
    await router.isReady()
    const wrapper = mount(NavSidebar, { global: { plugins: [router] } })

    const active = wrapper.find('nav a[aria-current="page"]')
    expect(active.exists()).toBe(true)
    expect(active.text()).toContain('Extensions')
  })

  it('does NOT link the unimplemented Reading / General settings stubs', async () => {
    const router = makeSettingsRouter()
    await router.push('/settings/extensions')
    await router.isReady()
    const wrapper = mount(NavSidebar, { global: { plugins: [router] } })

    // Reading and General are placeholder screens ("arrives in a later change"); the Settings region
    // must link only the implemented Extensions screen, never a dead link to a stub.
    expect(wrapper.find('a[href="/settings/reading"]').exists()).toBe(false)
    expect(wrapper.find('a[href="/settings/general"]').exists()).toBe(false)
    expect(wrapper.find('a[href="/settings/extensions"]').exists()).toBe(true)
  })

  it('has SOURCES section absent and Settings section present under /settings/*', async () => {
    const router = makeSettingsRouter()
    await router.push('/settings/general')
    await router.isReady()
    const wrapper = mount(NavSidebar, { global: { plugins: [router] } })

    // Must show "Settings" region header
    expect(wrapper.text()).toContain('Settings')
    // Must NOT show "Sources" region or the Add source link
    expect(wrapper.text()).not.toContain('Sources')
    expect(wrapper.text()).not.toContain('Add source')
  })
})

// ─── PWA manifest — single source of truth (src/app/pwa-manifest.ts) ──────────
//
// The spec requires: theme_color #F0EEE9, display standalone, ≥2 icons, a maskable icon.
// Asserted against the manifest object itself (hermetic — no dependency on `pnpm build`
// or dist/), which is the exact object vite.config.ts feeds to vite-plugin-pwa. The build
// step in the static suite + the e2e manifest fetch cover the produced artifact.

describe('PWA manifest (spec acceptance criterion)', () => {
  it('has theme_color and background_color set to the parchment canvas #F0EEE9', () => {
    expect(pwaManifest.theme_color).toBe('#F0EEE9')
    expect(pwaManifest.background_color).toBe('#F0EEE9')
  })

  it('has display set to standalone (installable PWA)', () => {
    expect(pwaManifest.display).toBe('standalone')
  })

  it('has at least 2 icons (192px + 512px required by the spec)', () => {
    expect(Array.isArray(pwaManifest.icons)).toBe(true)
    expect(pwaManifest.icons?.length ?? 0).toBeGreaterThanOrEqual(2)
  })

  it('includes a maskable icon (PWA best-practice from the plan)', () => {
    const maskable = pwaManifest.icons?.find((ic) => ic.purpose === 'maskable')
    expect(maskable).toBeDefined()
  })
})
