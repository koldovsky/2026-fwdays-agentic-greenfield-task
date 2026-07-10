import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import DisplayPanel from './DisplayPanel.vue'
import { useReaderPreferencesStore } from '@/app/stores/readerPreferencesStore'

function mountPanel() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const wrapper = mount(DisplayPanel, { global: { plugins: [pinia] } })
  return { wrapper, store: useReaderPreferencesStore() }
}

beforeEach(() => {
  localStorage.clear()
})

describe('DisplayPanel — composition (matches the maket)', () => {
  it('renders the four theme swatches, three typefaces, the size slider, layout, and three spacings', () => {
    const { wrapper } = mountPanel()
    for (const label of ['Light', 'Sepia', 'Dark', 'Parchment']) {
      expect(wrapper.find(`[aria-label="${label}"]`).exists()).toBe(true)
    }
    for (const label of ['Newsreader', 'Literata', 'Sans']) {
      expect(wrapper.find(`[aria-label="${label}"]`).exists()).toBe(true)
    }
    expect(wrapper.find('input[type="range"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Paged')
    expect(wrapper.text()).toContain('Scroll')
    for (const label of ['Compact', 'Cozy', 'Relaxed']) {
      expect(wrapper.find(`[aria-label="${label}"]`).exists()).toBe(true)
    }
    expect(wrapper.get('[data-testid="text-size-label"]').text()).toBe('17pt')
  })

  it('reflects the active preferences as selected (aria-pressed)', () => {
    const { wrapper } = mountPanel()
    // defaults: Light + Newsreader selected; Dark + Literata not.
    expect(wrapper.get('[aria-label="Light"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[aria-label="Dark"]').attributes('aria-pressed')).toBe('false')
    expect(wrapper.get('[aria-label="Newsreader"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[aria-label="Cozy"]').attributes('aria-pressed')).toBe('true')
  })
})

describe('DisplayPanel — two-way binding (controls drive the store)', () => {
  it('clicking a theme swatch calls the store setter and re-marks selection', async () => {
    const { wrapper, store } = mountPanel()
    await wrapper.get('[aria-label="Dark"]').trigger('click')
    expect(store.theme).toBe('dark')
    expect(wrapper.get('[aria-label="Dark"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[aria-label="Light"]').attributes('aria-pressed')).toBe('false')
  })

  it('clicking a typeface swatch updates the store', async () => {
    const { wrapper, store } = mountPanel()
    await wrapper.get('[aria-label="Literata"]').trigger('click')
    expect(store.typeface).toBe('literata')
  })

  it('moving the slider updates textSizePt and the point label', async () => {
    const { wrapper, store } = mountPanel()
    await wrapper.get('input[type="range"]').setValue('24')
    expect(store.textSizePt).toBe(24)
    expect(wrapper.get('[data-testid="text-size-label"]').text()).toBe('24pt')
  })

  it('selecting Scroll in the layout control updates the store', async () => {
    const { wrapper, store } = mountPanel()
    const scroll = wrapper.findAll('button').find((b) => b.text() === 'Scroll')
    expect(scroll).toBeTruthy()
    await scroll!.trigger('click')
    expect(store.layout).toBe('scroll')
  })

  it('clicking a spacing density updates the store', async () => {
    const { wrapper, store } = mountPanel()
    await wrapper.get('[aria-label="Relaxed"]').trigger('click')
    expect(store.spacing).toBe('relaxed')
  })
})

describe('DisplayPanel — dismissal', () => {
  it('the × control emits close', async () => {
    const { wrapper } = mountPanel()
    await wrapper.get('[aria-label="Close preferences"]').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('tapping the backdrop emits close', async () => {
    const { wrapper } = mountPanel()
    // The backdrop is the decorative dismiss layer behind the sheet.
    await wrapper.get('.bg-ink\\/25').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
