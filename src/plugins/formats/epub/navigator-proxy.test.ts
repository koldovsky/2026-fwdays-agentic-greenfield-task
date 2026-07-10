// Unit + conformance tests for the app-side navigator PROXY (ADR-013). foliate cannot render in jsdom,
// so the cross-origin frame is faked at the bridge seam: a loopback MessageChannel lets the test play
// "the reader frame" on port2 and assert the proxy's behaviour on port1. What's under test is the PROXY
// contract — fail-closed config, command forwarding, event mapping, markRaw-safety, idempotent teardown,
// the unexpected-origin window guard, and that NO credential / DOM ever crosses the bridge.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isReactive, markRaw } from 'vue'
import type { Locator, Publication } from '@/core/model'
import { MEDIA_TYPE_EPUB } from '@/core/model'
import type { PublicationSource } from '@/core/contracts'
import { publicationSourceFromBytes } from '@/core/contracts'
import { READER_INIT } from '@/platform/web/reader-frame/protocol'
import { createEpubNavigatorProxy } from './navigator-proxy'

const READER_ORIGIN = 'http://localhost:5174'

const PUBLICATION: Publication = {
  metadata: { title: 'Pride and Prejudice' },
  readingOrder: [
    { href: 'ch1.xhtml', type: MEDIA_TYPE_EPUB, locations: { position: 1 } },
    { href: 'ch2.xhtml', type: MEDIA_TYPE_EPUB, locations: { position: 2 } },
  ],
}

interface PortMessage {
  type: string
  [key: string]: unknown
}

/** A loopback MessagePort: postMessage on one end is delivered (async) to the peer's `onmessage`. */
class FakePort {
  peer!: FakePort
  onmessage: ((event: MessageEvent) => void) | null = null
  started = false
  closed = false
  readonly posted: Array<{ data: PortMessage; transfer?: Transferable[] }> = []
  private queued: PortMessage[] = []

  postMessage(data: PortMessage, transfer?: Transferable[]): void {
    this.posted.push({ data, transfer })
    this.peer.deliver(data)
  }
  deliver(data: PortMessage): void {
    if (this.closed) return
    if (this.started && this.onmessage)
      queueMicrotask(() => this.onmessage?.({ data } as MessageEvent))
    else this.queued.push(data)
  }
  start(): void {
    this.started = true
    const pending = this.queued
    this.queued = []
    for (const data of pending) queueMicrotask(() => this.onmessage?.({ data } as MessageEvent))
  }
  close(): void {
    this.closed = true
  }
  addEventListener(): void {}
  removeEventListener(): void {}
}

class FakeMessageChannel {
  static instances: FakeMessageChannel[] = []
  readonly port1 = new FakePort()
  readonly port2 = new FakePort()
  constructor() {
    this.port1.peer = this.port2
    this.port2.peer = this.port1
    FakeMessageChannel.instances.push(this)
  }
}

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

/** Drive the proxy past the iframe `load` + `ready` handshake, the test acting as the reader frame. */
async function openProxy(options?: {
  /** Custom frame command handler (defaults to: reply `ready` to open, ack everything else). */
  frame?: (port: FakePort, command: PortMessage) => void
  source?: PublicationSource
}): Promise<{
  navigator: Awaited<ReturnType<typeof createEpubNavigatorProxy>>
  channel: FakeMessageChannel
  iframe: HTMLIFrameElement
  mount: HTMLElement
  initPosts: Array<{ message: unknown; targetOrigin: string; transfer: Transferable[] }>
}> {
  const mount = document.createElement('div')
  document.body.append(mount)
  const source: PublicationSource =
    options?.source ?? publicationSourceFromBytes(new Uint8Array([1, 2, 3]))

  const promise = createEpubNavigatorProxy(PUBLICATION, mount, { source })
  await flush() // let `await sourceToTransferBuffer` resolve and the iframe/channel be created

  const channel = FakeMessageChannel.instances.at(-1)
  if (!channel) throw new Error('no channel created')
  const iframe = mount.querySelector('iframe')
  if (!iframe) throw new Error('no iframe created')

  // Capture the window-level init handshake (and stop jsdom choking on transferring a fake port).
  const initPosts: Array<{ message: unknown; targetOrigin: string; transfer: Transferable[] }> = []
  Object.defineProperty(iframe, 'contentWindow', {
    configurable: true,
    value: {
      postMessage: (message: unknown, targetOrigin: string, transfer: Transferable[]) => {
        initPosts.push({ message, targetOrigin, transfer })
      },
    },
  })

  const frame =
    options?.frame ??
    ((port: FakePort, command: PortMessage) => {
      if (command.type === 'open') {
        port.postMessage({
          type: 'ready',
          publication: PUBLICATION,
          locator: PUBLICATION.readingOrder[0],
          pageCount: 42,
        })
      } else if (command.type !== 'destroy') {
        port.postMessage({ type: 'result', id: command.id, ok: true })
      }
    })
  channel.port2.onmessage = (event: MessageEvent) => frame(channel.port2, event.data as PortMessage)
  channel.port2.start()

  iframe.dispatchEvent(new Event('load'))
  const navigator = await promise
  return { navigator, channel, iframe, mount, initPosts }
}

