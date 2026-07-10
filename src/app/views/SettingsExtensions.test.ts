import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { InMemoryEnabledSetStore, type PluginRegistry } from '@/core/registry'
import { createAppRegistry } from '@/app/app-registry'
import SettingsExtensions from '@/app/views/SettingsExtensions.vue'

function mountScreen(registry: PluginRegistry) {
  return mount(SettingsExtensions, { props: { registry } })
}

let registry: PluginRegistry

beforeEach(() => {
  // The first-party catalogue (OPDS/Komga/EPUB installed; only the real PDF format available),
  // hermetic via an in-memory enabled set.
  registry = createAppRegistry(new InMemoryEnabledSetStore(), new InMemoryEnabledSetStore())
})

describe('SettingsExtensions — screen composition (doc/web/06)', () => {
  it('renders the heading, subtitle, Host API v1.2 pill, sections, and assurance footer', () => {
    const wrapper = mountScreen(registry)
    expect(wrapper.find('h1').text()).toBe('Extensions')
    expect(wrapper.text()).toContain('Connectors talk to your servers; formats open your books.')
    expect(wrapper.get('[data-testid="host-api-pill"]').text()).toBe('Host API v1.2')
    expect(wrapper.get('[data-testid="installed-heading"]').text()).toContain('Installed · 3')
    expect(wrapper.get('[data-testid="assurance-footer"]').text()).toContain(
      'First-party & sandboxed',
    )
    expect(wrapper.get('[data-testid="assurance-footer"]').text()).toContain(
      'Every extension talks only to the host bridge — no page, no other plugin',
    )
  })

  it('renders the three BUNDLED installed plugins with exact identity + chips', () => {
    const wrapper = mountScreen(registry)

    const opds = wrapper.get('[data-testid="ext-row-connector.opds"]')
    expect(opds.text()).toContain('OPDS')
    expect(opds.text()).toContain('connector.opds · v1.4.0')
    expect(opds.text()).toContain('OPDS 1/2')
    expect(opds.text()).toContain('Always-on fallback')
    expect(opds.get('[data-testid="bundled-tag"]').text()).toBe('Bundled')

    const komga = wrapper.get('[data-testid="ext-row-connector.komga"]')
    expect(komga.text()).toContain('connector.komga · v2.1.0')
    for (const chip of ['Search', 'Progress sync', 'Page streaming', 'Thumbnails']) {
      expect(komga.text()).toContain(chip)
    }

    const epub = wrapper.get('[data-testid="ext-row-format.epub"]')
    expect(epub.text()).toContain('format.epub · v3.0.1')
    for (const chip of ['Reflowable', 'Search', 'TTS', 'CFI locators']) {
      expect(epub.text()).toContain(chip)
    }
  })

  it('renders only the real PDF format as AVAILABLE — no vapour stubs', () => {
    const wrapper = mountScreen(registry)
    const available = wrapper.get('[data-testid="available-section"]').text()

    expect(wrapper.get('[data-testid="avail-format.pdf"]').text()).toContain('format.pdf · 1.2 MB')
    expect(wrapper.get('[data-testid="avail-format.pdf"]').text()).toContain('PDF support')
    expect(wrapper.get('[data-testid="next-up-tag"]').text().toLowerCase()).toContain('next up')
    // The removed Kavita / Calibre / CBZ stubs must NOT render — they have no runtime handler.
    expect(wrapper.find('[data-testid="avail-connector.kavita"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="avail-connector.calibre"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="avail-format.cbz"]').exists()).toBe(false)
    expect(available).not.toContain('Kavita')
    expect(available).not.toContain('Calibre')
  })
})

describe('SettingsExtensions — bundled toggles are non-interactive (load-bearing)', () => {
  it('disables the EPUB toggle and the registry refuses to disable it', async () => {
    const wrapper = mountScreen(registry)
    const toggle = wrapper.get('[data-testid="toggle-format.epub"]')
    expect(toggle.attributes('disabled')).toBeDefined()
    expect(toggle.attributes('aria-checked')).toBe('true')

    // The registry is the source of truth: even a forced disable is refused, so EPUB stays enabled.
    expect(() => registry.disable('format.epub')).toThrow()
    expect(registry.isEnabled('format.epub')).toBe(true)
  })
})

describe('SettingsExtensions — install on demand', () => {
  it('installing PDF moves it from AVAILABLE to INSTALLED (a lazy import, no network code fetch)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const wrapper = mountScreen(registry)
    expect(wrapper.find('[data-testid="ext-row-format.pdf"]').exists()).toBe(false)

    await wrapper.get('[data-testid="install-format.pdf"]').trigger('click')
    // Install dynamic-imports the PDF chunk (a macrotask); wait for it to land, then let the DOM settle.
    await vi.waitFor(() => expect(registry.isEnabled('format.pdf')).toBe(true))
    await flushPromises()

    expect(wrapper.find('[data-testid="ext-row-format.pdf"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="avail-format.pdf"]').exists()).toBe(false)
    expect(fetchSpy).not.toHaveBeenCalled() // install = dynamic import(), never a remote code download
    fetchSpy.mockRestore()
  })
})

describe('SettingsExtensions — disable is reversible, never an uninstall (audit P1)', () => {
  it('toggling an installed plugin off keeps its row under Installed, toggle off, never under Available', async () => {
    const wrapper = mountScreen(registry)
    await wrapper.get('[data-testid="install-format.pdf"]').trigger('click')
    await vi.waitFor(() => expect(registry.isEnabled('format.pdf')).toBe(true))
    await flushPromises()
    expect(wrapper.get('[data-testid="installed-heading"]').text()).toContain('Installed · 4')

    // The user clicks the toggle they just saw — it must still be under their cursor afterward.
    await wrapper.get('[data-testid="toggle-format.pdf"]').trigger('click')
    await flushPromises()

    // Still installed (registry-level truth): disable never uninstalls.
    expect(registry.isInstalled('format.pdf')).toBe(true)
    expect(registry.isEnabled('format.pdf')).toBe(false)
    // The row STAYS in Installed, rendered disabled — it does not bounce back to Available.
    expect(wrapper.get('[data-testid="installed-heading"]').text()).toContain('Installed · 4')
    const row = wrapper.get('[data-testid="ext-row-format.pdf"]')
    expect(row.get('[data-testid="toggle-format.pdf"]').attributes('aria-checked')).toBe('false')
    expect(row.get('[data-testid="toggle-format.pdf"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.find('[data-testid="avail-format.pdf"]').exists()).toBe(false)

    // Flipping it back on re-enables in place — no re-install, no network/chunk reload needed.
    await wrapper.get('[data-testid="toggle-format.pdf"]').trigger('click')
    await flushPromises()
    expect(registry.isEnabled('format.pdf')).toBe(true)
    expect(
      wrapper
        .get('[data-testid="ext-row-format.pdf"]')
        .get('[data-testid="toggle-format.pdf"]')
        .attributes('aria-checked'),
    ).toBe('true')
  })
})
