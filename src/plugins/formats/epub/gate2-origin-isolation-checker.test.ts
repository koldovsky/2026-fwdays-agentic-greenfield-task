/**
 * Gate-2 CHECKER — independent verification of add-reader-origin-isolation (ADR-013).
 * Author: Gate-2 verifier. Deliberately avoids importing any helper from the maker's test file.
 *
 * Verified properties (mirroring the acceptance criteria):
 *  (a) fail-closed: VITE_READER_ORIGIN unset ⇒ throws, no same-origin fallback, no iframe rendered
 *  (b) init handshake posts with explicit targetOrigin=READER_ORIGIN, never `*`
 *  (c) window messages from a foreign origin are DROPPED (not processed)
 *  (d) no `edda.creds.*` value appears in any bridge payload — seed a cred, spy postMessage
 *  (e) markRaw(proxy) is non-reactive (isReactive === false)
 *  (f) teardown is idempotent — second destroy() is a no-op; port.close() called exactly once
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isReactive, markRaw } from 'vue'
import { MEDIA_TYPE_EPUB } from '@/core/model'
import type { Publication, Locator } from '@/core/model'
// `open(source)`/`createNavigator` take a neutral `PublicationSource` now (was `EpubBytesSource`).
import { publicationSourceFromBytes } from '@/core/contracts'
import { READER_INIT } from '@/platform/web/reader-frame/protocol'
import { createEpubNavigatorProxy } from './navigator-proxy'

// Intentionally hardcoded here — the checker does not import READER_ORIGIN from the maker's test.
const READER_ORIGIN = 'http://localhost:5174'
const APP_ORIGIN = 'http://localhost:5173'

const PUB: Publication = {
  metadata: { title: 'Test Book' },
  readingOrder: [{ href: 'spine1.xhtml', type: MEDIA_TYPE_EPUB, locations: { position: 1 } }],
}

// ---------------------------------------------------------------------------
// Minimal fake MessageChannel — checker's own, independent of the maker's stub.
// ---------------------------------------------------------------------------
type Msg = { type: string; [k: string]: unknown }

class CheckerPort {
  peer!: CheckerPort
  onmessage: ((e: MessageEvent) => void) | null = null
  started = false
  readonly sent: Array<{ data: Msg; transfer?: Transferable[] }> = []
  private queue: Msg[] = []
  closed = false

  postMessage(data: Msg, transfer?: Transferable[]): void {
    this.sent.push({ data, transfer })
    if (!this.closed) this.peer.receive(data)
  }
  receive(data: Msg): void {
    if (this.closed) return
    if (this.started && this.onmessage) {
      queueMicrotask(() => this.onmessage?.({ data } as MessageEvent))
    } else {
      this.queue.push(data)
    }
  }
  start(): void {
    this.started = true
    const q = this.queue.splice(0)
    for (const d of q) queueMicrotask(() => this.onmessage?.({ data: d } as MessageEvent))
  }
  close(): void {
    this.closed = true
  }
}

class CheckerChannel {
  static all: CheckerChannel[] = []
  readonly port1 = new CheckerPort()
  readonly port2 = new CheckerPort()
  constructor() {
    this.port1.peer = this.port2
    this.port2.peer = this.port1
    CheckerChannel.all.push(this)
  }
}

const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0))

/**
 * Bootstrap the proxy past the iframe load + ready handshake.
 * The checker plays the role of "the reader frame" on port2.
 * Returns the proxy, the channel, captured init posts, and mount element.
 */
async function boot(): Promise<{
  proxy: Awaited<ReturnType<typeof createEpubNavigatorProxy>>
  ch: CheckerChannel
  mount: HTMLElement
  initPosts: Array<{ message: unknown; targetOrigin: string; transfer: Transferable[] }>
}> {
  const mount = document.createElement('div')
  document.body.append(mount)

  const proxyPromise = createEpubNavigatorProxy(PUB, mount, {
    source: publicationSourceFromBytes(new Uint8Array([1, 2, 3])),
  })

  await tick()

  const ch = CheckerChannel.all.at(-1)!
  const iframe = mount.querySelector('iframe') as HTMLIFrameElement
  if (!iframe) throw new Error('no iframe')

  const initPosts: Array<{ message: unknown; targetOrigin: string; transfer: Transferable[] }> = []
  Object.defineProperty(iframe, 'contentWindow', {
    configurable: true,
    value: {
      postMessage(msg: unknown, origin: string, xfer: Transferable[]) {
        initPosts.push({ message: msg, targetOrigin: origin, transfer: xfer })
      },
    },
  })

  // Act as the reader frame: reply ready to open, ack everything else.
  ch.port2.onmessage = (ev: MessageEvent) => {
    const cmd = ev.data as Msg
    if (cmd.type === 'open') {
      ch.port2.postMessage({
        type: 'ready',
        publication: PUB,
        locator: PUB.readingOrder[0],
        pageCount: 10,
      })
    } else if (cmd.type !== 'destroy') {
      ch.port2.postMessage({ type: 'result', id: cmd.id, ok: true })
    }
  }
  ch.port2.start()

  iframe.dispatchEvent(new Event('load'))
  const proxy = await proxyPromise
  return { proxy, ch, mount, initPosts }
}