describe('createEpubNavigatorProxy', () => {
  beforeEach(() => {
    FakeMessageChannel.instances = []
    vi.stubGlobal('MessageChannel', FakeMessageChannel)
    vi.stubEnv('VITE_READER_ORIGIN', READER_ORIGIN)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    document.body.replaceChildren()
  })

  it('FAILS CLOSED when the reader origin is not configured (never same-origin)', async () => {
    vi.stubEnv('VITE_READER_ORIGIN', '')
    const mount = document.createElement('div')
    await expect(
      createEpubNavigatorProxy(PUBLICATION, mount, {
        source: publicationSourceFromBytes(new Uint8Array([1])),
      }),
    ).rejects.toThrow('Reader origin is not configured')
    // Nothing was rendered onto the app origin.
    expect(mount.querySelector('iframe')).toBeNull()
  })

  it('embeds a CROSS-ORIGIN iframe (no sandbox) and hands the frame its port with an explicit targetOrigin', async () => {
    const { iframe, initPosts } = await openProxy()
    expect(iframe.getAttribute('src')).toBe(READER_ORIGIN)
    expect(iframe.getAttribute('sandbox')).toBeNull() // the real cross-origin URL IS the isolation
    expect(initPosts).toHaveLength(1)
    expect(initPosts[0]?.message).toEqual({ type: READER_INIT })
    // targetOrigin is the reader origin — NEVER '*'.
    expect(initPosts[0]?.targetOrigin).toBe(READER_ORIGIN)
    expect(initPosts[0]?.targetOrigin).not.toBe('*')
  })

  it('is safe to markRaw (ADR-001): the returned proxy is non-reactive', async () => {
    const { navigator } = await openProxy()
    expect(isReactive(markRaw(navigator))).toBe(false)
    expect(navigator.currentLocator().href).toBe('ch1.xhtml')
    expect(navigator.pageCount()).toBe(42)
  })

  it('forwards each command over the port and resolves on its result', async () => {
    const commands: PortMessage[] = []
    const { navigator, channel } = await openProxy({
      frame: (port, command) => {
        if (command.type === 'open') {
          port.postMessage({
            type: 'ready',
            publication: PUBLICATION,
            locator: PUBLICATION.readingOrder[0],
          })
          return
        }
        commands.push(command)
        port.postMessage({ type: 'result', id: command.id, ok: true })
      },
    })
    const target = PUBLICATION.readingOrder[1]!
    await navigator.goTo(target)
    await navigator.next()
    await navigator.prev()
    await navigator.seek(0.5)

    expect(commands.map((c) => c.type)).toEqual(['goTo', 'next', 'prev', 'seek'])
    expect(commands[0]?.locator).toEqual(target)
    expect(commands[3]?.fraction).toBe(0.5)
    expect(channel.port1.posted.some((p) => p.data.type === 'open')).toBe(true)
  })

  it('maps a frame locatorChanged to currentLocator + a subscriber callback', async () => {
    const { navigator, channel } = await openProxy()
    const seen: Locator[] = []
    navigator.on('locatorChanged', (detail) => seen.push(detail as Locator))

    const moved: Locator = {
      href: 'ch2.xhtml',
      type: MEDIA_TYPE_EPUB,
      locations: { position: 2, totalProgression: 0.5 },
    }
    channel.port2.postMessage({ type: 'locatorChanged', locator: moved, pageCount: 99 })
    await flush()

    expect(navigator.currentLocator()).toEqual(moved)
    expect(navigator.pageCount()).toBe(99)
    expect(seen).toEqual([moved])
  })

  it('ignores ALL window messages — even from the reader origin (M1: port-only, no spoof seam)', async () => {
    const { navigator, channel } = await openProxy()
    const moved: Locator = { href: 'ch2.xhtml', type: MEDIA_TYPE_EPUB, locations: { position: 2 } }

    // A book script is same-origin to the READER origin, so it could `window.top.postMessage` a forged
    // event from there. The app keeps NO window listener, so even a reader-origin window message is
    // ignored — the locator does not move.
    for (const origin of ['http://evil.test', READER_ORIGIN]) {
      window.dispatchEvent(
        new MessageEvent('message', { origin, data: { type: 'locatorChanged', locator: moved } }),
      )
    }
    await flush()
    expect(navigator.currentLocator().href).toBe('ch1.xhtml') // unchanged — neither acted

    // The capability PORT (handed only to the frame) is the sole channel that moves the locator.
    channel.port2.postMessage({ type: 'locatorChanged', locator: moved })
    await flush()
    expect(navigator.currentLocator().href).toBe('ch2.xhtml')
  })

  it('tears down exactly once: removes the iframe, closes the port, posts destroy, drops subscriptions', async () => {
    const { navigator, channel, iframe, mount } = await openProxy()
    const seen: Locator[] = []
    navigator.on('locatorChanged', (detail) => seen.push(detail as Locator))

    navigator.destroy()
    expect(mount.querySelector('iframe')).toBeNull()
    expect(iframe.isConnected).toBe(false)
    expect(channel.port1.closed).toBe(true)
    expect(channel.port1.posted.some((p) => p.data.type === 'destroy')).toBe(true)

    // A second teardown is a no-op (no second destroy posted).
    const destroyCount = channel.port1.posted.filter((p) => p.data.type === 'destroy').length
    navigator.destroy()
    expect(channel.port1.posted.filter((p) => p.data.type === 'destroy').length).toBe(destroyCount)

    // Post-teardown events reach no subscriber.
    channel.port2.postMessage({
      type: 'locatorChanged',
      locator: { href: 'ch2.xhtml', type: MEDIA_TYPE_EPUB },
    })
    await flush()
    expect(seen).toEqual([])
  })
})

