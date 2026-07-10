import { beforeEach, describe, expect, it, vi } from 'vitest'
import { markRaw } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { InMemoryEnabledSetStore, type PluginRegistry } from '@/core/registry'
import {
  CAPABILITY_INSTALLED_EVENT,
  CAPABILITY_MISSING_EVENT,
  type CapabilityInstalledPayload,
  type EddaEvents,
  SimpleEventBus,
  type TypedEventBus,
} from '@/core/event-bus'
import type { BookRef } from '@/core/model'
import { createAppRegistry } from '@/app/app-registry'
import { PDF_MANIFEST } from '@/app/plugins-catalog'
import CapabilityMissingModal from '@/app/components/CapabilityMissingModal.vue'

const bookRef: BookRef = {
  sourceId: 'home',
  bookId: 'dorian-gray',
  mediaType: 'application/pdf',
  title: 'The Picture of Dorian Gray',
}

let registry: PluginRegistry
let eventBus: TypedEventBus<EddaEvents>

beforeEach(() => {
  registry = createAppRegistry(new InMemoryEnabledSetStore(), new InMemoryEnabledSetStore())
  eventBus = markRaw(new SimpleEventBus<EddaEvents>())
})

function mountModal(onDownload = vi.fn()) {
  return mount(CapabilityMissingModal, { props: { registry, eventBus, onDownload } })
}

function emitMissing(): void {
  eventBus.emit(CAPABILITY_MISSING_EVENT, { bookRef, suggestion: PDF_MANIFEST })
}

describe('CapabilityMissingModal — matches doc/web/07', () => {
  it('renders every string, chip, and action from the maket when CapabilityMissing fires', async () => {
    const wrapper = mountModal()
    emitMissing()
    await flushPromises()

    const text = wrapper.get('[data-testid="capability-missing-modal"]').text()
    expect(text).toContain('Install PDF support?')
    expect(text).toContain(
      '“The Picture of Dorian Gray” is a PDF, and that format isn’t installed yet.',
    )
    expect(text).toContain('Add it and Edda will open the book right away')
    expect(wrapper.get('[data-testid="capability-card-id"]').text()).toContain(
      'format.pdf · v1.0.3 · 1.2 MB',
    )
    for (const chip of ['Fixed layout', 'Search', 'Text selection']) {
      expect(text).toContain(chip)
    }
    expect(text).toContain('No network access')
    expect(text).toContain('Runs sandboxed')
    expect(wrapper.get('[data-testid="capability-install"]').text()).toContain('Install & open')
    expect(wrapper.get('[data-testid="capability-decline"]').text()).toBe(
      'Not now — download the file instead',
    )
    expect(text).toContain('first-party extension · installs in ~2s, then retries open')
  })

  it('does not render until a CapabilityMissing event arrives', () => {
    const wrapper = mountModal()
    expect(wrapper.find('[data-testid="capability-card-id"]').exists()).toBe(false)
  })
})

describe('CapabilityMissingModal — install & open', () => {
  it('installs the suggested plugin and emits CapabilityInstalled to retry the open (no code fetch)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const installed: CapabilityInstalledPayload[] = []
    eventBus.on(CAPABILITY_INSTALLED_EVENT, (payload) => installed.push(payload))

    const wrapper = mountModal()
    emitMissing()
    await flushPromises()

    await wrapper.get('[data-testid="capability-install"]').trigger('click')
    await vi.waitFor(() => expect(registry.isEnabled('format.pdf')).toBe(true))
    await flushPromises()

    expect(installed).toHaveLength(1)
    expect(installed[0]?.bookRef.bookId).toBe('dorian-gray')
    expect(installed[0]?.pluginId).toBe('format.pdf')
    expect(fetchSpy).not.toHaveBeenCalled() // install = dynamic import(), never a remote code download
    // The prompt closes after install.
    expect(wrapper.find('[data-testid="capability-card-id"]').exists()).toBe(false)
    fetchSpy.mockRestore()
  })
})

describe('CapabilityMissingModal — honest copy for an installed-but-disabled format (audit P1)', () => {
  it('says "turn back on", not "install", when the format was already installed and then disabled', async () => {
    await registry.install('format.pdf')
    registry.disable('format.pdf')
    expect(registry.isEnabled('format.pdf')).toBe(false)

    const wrapper = mountModal()
    emitMissing()
    await flushPromises()

    const text = wrapper.get('[data-testid="capability-missing-modal"]').text()
    expect(text).toContain('Turn PDF support back on?')
    expect(text).toContain(
      '“The Picture of Dorian Gray” is a PDF, and PDF support is currently turned off.',
    )
    expect(text).not.toContain('isn’t installed yet') // it IS installed — never claim otherwise
    expect(wrapper.get('[data-testid="capability-install"]').text()).toContain('Turn on & open')
    expect(text).toContain('turns back on instantly, then retries open')
  })

  it('re-enabling via the prompt does not re-run the loader (the chunk is already cached)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    await registry.install('format.pdf')
    registry.disable('format.pdf')

    const wrapper = mountModal()
    emitMissing()
    await flushPromises()

    await wrapper.get('[data-testid="capability-install"]').trigger('click')
    await vi.waitFor(() => expect(registry.isEnabled('format.pdf')).toBe(true))
    await flushPromises()

    expect(registry.isInstalled('format.pdf')).toBe(true)
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})

describe('CapabilityMissingModal — decline degrades to download', () => {
  it('"Not now" calls the download handler, never installs, and closes', async () => {
    const onDownload = vi.fn()
    const wrapper = mountModal(onDownload)
    emitMissing()
    await flushPromises()

    await wrapper.get('[data-testid="capability-decline"]').trigger('click')
    await flushPromises()

    expect(onDownload).toHaveBeenCalledExactlyOnceWith(bookRef)
    expect(registry.isEnabled('format.pdf')).toBe(false) // not installed
    expect(wrapper.find('[data-testid="capability-card-id"]').exists()).toBe(false)
  })
})
