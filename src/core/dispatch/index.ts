// Capability Dispatcher + Server Prober: pick the right plugin for a resource and drive the
// "suggest install" flow when a capability is missing (DESIGN-CONNECTORS.md §7/§8.1). Platform-neutral: it
// sniffs a media type and asks the registry to resolve a handler, but contains NO DOM, `fetch`, or
// `window` — the UI subscribes to the emitted `CapabilityMissing` event and renders the prompt, so the
// native client re-expresses the identical dispatcher.

import type { FormatHandler, Resolution, SniffInput } from '@/core/contracts'
import type { BookRef, MediaType } from '@/core/model'
import { sniff } from '@/core/sniff'
import { CAPABILITY_MISSING_EVENT, type EddaEventBus } from '@/core/event-bus'

// The connector-agnostic "Add a source" detection layer (DESIGN §8.2). Re-exported here so callers
// import the prober from the `core/dispatch` barrel alongside the dispatcher.
export * from './server-prober'

/**
 * The slice of the plugin registry the dispatcher depends on — just format resolution. Typing against
 * this (rather than the concrete `PluginRegistry`) keeps `core/dispatch` decoupled from registry
 * internals and lets tests resolve with a fake. The real `PluginRegistry` satisfies it structurally.
 */
export interface FormatResolver {
  resolveFormat(mediaType: MediaType): Promise<Resolution<FormatHandler>>
}

/** Extra detection signals for a resource that arrives without a trustworthy declared media type. */
export type SniffHint = Pick<SniffInput, 'extension' | 'headBytes'>

/**
 * Turns "open this resource" into a `ready | installable | unsupported` resolution by sniffing the
 * media type and asking the registry to resolve a matching, installed-and-enabled format. On an
 * `installable` result it PUBLISHES a `CapabilityMissing` event (the Observer seam) carrying the
 * suggested manifest; a subscriber renders the install prompt. The dispatcher is STATELESS — the UI
 * retries an open by simply re-issuing {@link openBook} after the install completes (DESIGN §8.1).
 */
export class CapabilityDispatcher {
  readonly #resolver: FormatResolver
  readonly #eventBus: EddaEventBus

  constructor(resolver: FormatResolver, eventBus: EddaEventBus) {
    this.#resolver = resolver
    this.#eventBus = eventBus
  }

  /**
   * Resolve an open request for `bookRef`. The connector-supplied `bookRef.mediaType` is the highest-
   * priority sniff signal; an optional `hint` (extension / head bytes) is a fallback for a resource
   * with no declared type. Emits `CapabilityMissing` as a side effect on `installable`.
   */
  async openBook(bookRef: BookRef, hint: SniffHint = {}): Promise<Resolution<FormatHandler>> {
    const { mediaType } = sniff({ mediaType: bookRef.mediaType, ...hint })
    const resolution = await this.#resolver.resolveFormat(mediaType ?? '')
    if (resolution.status === 'installable') {
      this.#eventBus.emit(CAPABILITY_MISSING_EVENT, { bookRef, suggestion: resolution.suggestion })
    }
    return resolution
  }
}
