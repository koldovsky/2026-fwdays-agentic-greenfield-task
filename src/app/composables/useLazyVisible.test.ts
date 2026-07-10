import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, effectScope, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { useLazyVisible } from '@/app/composables/useLazyVisible'

/** A test double standing in for the real `IntersectionObserver`, with a way to fire an intersection. */
class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = []
  callback: IntersectionObserverCallback
  observed: Element[] = []
  disconnected = false
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
    FakeIntersectionObserver.instances.push(this)
  }
  observe(el: Element): void {
    this.observed.push(el)
  }
  disconnect(): void {
    this.disconnected = true
  }
  unobserve(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
  fireIntersecting(el: Element): void {
    this.callback(
      [{ isIntersecting: true, target: el } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    )
  }
}

describe('useLazyVisible', () => {
  let originalIO: typeof IntersectionObserver | undefined

  beforeEach(() => {
    FakeIntersectionObserver.instances = []
    originalIO = globalThis.IntersectionObserver
    globalThis.IntersectionObserver =
      FakeIntersectionObserver as unknown as typeof IntersectionObserver
  })
  afterEach(() => {
    if (originalIO === undefined) {
      // @ts-expect-error — restoring the "not implemented in this environment" state some suites rely on.
      delete globalThis.IntersectionObserver
    } else {
      globalThis.IntersectionObserver = originalIO
    }
    vi.restoreAllMocks()
  })

  it('starts false and flips true (and disconnects) once the element intersects', async () => {
    const el = ref<HTMLElement | null>(null)
    let visible: ReturnType<typeof useLazyVisible> | undefined
    const Comp = defineComponent({
      setup() {
        visible = useLazyVisible(el)
        return () => h('div', { ref: el })
      },
    })
    const wrapper = mount(Comp)
    await nextTick()

    expect(visible?.value).toBe(false)
    const observer = FakeIntersectionObserver.instances[0]
    expect(observer).toBeDefined()
    expect(observer?.observed).toHaveLength(1)

    observer?.fireIntersecting(el.value as HTMLElement)
    expect(visible?.value).toBe(true)
    expect(observer?.disconnected).toBe(true)

    wrapper.unmount()
  })

  it('disconnects the observer on unmount even if never intersected', () => {
    const el = ref<HTMLElement | null>(null)
    const Comp = defineComponent({
      setup() {
        useLazyVisible(el)
        return () => h('div', { ref: el })
      },
    })
    const wrapper = mount(Comp)
    const observer = FakeIntersectionObserver.instances[0]
    wrapper.unmount()
    expect(observer?.disconnected).toBe(true)
  })

  it('falls open (true immediately) when IntersectionObserver is unavailable', async () => {
    // @ts-expect-error — simulate an environment without the API.
    delete globalThis.IntersectionObserver
    const el = ref<HTMLElement | null>(null)
    const scope = effectScope()
    const visible = scope.run(() => useLazyVisible(el))
    await nextTick()
    expect(visible?.value).toBe(true)
    scope.stop()
  })
})
