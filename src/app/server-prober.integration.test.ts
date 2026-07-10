// Integration — server prober against the throwaway Docker Komga (test/komga, reader account).
// Gated by `describe.skipIf`: when Komga is down the suite is SKIPPED, never failed. The aliveness
// check is a TOP-LEVEL await (not beforeAll) because skipIf is evaluated at collection time — a
// beforeAll would run too late and the suite would always skip. Run a live Komga first: `pnpm komga:up`.
//
// This crosses the core prober (core/dispatch) with the real bundled probe entries + the web HostBridge
// (app/platform), proving the end-to-end detection a unit test with stubs cannot: a Komga server that
// also speaks OPDS is detected as `komga`, not generic `opds`. In Node there is no CORS (the connector
// only calls HostBridge.http), so this reaches localhost:25600 directly.

import { describe, expect, it } from 'vitest'
import { serverProbe } from '@/core/dispatch'
import { bundledProbeEntries } from '@/app/plugins-catalog'
import { createWebPluginBridge } from '@/platform/web'

const KOMGA_URL = 'http://localhost:25600'

async function komgaIsAlive(): Promise<boolean> {
  try {
    const response = await fetch(`${KOMGA_URL}/api/v1/claim`, { signal: AbortSignal.timeout(2000) })
    return response.status === 200
  } catch {
    return false
  }
}

const komgaAlive = await komgaIsAlive()

function proberHost() {
  return createWebPluginBridge('server-prober', { permissions: { network: ['*'] } })
}

describe.skipIf(!komgaAlive)('server prober — live Komga (test/komga)', () => {
  it('detects kind komga (NOT generic opds) with the connector id', async () => {
    const outcome = await serverProbe({
      url: KOMGA_URL,
      host: proberHost(),
      installed: bundledProbeEntries(),
    })
    expect(outcome.status).toBe('ready')
    if (outcome.status !== 'ready') return
    expect(outcome.detected.kind).toBe('komga')
    expect(outcome.detected.connectorId).toBe('connector.komga')
  })

  it('exposes Komga’s advertised capabilities without authenticating', async () => {
    const outcome = await serverProbe({
      url: KOMGA_URL,
      host: proberHost(),
      installed: bundledProbeEntries(),
    })
    if (outcome.status !== 'ready') throw new Error(`expected ready, got ${outcome.status}`)
    const { capabilities } = outcome.detected
    expect(capabilities.protocols).toContain('opds2')
    expect(capabilities.progressSync).toBe(true)
    expect(capabilities.search).toBe(true)
    expect(capabilities.pagedStreaming).toBe(true)
    expect(capabilities.thumbnails).toBe(true)
  })

  it('reports a bogus port as unreachable (bounded, no throw)', async () => {
    const outcome = await serverProbe({
      url: 'http://localhost:1',
      host: proberHost(),
      installed: bundledProbeEntries(),
      timeoutMs: 2000,
    })
    expect(outcome.status).toBe('unreachable')
  })
})
