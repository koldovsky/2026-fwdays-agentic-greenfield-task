import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import App from './App.vue'

const Library = { template: '<div>library-content</div>' }
const Reader = { template: '<div>reader-content</div>' }

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', redirect: '/library' },
      { path: '/library', component: Library },
      {
        path: '/reader/:sourceId/:bookId/:mediaType',
        component: Reader,
        meta: { fullBleed: true },
      },
    ],
  })
}

async function mountAt(path: string) {
  const router = makeRouter()
  await router.push(path)
  await router.isReady()
  return mount(App, { global: { plugins: [router] } })
}

describe('App shell switch', () => {
  it('wraps a normal route in the sidebar shell', async () => {
    const wrapper = await mountAt('/library')
    expect(wrapper.find('aside').exists()).toBe(true)
    expect(wrapper.text()).toContain('library-content')
  })

  it('renders the reader route full-bleed with no sidebar', async () => {
    const wrapper = await mountAt('/reader/home-server/book-42/epub')
    expect(wrapper.find('aside').exists()).toBe(false)
    expect(wrapper.text()).toContain('reader-content')
  })
})
