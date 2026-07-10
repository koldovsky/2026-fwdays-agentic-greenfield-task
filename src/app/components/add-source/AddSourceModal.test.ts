import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import type { ProberOutcome } from '@/core/dispatch'
import { KOMGA_CAPABILITIES } from '@/plugins/connectors/komga'
import { OPDS_CAPABILITIES } from '@/plugins/connectors/opds'
import { KOMGA_MANIFEST, OPDS_MANIFEST } from '@/app/plugins-catalog'
import { probeServer } from '@/app/add-source'
import { useSourcesStore } from '@/app/stores/sourcesStore'
import AddSourceModal from './AddSourceModal.vue'

// Keep the real chip/summary derivation; stub only the network-bound prober.
vi.mock('@/app/add-source', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/app/add-source')>()
  return { ...actual, probeServer: vi.fn() }
})

const PROBE_DEBOUNCE = 300

const READY_KOMGA: ProberOutcome = {
  status: 'ready',
  detected: {
    connectorId: 'connector-komga',
    kind: 'komga',
    capabilities: KOMGA_CAPABILITIES,
    manifest: KOMGA_MANIFEST,
  },
}

const READY_OPDS: ProberOutcome = {
  status: 'ready',
  detected: {
    connectorId: 'connector-opds',
    kind: 'opds',
    capabilities: OPDS_CAPABILITIES,
    manifest: OPDS_MANIFEST,
  },
}

const INSTALLABLE_KAVITA: ProberOutcome = {
  status: 'installable',
  detected: {
    connectorId: 'connector-kavita',
    kind: 'kavita',
    capabilities: KOMGA_CAPABILITIES,
    manifest: { ...KOMGA_MANIFEST, id: 'connector-kavita', name: 'Kavita', bundled: false },
  },
}

const UNREACHABLE: ProberOutcome = {
  status: 'unreachable',
  reason: 'Could not reach this address.',
}

let pinia: Pinia

beforeEach(() => {
  pinia = createPinia()
  setActivePinia(pinia)
  vi.mocked(probeServer).mockReset()
})

afterEach(() => {
  vi.useRealTimers()
})

function mountModal(): VueWrapper {
  return mount(AddSourceModal, { props: { open: true }, global: { plugins: [pinia] } })
}

/** Type an address and let the debounced probe resolve to `outcome`. */
async function detect(wrapper: VueWrapper, outcome: ProberOutcome): Promise<void> {
  vi.mocked(probeServer).mockResolvedValue(outcome)
  vi.useFakeTimers()
  await wrapper.find('#add-source-url').setValue('http://localhost:25600')
  await vi.advanceTimersByTimeAsync(PROBE_DEBOUNCE + 50)
  vi.useRealTimers()
  await flushPromises()
}

function buttonByText(wrapper: VueWrapper, text: string) {
  const button = wrapper.findAll('button').find((candidate) => candidate.text().trim() === text)
  if (!button) throw new Error(`No button with text "${text}"`)
  return button
}

describe('AddSourceModal — maket presentation (doc/web/05)', () => {
  it('renders the title, subtitle, 3-step stepper, footer disclosure, and address field', () => {
    const wrapper = mountModal()
    const text = wrapper.text()
    expect(text).toContain('Add a source')
    expect(text).toContain('Connect a server or paste an OPDS feed — we detect the rest.')
    expect(text).toContain('Address')
    expect(text).toContain('Detected')
    expect(text).toContain('Sign in')
    expect(text).toContain('Credentials stored on this device only')
    expect(text).toContain('Cancel')
    expect(text).toContain('Connect')
    expect(wrapper.find('#add-source-url').exists()).toBe(true)
    // Credential fields and detected card are hidden until a server is detected.
    expect(wrapper.find('#add-source-password').exists()).toBe(false)
  })

  it('shows the Reachable indicator, the detected Komga card, and the five derived chips', async () => {
    const wrapper = mountModal()
    await detect(wrapper, READY_KOMGA)

    expect(wrapper.find('[data-testid="reachable"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="adapter-ready"]').exists()).toBe(true)

    const text = wrapper.text()
    expect(text).toContain('Komga server')
    expect(text).toContain('connector.komga') // dot-form display of connector-komga
    expect(text).toContain('bundled')
    expect(text).toContain('opds v2 + rest')
    for (const chip of ['OPDS v2', 'Progress sync', 'Search', 'Page streaming', 'Thumbnails']) {
      expect(text).toContain(chip)
    }
    // Stepper advanced to "Detected".
    expect(wrapper.find('[aria-current="step"]').text()).toContain('2')
    // Sign-in fields revealed.
    expect(wrapper.find('#add-source-username').exists()).toBe(true)
    expect(wrapper.find('#add-source-password').attributes('type')).toBe('password')
  })

  it('derives chips from the advertised capabilities — a bare OPDS feed shows fewer', async () => {
    const wrapper = mountModal()
    await detect(wrapper, READY_OPDS)

    const text = wrapper.text()
    expect(text).toContain('OPDS v2')
    expect(text).toContain('Search')
    expect(text).toContain('Thumbnails')
    // OPDS advertises neither — these chips must be ABSENT (not hard-coded).
    expect(text).not.toContain('Progress sync')
    expect(text).not.toContain('Page streaming')
  })
})

