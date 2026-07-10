import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { PiniaColada } from '@pinia/colada'
import LibraryView from './LibraryView.vue'
import KeepReadingCard from '@/app/components/KeepReadingCard.vue'
import RecentlyCoverCard from '@/app/components/RecentlyCoverCard.vue'
import { useLibraryStore } from '@/app/stores/libraryStore'
import FixtureConnector from '@/plugins/connectors/fixture'

const Dummy = { template: '<div />' }

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/library', component: Dummy },
      { path: '/settings/sources/add', component: Dummy },
      // Library cards link to the book detail screen (add-book-detail), so the route must resolve.
      { path: '/book/:sourceId/:bookId', name: 'book', component: Dummy },
    ],
  })
}

async function mountLibrary({
  withConnector = true,
  lastSyncAt,
}: { withConnector?: boolean; lastSyncAt?: number } = {}) {
  const pinia = createPinia()
  setActivePinia(pinia)
  if (withConnector) useLibraryStore().setConnector(new FixtureConnector())
  // The live sync engine sets lastSyncAt post-drain (no fake seed); tests set it to exercise the pill.
  if (lastSyncAt !== undefined) useLibraryStore().lastSyncAt = lastSyncAt
  const router = makeRouter()
  await router.push('/library')
  await router.isReady()
  const wrapper = mount(LibraryView, { global: { plugins: [pinia, PiniaColada, router] } })
  await flushPromises()
  return wrapper
}

function recentTitles(wrapper: Awaited<ReturnType<typeof mountLibrary>>): string[] {
  return wrapper.findAllComponents(RecentlyCoverCard).map((card) => card.props('entry').title)
}

describe('LibraryView — header, counts, search, sync pill', () => {
  it('renders the "Your library" heading (display font) with the maket counts line', async () => {
    const wrapper = await mountLibrary()
    const h1 = wrapper.find('h1')
    expect(h1.text()).toContain('Your library')
    expect(h1.classes().join(' ')).toContain('font-display')
    // "N downloaded for offline" is registry-driven (offline-storage) — zero until a real download lands,
    // matching the e2e demo that grows it from zero. (totalTitles/sources stay the fixture's demo numbers.)
    expect(wrapper.text()).toContain('342 titles · 3 sources · 0 downloaded for offline')
  })

  it('renders the search box with the maket placeholder inside a search form', async () => {
    const wrapper = await mountLibrary()
    expect(wrapper.find('form[role="search"]').exists()).toBe(true)
    const input = wrapper.find('input[type="search"]')
    expect(input.exists()).toBe(true)
    expect(input.attributes('placeholder')).toBe('Search titles, authors…')
  })

  it('renders the "Synced 2m ago" sync pill from the supplied last-sync time', async () => {
    const wrapper = await mountLibrary({ lastSyncAt: Date.now() - 2 * 60 * 1000 })
    expect(wrapper.text()).toContain('Synced 2m ago')
  })

  it('shows "Synced just now" before any drain has set a last-sync time', async () => {
    const wrapper = await mountLibrary()
    expect(wrapper.text()).toContain('Synced just now')
  })
})

describe('LibraryView — Keep reading row', () => {
  it('renders exactly three in-progress cards with the maket readouts and chips', async () => {
    const wrapper = await mountLibrary()
    expect(wrapper.findAllComponents(KeepReadingCard)).toHaveLength(3)

    const text = wrapper.text()
    expect(text).toContain('Keep reading')
    expect(text).toContain('See all')

    // Readouts, per format.
    expect(text).toContain('38% · 1h 12m left')
    expect(text).toContain('page 88 / 192')
    expect(text).toContain('12% · just started')

    // Format · source chips.
    expect(text).toContain('EPUB · komga')
    expect(text).toContain('CBZ · komga')
    expect(text).toContain('PDF · calibre')

    // A series/volume line replaces the author line where present.
    expect(text).toContain('Vol. 4 · R. Okonkwo')
  })
})

describe('LibraryView — Recently added grid', () => {
  it('renders the six recently-added covers with title and author', async () => {
    const wrapper = await mountLibrary()
    expect(wrapper.findAllComponents(RecentlyCoverCard)).toHaveLength(6)

    const text = wrapper.text()
    expect(text).toContain('Recently added')
    for (const title of [
      'Frankenstein',
      'Moby-Dick',
      'Dracula',
      'The Tin Forest',
      'Great Expectations',
      'Jane Eyre',
    ]) {
      expect(text).toContain(title)
    }
    expect(text).toContain('Mary Shelley')
    expect(text).toContain('Charlotte Brontë')
  })
})

describe('LibraryView — local search filter (no network)', () => {
  it('narrows to matching entries and restores the full catalog when cleared', async () => {
    const wrapper = await mountLibrary()
    const input = wrapper.find('input[type="search"]')

    await input.setValue('Frankenstein')
    await flushPromises()
    expect(wrapper.text()).toContain('Frankenstein')
    expect(wrapper.text()).not.toContain('Moby-Dick')
    expect(wrapper.findAllComponents(RecentlyCoverCard)).toHaveLength(1)

    await input.setValue('')
    await flushPromises()
    expect(wrapper.text()).toContain('Moby-Dick')
    expect(wrapper.findAllComponents(RecentlyCoverCard)).toHaveLength(6)
  })
})

describe('LibraryView — grid/list toggle', () => {
  it('defaults to grid and preserves the same entries (and order) when switched to list', async () => {
    const wrapper = await mountLibrary()
    const gridOrder = recentTitles(wrapper)
    expect(gridOrder).toHaveLength(6)

    await wrapper.get('button[aria-label="List"]').trigger('click')
    await flushPromises()
    const listOrder = recentTitles(wrapper)
    expect(listOrder).toEqual(gridOrder)

    await wrapper.get('button[aria-label="Grid"]').trigger('click')
    await flushPromises()
    expect(recentTitles(wrapper)).toEqual(gridOrder)
  })
})

describe('LibraryView — no connector preserves the app-shell empty state', () => {
  it('renders the EmptyState CTA when no Connector is wired into the store', async () => {
    const wrapper = await mountLibrary({ withConnector: false })
    expect(wrapper.find('h1').text()).toContain('Your library')
    expect(wrapper.text()).toContain('Connect a source to begin')
    expect(wrapper.find('button').text()).toContain('Add source')
    expect(wrapper.text()).not.toContain('Keep reading')
  })
})
