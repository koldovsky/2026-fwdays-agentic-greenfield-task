// A tiny, typed in-process event bus — the host's Observer channel (DESIGN-CONNECTORS.md §8.1). The capability
// dispatcher PUBLISHES `CapabilityMissing` here when an open needs an install; the UI SUBSCRIBES to
// drive the prompt, keeping the (platform-neutral) dispatcher free of any DOM/UI assumption. Platform-
// neutral: no DOM, no `window`, no `fetch` — the future native client re-expresses the identical bus.

import type { PluginManifest, Unsubscribe } from '@/core/contracts'
import type { BookRef } from '@/core/model'

/** Event name: a resource was opened whose format/connector is known but not installed. */
export const CAPABILITY_MISSING_EVENT = 'capability:missing'
/** Event name: a previously-missing capability was just installed (drives retry-after-install). */
export const CAPABILITY_INSTALLED_EVENT = 'capability:installed'

/**
 * Payload of {@link CAPABILITY_MISSING_EVENT}: the resource that could not be opened plus the
 * suggested first-party plugin the prompt offers to install (id, name, version, size, capabilities,
 * permissions — everything screen 07 renders).
 */
export interface CapabilityMissingPayload {
  bookRef: BookRef
  suggestion: PluginManifest
}

/** Payload of {@link CAPABILITY_INSTALLED_EVENT}: the resource whose open should now be retried. */
export interface CapabilityInstalledPayload {
  bookRef: BookRef
  pluginId: string
}

/** The host's event map — each event name to its payload type. Extended as host events are added. */
export interface EddaEvents {
  [CAPABILITY_MISSING_EVENT]: CapabilityMissingPayload
  [CAPABILITY_INSTALLED_EVENT]: CapabilityInstalledPayload
}

/** Publish/subscribe over a typed event map. `on` returns an {@link Unsubscribe} that drops it. */
export interface TypedEventBus<Events> {
  emit<K extends keyof Events>(type: K, payload: Events[K]): void
  on<K extends keyof Events>(type: K, handler: (payload: Events[K]) => void): Unsubscribe
}

/**
 * The default synchronous in-process bus. Handlers fire in subscription order; a throwing handler does
 * not stop the others (its error is reported via the optional `onError` hook, never swallowed silently)
 * — one bad subscriber must not break the dispatch flow. A handler set is snapshotted before emit so a
 * subscribe/unsubscribe during dispatch never mutates the in-flight iteration.
 */
export class SimpleEventBus<Events> implements TypedEventBus<Events> {
  readonly #handlers = new Map<keyof Events, Set<(payload: never) => void>>()
  readonly #onError: (error: unknown) => void

  constructor(options: { onError?: (error: unknown) => void } = {}) {
    this.#onError = options.onError ?? ((error) => console.error('EventBus handler threw', error))
  }

  emit<K extends keyof Events>(type: K, payload: Events[K]): void {
    const handlers = this.#handlers.get(type)
    if (!handlers) return
    for (const handler of [...handlers]) {
      try {
        ;(handler as (payload: Events[K]) => void)(payload)
      } catch (error) {
        this.#onError(error)
      }
    }
  }

  on<K extends keyof Events>(type: K, handler: (payload: Events[K]) => void): Unsubscribe {
    let handlers = this.#handlers.get(type)
    if (!handlers) {
      handlers = new Set()
      this.#handlers.set(type, handlers)
    }
    const typed = handler as (payload: never) => void
    handlers.add(typed)
    return () => {
      handlers.delete(typed)
      if (handlers.size === 0) this.#handlers.delete(type)
    }
  }
}

/** The host event bus this app wires — `SimpleEventBus` over the {@link EddaEvents} map. */
export type EddaEventBus = TypedEventBus<EddaEvents>