describe('AddSourceModal — Connect gating', () => {
  it('keeps Connect disabled until reachable, ready, AND credentials are entered', async () => {
    const wrapper = mountModal()
    expect(buttonByText(wrapper, 'Connect').attributes('disabled')).toBeDefined()

    await detect(wrapper, READY_KOMGA)
    // Detected but no credentials yet → still disabled.
    expect(buttonByText(wrapper, 'Connect').attributes('disabled')).toBeDefined()

    await wrapper.find('#add-source-username').setValue('reader@edda.test')
    await wrapper.find('#add-source-password').setValue('edda-reader-pw')
    expect(buttonByText(wrapper, 'Connect').attributes('disabled')).toBeUndefined()
  })

  it('Connect persists the source via the sources store and emits "connected"', async () => {
    const store = useSourcesStore()
    const connectSpy = vi
      .spyOn(store, 'connect')
      .mockResolvedValue({} as Awaited<ReturnType<typeof store.connect>>)

    const wrapper = mountModal()
    await detect(wrapper, READY_KOMGA)
    await wrapper.find('#add-source-username').setValue('reader@edda.test')
    await wrapper.find('#add-source-password').setValue('edda-reader-pw')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(connectSpy).toHaveBeenCalledTimes(1)
    expect(connectSpy.mock.calls[0]?.[0]).toMatchObject({
      detected: READY_KOMGA.detected,
      baseUrl: 'http://localhost:25600',
      username: 'reader@edda.test',
      password: 'edda-reader-pw',
    })
    expect(wrapper.emitted('connected')).toBeTruthy()
  })
})

describe('AddSourceModal — installable and unreachable branches', () => {
  it('an installable connector offers Install (not Adapter ready) and keeps Connect disabled', async () => {
    const wrapper = mountModal()
    await detect(wrapper, INSTALLABLE_KAVITA)

    expect(wrapper.text()).toContain('Install Kavita')
    expect(wrapper.find('[data-testid="adapter-ready"]').exists()).toBe(false)
    expect(buttonByText(wrapper, 'Connect').attributes('disabled')).toBeDefined()
  })

  it('an unreachable address shows not-reachable, no detected card, Connect disabled', async () => {
    const wrapper = mountModal()
    await detect(wrapper, UNREACHABLE)

    expect(wrapper.text()).toContain('Not reachable')
    expect(wrapper.text()).not.toContain('Komga server')
    expect(wrapper.find('[data-testid="adapter-ready"]').exists()).toBe(false)
    expect(buttonByText(wrapper, 'Connect').attributes('disabled')).toBeDefined()
  })
})

describe('AddSourceModal — dismissal', () => {
  it('Cancel emits "close" and does NOT connect', async () => {
    const store = useSourcesStore()
    const connectSpy = vi.spyOn(store, 'connect')

    const wrapper = mountModal()
    await buttonByText(wrapper, 'Cancel').trigger('click')

    expect(wrapper.emitted('close')).toBeTruthy()
    expect(connectSpy).not.toHaveBeenCalled()
  })
})