// ─── Conformance (6.2): no credential / DOM ever crosses the bridge ──────────────────────────────────

describe('navigator-proxy bridge payloads (conformance)', () => {
  beforeEach(() => {
    FakeMessageChannel.instances = []
    vi.stubGlobal('MessageChannel', FakeMessageChannel)
    vi.stubEnv('VITE_READER_ORIGIN', READER_ORIGIN)
    localStorage.setItem('edda.creds.test', 'SUPER-SECRET-TOKEN')
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    localStorage.clear()
    document.body.replaceChildren()
  })

  it('carries ONLY neutral data — no `edda.creds.*` value appears in any posted payload', async () => {
    const { navigator, channel, initPosts } = await openProxy()
    await navigator.goTo(PUBLICATION.readingOrder[1]!)
    navigator.applyPreferences({ theme: 'sepia', textSizePt: 22 })
    await flush()

    const payloads: unknown[] = [
      ...channel.port1.posted.map((p) => p.data),
      ...initPosts.map((p) => p.message),
    ]
    // Stringify every payload, rendering an ArrayBuffer as a marker (JSON.stringify drops it otherwise).
    const serialized = JSON.stringify(payloads, (_key, value) =>
      value instanceof ArrayBuffer ? `[ArrayBuffer ${value.byteLength}]` : value,
    )
    expect(serialized).not.toContain('SUPER-SECRET-TOKEN')
    expect(serialized).not.toContain('edda.creds')
  })

  it('the `open` payload carries the book bytes as a transferred ArrayBuffer and nothing secret', async () => {
    const { channel } = await openProxy({
      source: publicationSourceFromBytes(new Uint8Array([80, 75, 3, 4])),
    })
    const open = channel.port1.posted.find((p) => p.data.type === 'open')
    expect(open).toBeTruthy()
    expect(open?.data.buffer).toBeInstanceOf(ArrayBuffer)
    // The buffer is in the transfer list (zero-copy, ADR-005) — not a structured-clone of app memory.
    expect(open?.transfer).toContain(open?.data.buffer)
    // No DOM node / credential rides along — the only fields are id/type, the buffer, and (optional) prefs.
    const keys = Object.keys(open?.data ?? {}).sort()
    expect(keys).toEqual(['buffer', 'id', 'preferences', 'type'])
  })
})
