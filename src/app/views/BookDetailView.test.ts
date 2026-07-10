import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { markRaw } from 'vue'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { PiniaColada } from '@pinia/colada'
import { MEDIA_TYPE_EPUB } from '@/core/model'
import BookDetailView from './BookDetailView.vue'
import { useLibraryStore } from '@/app/stores/libraryStore'
import FixtureConnector from '@/plugins/connectors/fixture'

// Screen 02 over the in-memory fixture connector (doc/web/02-book-detail-desktop.png). Date is faked (only
// Date — real timers, so the Pinia Colada queries still resolve via microtasks) so the seeded "last read"
// (now − 2h) and "2h ago" stay exact. The maket book is Pride and Prejudice.
const Dummy = { template: '<div />' }
const PINNED_NOW = '2026-06-29T12:00:00.000Z' // P&P seeded last-read = now − 2h ⇒ "2h ago"

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/library', name: 'library', component: Dummy },
      { path: '/book/:sourceId/:bookId', name: 'book', component: Dummy },
      { path: '/reader/:sourceId/:bookId/:mediaType', name: 'reader', component: Dummy },
    ],
  })
}

async function mountDetail({
  sourceId = 'home-server',
  bookId = 'pride-and-prejudice',
  mediaType = MEDIA_TYPE_EPUB,
}: { sourceId?: string; bookId?: string; mediaType?: string } = {}): Promise<{
  wrapper: VueWrapper
  router: Router
}> {
  const pinia = createPinia()
  setActivePinia(pinia)
  useLibraryStore().setConnector(markRaw(new FixtureConnector()))
  const router = makeRouter()
  await router.push('/library')
  await router.isReady()
  const wrapper = mount(BookDetailView, {
    props: { sourceId, bookId, mediaType },
    global: { plugins: [pinia, PiniaColada, router] },
  })
  await flushPromises()
  return { wrapper, router }
}

function findButton(wrapper: VueWrapper, text: string) {
  const button = wrapper.findAll('button').find((b) => b.text().trim() === text)
  if (!button) throw new Error(`No button with text "${text}"`)
  return button
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(PINNED_NOW))
})
afterEach(() => {
  vi.useRealTimers()
})

describe('BookDetailView — identity & metadata (maket book)', () => {
  it('renders the serif title and author from BookMeta', async () => {
    const { wrapper } = await mountDetail()
    const h1 = wrapper.find('h1')
    expect(h1.text()).toBe('Pride and Prejudice')
    expect(h1.classes().join(' ')).toContain('font-display')
    expect(wrapper.text()).toContain('Jane Austen')
  })

  it('renders the maket metadata pills in order', async () => {
    const { wrapper } = await mountDetail()
    const text = wrapper.text()
    expect(text).toContain('1813')
    expect(text).toContain('English')
    expect(text).toContain('432 pages')
    expect(text).toContain('Fiction · Romance')
  })

  it('renders the description paragraph', async () => {
    const { wrapper } = await mountDetail()
    const text = wrapper.text()
    expect(text).toContain('Elizabeth Bennet')
    expect(text).toContain('Regency England.')
  })

  it('renders a monospace browse breadcrumb', async () => {
    const { wrapper } = await mountDetail()
    const crumb = wrapper.find('[data-testid="breadcrumb"]')
    expect(crumb.exists()).toBe(true)
    expect(crumb.text()).toBe('home server / fiction / austen')
    expect(crumb.classes().join(' ')).toContain('font-mono')
  })
})

describe('BookDetailView — progress & per-format cards', () => {
  it('shows the large percentage, the time-left estimate, and the progress bar from the locator', async () => {
    const { wrapper } = await mountDetail()
    const text = wrapper.text()
    expect(text).toContain('38%')
    expect(text).toContain('about 1h 12m left')

    const bar = wrapper.find('[role="progressbar"]')
    expect(bar.exists()).toBe(true)
    expect(bar.attributes('aria-valuenow')).toBe('38')
  })

  it('shows the "Last read … on …" line derived from the locator and a pinned clock', async () => {
    const { wrapper } = await mountDetail()
    expect(wrapper.text()).toContain('Last read 2h ago on Phone')
  })

  it('renders the SYNCED PER FORMAT explainer with the maket text verbatim', async () => {
    const { wrapper } = await mountDetail()
    expect(wrapper.text()).toContain(
      'Your EPUB position (Phone) and the PDF (Desktop) keep separate places — progress is keyed per format.',
    )
  })
})

describe('BookDetailView — chapters section', () => {
  it('shows the chapter count and the graceful placeholder (no TOC before add-format-epub)', async () => {
    const { wrapper } = await mountDetail()
    const text = wrapper.text()
    expect(text).toContain('61 chapters')
    expect(text).toContain('Chapters will be available once the book is opened')
  })
})

describe('BookDetailView — reading actions', () => {
  it('"Continue reading" opens the format-keyed reader route', async () => {
    const { wrapper, router } = await mountDetail()
    await findButton(wrapper, 'Continue reading').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('reader')
    expect(router.currentRoute.value.params).toMatchObject({
      sourceId: 'home-server',
      bookId: 'pride-and-prejudice',
      mediaType: MEDIA_TYPE_EPUB,
    })
  })

  it('Back returns to the originating browse context via router.back()', async () => {
    const { wrapper, router } = await mountDetail()
    const backSpy = vi.spyOn(router, 'back')
    await findButton(wrapper, 'Back').trigger('click')
    expect(backSpy).toHaveBeenCalledTimes(1)
  })
})

describe('BookDetailView — graceful degradation for a sparse book', () => {
  it('a book with no saved progress reads "Start reading" and a not-started card', async () => {
    const { wrapper } = await mountDetail({ sourceId: 'gutenberg', bookId: 'moby-dick' })
    const text = wrapper.text()
    expect(text).toContain('Moby-Dick')
    expect(text).toContain('Start reading')
    expect(text).not.toContain('Continue reading')
    expect(text).not.toContain('Last read')
  })

  it('omits pills for facts the BookMeta does not carry (no gap, no placeholder)', async () => {
    const { wrapper } = await mountDetail({ sourceId: 'gutenberg', bookId: 'moby-dick' })
    const text = wrapper.text()
    // Fallback BookMeta has only title + author → none of the maket pills appear.
    expect(text).not.toContain('1813')
    expect(text).not.toContain('English')
    expect(text).not.toContain('432 pages')
    // No browse breadcrumb on a sparse book.
    expect(wrapper.find('[data-testid="breadcrumb"]').exists()).toBe(false)
  })
})
