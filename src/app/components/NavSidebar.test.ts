import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import NavSidebar from './NavSidebar.vue'
import { useSourcesStore, type SourceRow } from '@/app/stores/sourcesStore'
import { useDownloadsStore } from '@/app/stores/downloadsStore'
import { MEDIA_TYPE_EPUB, type BookRef } from '@/core/model'
import { opfsKeyFor, type DownloadRecord } from '@/platform/web'

function downloadRecord(bookId: string): DownloadRecord {
  const ref: BookRef = { sourceId: 's1', bookId, mediaType: MEDIA_TYPE_EPUB, title: bookId }
  return {
    sourceId: ref.sourceId,
    bookId,
    mediaType: ref.mediaType,
    title: bookId,
    size: 1000,
    state: 'complete',
    downloadedAt: 1,
    opfsKey: opfsKeyFor(ref),
  }
}

const Dummy = { template: '<div />' }

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', redirect: '/library' },
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

async function mountAt(path: string, seed: SourceRow[] = [], downloads: string[] = []) {
  const pinia = createPinia()
  setActivePinia(pinia)
  useSourcesStore().sources = seed
  useDownloadsStore().entries = downloads.map(downloadRecord)
  const router = makeRouter()
  await router.push(path)
  await router.isReady()
  return mount(NavSidebar, { global: { plugins: [router, pinia] } })
}

const SAMPLE_SOURCES: SourceRow[] = [
  { sourceId: 's1', name: 'Komga server', descriptor: 'komga · localhost:25600' },
  { sourceId: 's2', name: 'OPDS feed', descriptor: 'opds · gutenberg.org' },
]

describe('NavSidebar', () => {
  it('renders the wordmark and primary nav (only implemented screens — no Home/Search stubs)', async () => {
    const wrapper = await mountAt('/library')
    expect(wrapper.text()).toContain('Edda')
    expect(wrapper.text()).toContain('Library')
    expect(wrapper.text()).toContain('Downloads')
    // Home and Search are placeholder stubs (not implemented) — they must NOT be linked.
    expect(wrapper.find('a[href="/home"]').exists()).toBe(false)
    expect(wrapper.find('a[href="/search"]').exists()).toBe(false)
  })

  it('drives the Downloads badge from the offline registry count (no hardcoded number)', async () => {
    const downloadsLink = (wrapper: Awaited<ReturnType<typeof mountAt>>) =>
      wrapper.get('a[href="/downloads"]')

    // No downloads → no badge pill at all.
    const empty = await mountAt('/library', [], [])
    expect(downloadsLink(empty).text()).not.toMatch(/\d/)

    // Two downloaded books → the badge shows "2".
    const two = await mountAt('/library', [], ['book-1', 'book-2'])
    expect(downloadsLink(two).text()).toContain('2')
  })

  it('drives the Sources region from the sources store (status dots + monospace descriptors)', async () => {
    const wrapper = await mountAt('/library', SAMPLE_SOURCES)
    expect(wrapper.text()).toContain('Sources')
    expect(wrapper.text()).toContain('Komga server')
    expect(wrapper.text()).toContain('komga · localhost:25600')
    expect(wrapper.text()).toContain('OPDS feed')
    expect(wrapper.text()).toContain('Add source')
    // one green status dot per connected source
    expect(wrapper.findAll('.bg-status').length).toBe(SAMPLE_SOURCES.length)
  })

  it('shows the Sources region with no source rows before any source is connected', async () => {
    const wrapper = await mountAt('/library')
    expect(wrapper.text()).toContain('Sources')
    expect(wrapper.text()).toContain('Add source')
    expect(wrapper.findAll('.bg-status').length).toBe(0)
  })

  it('swaps to the Settings region (no Sources) under /settings, listing only implemented screens', async () => {
    const wrapper = await mountAt('/settings/extensions', SAMPLE_SOURCES)
    expect(wrapper.text()).toContain('Settings')
    expect(wrapper.find('a[href="/settings/extensions"]').exists()).toBe(true)
    // Reading and General are placeholder stubs — not linked.
    expect(wrapper.find('a[href="/settings/reading"]').exists()).toBe(false)
    expect(wrapper.find('a[href="/settings/general"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Komga server')
    expect(wrapper.text()).not.toContain('Add source')
  })

  it('marks the active route with aria-current="page"', async () => {
    const wrapper = await mountAt('/library')
    const active = wrapper.get('nav a[aria-current="page"]')
    expect(active.text()).toContain('Library')
  })
})
