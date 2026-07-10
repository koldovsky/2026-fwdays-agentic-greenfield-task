import { describe, expect, it, vi } from 'vitest'
import type { PluginManifest } from '@/core/contracts'
import type { BookRef } from '@/core/model'
import {
  CAPABILITY_MISSING_EVENT,
  type CapabilityMissingPayload,
  type EddaEvents,
  SimpleEventBus,
} from '@/core/event-bus'

const bookRef: BookRef = {
  sourceId: 's',
  bookId: 'dorian-gray',
  mediaType: 'application/pdf',
  title: 'The Picture of Dorian Gray',
}
const suggestion = { id: 'format.pdf', name: 'PDF support' } as PluginManifest
const payload: CapabilityMissingPayload = { bookRef, suggestion }

describe('SimpleEventBus', () => {
  it('delivers an emitted payload to a registered subscriber', () => {
    const bus = new SimpleEventBus<EddaEvents>()
    const handler = vi.fn()
    bus.on(CAPABILITY_MISSING_EVENT, handler)
    bus.emit(CAPABILITY_MISSING_EVENT, payload)
    expect(handler).toHaveBeenCalledExactlyOnceWith(payload)
  })

  it('an unsubscribed listener receives nothing', () => {
    const bus = new SimpleEventBus<EddaEvents>()
    const handler = vi.fn()
    const off = bus.on(CAPABILITY_MISSING_EVENT, handler)
    off()
    bus.emit(CAPABILITY_MISSING_EVENT, payload)
    expect(handler).not.toHaveBeenCalled()
  })

  it('delivers to every subscriber in order', () => {
    const bus = new SimpleEventBus<EddaEvents>()
    const calls: number[] = []
    bus.on(CAPABILITY_MISSING_EVENT, () => calls.push(1))
    bus.on(CAPABILITY_MISSING_EVENT, () => calls.push(2))
    bus.emit(CAPABILITY_MISSING_EVENT, payload)
    expect(calls).toEqual([1, 2])
  })

  it('a throwing subscriber does not stop the others (error reported, not swallowed)', () => {
    const onError = vi.fn()
    const bus = new SimpleEventBus<EddaEvents>({ onError })
    const after = vi.fn()
    bus.on(CAPABILITY_MISSING_EVENT, () => {
      throw new Error('boom')
    })
    bus.on(CAPABILITY_MISSING_EVENT, after)
    bus.emit(CAPABILITY_MISSING_EVENT, payload)
    expect(after).toHaveBeenCalledOnce()
    expect(onError).toHaveBeenCalledOnce()
  })

  it('unsubscribing during dispatch does not corrupt the in-flight iteration', () => {
    const bus = new SimpleEventBus<EddaEvents>()
    const second = vi.fn()
    const off = bus.on(CAPABILITY_MISSING_EVENT, () => off())
    bus.on(CAPABILITY_MISSING_EVENT, second)
    expect(() => bus.emit(CAPABILITY_MISSING_EVENT, payload)).not.toThrow()
    expect(second).toHaveBeenCalledOnce()
  })
})