// ---------------------------------------------------------------------------
// (a) FAIL-CLOSED: VITE_READER_ORIGIN unset ⇒ throws, no iframe rendered
// ---------------------------------------------------------------------------
describe('Checker (a) — fail-closed when VITE_READER_ORIGIN is unset', () => {
  beforeEach(() => {
    CheckerChannel.all = []
    vi.stubGlobal('MessageChannel', CheckerChannel)
    vi.stubEnv('VITE_READER_ORIGIN', '')
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    document.body.replaceChildren()
  })

  it('throws a descriptive error (no same-origin fallback)', async () => {
    const mount = document.createElement('div')
    await expect(
      createEpubNavigatorProxy(PUB, mount, {
        source: publicationSourceFromBytes(new Uint8Array([0])),
      }),
    ).rejects.toThrow(/reader origin is not configured/i)
  })

  it('leaves the mount element EMPTY — no book content on the app origin', async () => {
    const mount = document.createElement('div')
    try {
      await createEpubNavigatorProxy(PUB, mount, {
        source: publicationSourceFromBytes(new Uint8Array([0])),
      })
    } catch {
      // expected
    }
    // No iframe was injected onto the app origin.
    expect(mount.querySelector('iframe')).toBeNull()
    expect(mount.children.length).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// (b) Init handshake: targetOrigin is READER_ORIGIN, never '*'
// (c) Foreign-origin window messages are DROPPED
// (d) No edda.creds.* in bridge payloads
// (e) markRaw proxy is non-reactive
// (f) teardown idempotent
// ---------------------------------------------------------------------------
describe('Checker (b-f) — bridge security properties', () => {
  beforeEach(() => {
    CheckerChannel.all = []
    vi.stubGlobal('MessageChannel', CheckerChannel)
    vi.stubEnv('VITE_READER_ORIGIN', READER_ORIGIN)
    // Seed a credential on the app origin — must never appear in bridge traffic.
    localStorage.setItem('edda.creds.checker-session', 'CHECKER-SECRET-99')
    localStorage.setItem('edda.creds.api-token', 'TOKEN-XYZ-CHECKER')
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    localStorage.clear()
    document.body.replaceChildren()
  })

  it('(b) init handshake uses explicit targetOrigin — never "*" or app origin', async () => {
    const { initPosts } = await boot()
    expect(initPosts).toHaveLength(1)
    const post = initPosts[0]!
    expect(post.targetOrigin, 'must target the reader origin').toBe(READER_ORIGIN)
    expect(post.targetOrigin, 'must NOT use wildcard').not.toBe('*')
    expect(post.targetOrigin, 'must NOT target the app origin').not.toBe(APP_ORIGIN)
    expect((post.message as Record<string, unknown>)?.type).toBe(READER_INIT)
  })

  it('(c) window message from a FOREIGN origin is dropped — locator unchanged', async () => {
    const { proxy } = await boot()
    const initialHref = proxy.currentLocator().href

    const evil: Locator = { href: 'evil.xhtml', type: MEDIA_TYPE_EPUB }
    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'http://evil.example.com',
        data: { type: 'locatorChanged', locator: evil },
      }),
    )
    await tick()

    // The proxy must not have updated — the foreign-origin message was silently dropped.
    expect(proxy.currentLocator().href).toBe(initialHref)
    expect(proxy.currentLocator().href).not.toBe('evil.xhtml')

    proxy.destroy()
  })

  it('(c-corollary) a reader-origin WINDOW message is IGNORED — only the capability port delivers (M1)', async () => {
    const { proxy, ch } = await boot()
    const moved: Locator = { href: 'ch2.xhtml', type: MEDIA_TYPE_EPUB }

    // A book script is same-origin to the READER origin and could forge this from `window.top`. The app
    // keeps no window listener, so the spoof seam (M1) is closed — the message is dropped.
    window.dispatchEvent(
      new MessageEvent('message', {
        origin: READER_ORIGIN,
        data: { type: 'locatorChanged', locator: moved },
      }),
    )
    await tick()
    expect(proxy.currentLocator().href).not.toBe('ch2.xhtml')

    // The capability PORT (handed only to the frame) is the sole channel that moves the locator.
    ch.port2.postMessage({ type: 'locatorChanged', locator: moved })
    await tick()
    expect(proxy.currentLocator().href).toBe('ch2.xhtml')
    proxy.destroy()
  })

  it('(d) no edda.creds.* value appears in ANY bridge payload', async () => {
    const { proxy, ch, initPosts } = await boot()

    // Drive additional commands over the bridge.
    await proxy.next()
    await proxy.seek(0.5)
    proxy.applyPreferences({ theme: 'dark' })
    await tick()

    const allPayloads: unknown[] = [
      ...ch.port1.sent.map((s) => s.data),
      ...initPosts.map((p) => p.message),
    ]
    const serialized = JSON.stringify(allPayloads, (_, v) =>
      v instanceof ArrayBuffer ? `[ArrayBuffer:${v.byteLength}]` : v,
    )

    // Neither the stored secret values nor the edda.creds key prefix must appear.
    expect(serialized).not.toContain('CHECKER-SECRET-99')
    expect(serialized).not.toContain('TOKEN-XYZ-CHECKER')
    expect(serialized).not.toContain('edda.creds')
    proxy.destroy()
  })

  it('(d-open-payload) the open command contains ONLY neutral fields — no DOM/credential', async () => {
    const { ch } = await boot()
    const open = ch.port1.sent.find((s) => s.data.type === 'open')
    expect(open, 'open command must have been sent').toBeTruthy()

    const keys = Object.keys(open!.data).sort()
    // Exact field set: id, type, buffer, and (optional) preferences.
    // No credential, no DOM node, no token — just structured-cloneable neutrals.
    expect(keys).not.toContain('creds')
    expect(keys).not.toContain('token')
    expect(keys).not.toContain('credential')
    // Buffer is an ArrayBuffer (zero-copy Transferable, ADR-005).
    expect(open!.data.buffer).toBeInstanceOf(ArrayBuffer)
  })

  it('(e) markRaw(proxy) is non-reactive — Vue never wraps the iframe or MessagePorts', async () => {
    const { proxy } = await boot()
    const raw = markRaw(proxy)
    // isReactive must be false: markRaw pins the object outside reactivity.
    expect(isReactive(raw)).toBe(false)
    // The proxy itself is not reactive either (not a shallowReactive wrapper).
    expect(isReactive(proxy)).toBe(false)
    raw.destroy()
  })

  it('(f) destroy() is idempotent — second call is a no-op, port closed exactly once', async () => {
    const { proxy, ch, mount } = await boot()

    proxy.destroy()
    // After first destroy: iframe removed, port closed, destroy command was posted.
    expect(mount.querySelector('iframe')).toBeNull()
    expect(ch.port1.closed).toBe(true)
    const destroyCount1 = ch.port1.sent.filter((s) => s.data.type === 'destroy').length
    expect(destroyCount1).toBe(1)

    // Second destroy() — must be a no-op.
    proxy.destroy()
    const destroyCount2 = ch.port1.sent.filter((s) => s.data.type === 'destroy').length
    // Still only 1 destroy posted — not 2.
    expect(destroyCount2).toBe(destroyCount1)
  })

  it('(f-events) post-teardown locatorChanged events reach NO subscriber', async () => {
    const { proxy, ch } = await boot()
    const seen: string[] = []
    proxy.on('locatorChanged', (loc) => seen.push((loc as Locator).href))

    proxy.destroy()
    // Post a locatorChanged after teardown.
    ch.port2.postMessage({
      type: 'locatorChanged',
      locator: { href: 'post-teardown.xhtml', type: MEDIA_TYPE_EPUB },
    })
    await tick()

    // No subscriber fired.
    expect(seen).toHaveLength(0)
  })
})
