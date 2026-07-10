import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import type { ConnectorCapabilities, HostBridge, PluginManifest } from '@/core/contracts'
import {
  serverProbe,
  type ConnectorProbeFn,
  type ConnectorProbeResult,
  type ProbeEntry,
} from './server-prober'

// The prober coordinates connectors; it never does I/O itself. These stubs ignore the host entirely,
// so a non-fetch, non-DOM bridge produces identical outcomes (the platform-neutral conformance case).
const STUB_HOST = {} as HostBridge

const CAPS: ConnectorCapabilities = {
  protocols: ['opds2'],
  auth: ['basic'],
  progressSync: false,
  search: false,
  download: true,
  pagedStreaming: false,
  thumbnails: false,
}

function manifest(id: string, bundled = true): PluginManifest {
  return {
    id,
    name: id,
    version: '1.0.0',
    kind: 'connector',
    hostApi: '^1.0.0',
    bundled,
    capabilities: CAPS,
  }
}

function result(
  connectorId: string,
  kind: string,
  confidence: number,
  specificity: number,
): ConnectorProbeResult {
  return { connectorId, kind, confidence, specificity, capabilities: CAPS }
}

function entry(id: string, probe: ConnectorProbeFn, bundled = true): ProbeEntry {
  return { manifest: manifest(id, bundled), probe }
}

/** A broad/best-effort probe entry (e.g. the generic OPDS content-sniff) that must not run until every
 *  eager (non-fallback) installed connector has had a chance to claim the URL — see `ProbeEntry.fallback`. */
function fallbackEntry(id: string, probe: ConnectorProbeFn): ProbeEntry {
  return { ...entry(id, probe), fallback: true }
}

const claims =
  (value: ConnectorProbeResult | null): ConnectorProbeFn =>
  async () =>
    value
const rejects = (): ConnectorProbeFn => async () => {
  throw new Error('ECONNREFUSED')
}
const hangs = (): ConnectorProbeFn => () => new Promise<ConnectorProbeResult | null>(() => {})

describe('serverProbe — confidence-ranked, specificity-broken detection', () => {
  it('detects Komga (not OPDS) when both claim the URL — higher confidence AND specificity win', async () => {
    const outcome = await serverProbe({
      url: 'https://server',
      host: STUB_HOST,
      installed: [
        entry('connector-opds', claims(result('connector-opds', 'opds', 0.6, 1))),
        entry('connector-komga', claims(result('connector-komga', 'komga', 1, 2))),
      ],
    })
    expect(outcome.status).toBe('ready')
    if (outcome.status !== 'ready') return
    expect(outcome.detected.kind).toBe('komga')
    expect(outcome.detected.connectorId).toBe('connector-komga')
  })

  it('selects the highest-confidence claim above the threshold', async () => {
    const outcome = await serverProbe({
      url: 'https://server',
      host: STUB_HOST,
      installed: [
        entry('low', claims(result('low', 'low', 0.7, 1))),
        entry('high', claims(result('high', 'high', 0.9, 1))),
      ],
    })
    expect(outcome.status).toBe('ready')
    if (outcome.status !== 'ready') return
    expect(outcome.detected.connectorId).toBe('high')
  })

  it('breaks a confidence tie toward the more specialized connector', async () => {
    const outcome = await serverProbe({
      url: 'https://server',
      host: STUB_HOST,
      installed: [
        entry('generic', claims(result('generic', 'generic', 0.8, 1))),
        entry('special', claims(result('special', 'special', 0.8, 2))),
      ],
    })
    expect(outcome.status).toBe('ready')
    if (outcome.status !== 'ready') return
    expect(outcome.detected.connectorId).toBe('special')
  })

  it('falls through to the generic OPDS connector when the specialized one does not claim the URL', async () => {
    const outcome = await serverProbe({
      url: 'https://feed',
      host: STUB_HOST,
      installed: [
        entry('connector-komga', claims(null)),
        entry('connector-opds', claims(result('connector-opds', 'opds', 0.6, 1))),
      ],
    })
    expect(outcome.status).toBe('ready')
    if (outcome.status !== 'ready') return
    expect(outcome.detected.kind).toBe('opds')
  })

  it('ignores claims below the minimum confidence threshold', async () => {
    const outcome = await serverProbe({
      url: 'https://server',
      host: STUB_HOST,
      installed: [entry('weak', claims(result('weak', 'weak', 0.3, 1)))],
    })
    expect(outcome.status).toBe('unsupported')
  })
})

describe('serverProbe — reachability', () => {
  it('a probe that rejects (transport failure) with no other claimant → unreachable', async () => {
    const outcome = await serverProbe({
      url: 'https://nope',
      host: STUB_HOST,
      installed: [entry('komga', rejects())],
    })
    expect(outcome.status).toBe('unreachable')
    if (outcome.status === 'unreachable') expect(outcome.reason).toBeTruthy()
  })

  it('a probe that exceeds the timeout → unreachable (never hangs)', async () => {
    const outcome = await serverProbe({
      url: 'https://slow',
      host: STUB_HOST,
      installed: [entry('komga', hangs())],
      timeoutMs: 20,
    })
    expect(outcome.status).toBe('unreachable')
  })

  it('reachable but unclaimed (probe responded with null) → unsupported, distinct from unreachable', async () => {
    const outcome = await serverProbe({
      url: 'https://website',
      host: STUB_HOST,
      installed: [entry('komga', claims(null)), entry('opds', claims(null))],
    })
    expect(outcome.status).toBe('unsupported')
  })
})

describe('serverProbe — catalog fallback', () => {
  it('no installed match but an available connector claims it → installable (carries the manifest)', async () => {
    const outcome = await serverProbe({
      url: 'https://kavita',
      host: STUB_HOST,
      installed: [entry('komga', claims(null))],
      available: [
        entry('connector-kavita', claims(result('connector-kavita', 'kavita', 0.9, 2)), false),
      ],
    })
    expect(outcome.status).toBe('installable')
    if (outcome.status !== 'installable') return
    expect(outcome.detected.connectorId).toBe('connector-kavita')
    expect(outcome.detected.manifest.id).toBe('connector-kavita')
    expect(outcome.detected.manifest.bundled).toBe(false)
  })

  it('an installed claim wins over an available one (ready, not installable)', async () => {
    const outcome = await serverProbe({
      url: 'https://server',
      host: STUB_HOST,
      installed: [entry('komga', claims(result('komga', 'komga', 1, 2)))],
      available: [
        entry('connector-kavita', claims(result('connector-kavita', 'kavita', 0.9, 2)), false),
      ],
    })
    expect(outcome.status).toBe('ready')
  })
})

describe('serverProbe — fallback probes never fire unless needed (avoids a doomed request)', () => {
  it('never invokes a fallback probe when an eager installed connector already claims the URL', async () => {
    const fallbackProbe = vi.fn(claims(result('connector-opds', 'opds', 0.6, 1)))
    const outcome = await serverProbe({
      url: 'https://server',
      host: STUB_HOST,
      installed: [
        entry('connector-komga', claims(result('connector-komga', 'komga', 1, 2))),
        fallbackEntry('connector-opds', fallbackProbe),
      ],
    })
    expect(outcome.status).toBe('ready')
    if (outcome.status !== 'ready') return
    expect(outcome.detected.connectorId).toBe('connector-komga')
    // The load-bearing assertion: a claimed URL never runs the broad/fallback probe at all — so a
    // fallback that would hit an unprotected path (e.g. the pasted root, CORS-less on Komga) never
    // fires its request in the happy path.
    expect(fallbackProbe).not.toHaveBeenCalled()
  })

  it('invokes a fallback probe only once no eager connector claims the URL', async () => {
    const outcome = await serverProbe({
      url: 'https://feed',
      host: STUB_HOST,
      installed: [
        entry('connector-komga', claims(null)),
        fallbackEntry('connector-opds', claims(result('connector-opds', 'opds', 0.6, 1))),
      ],
    })
    expect(outcome.status).toBe('ready')
    if (outcome.status !== 'ready') return
    expect(outcome.detected.connectorId).toBe('connector-opds')
  })

  it('still reports unreachable when both the eager and fallback probes fail to reach the server', async () => {
    const outcome = await serverProbe({
      url: 'https://nope',
      host: STUB_HOST,
      installed: [entry('connector-komga', rejects()), fallbackEntry('connector-opds', rejects())],
    })
    expect(outcome.status).toBe('unreachable')
  })

  it('a fallback claim still resolves ready even when the eager probe merely rejected (not just null)', async () => {
    const outcome = await serverProbe({
      url: 'https://feed',
      host: STUB_HOST,
      installed: [
        entry('connector-komga', rejects()),
        fallbackEntry('connector-opds', claims(result('connector-opds', 'opds', 0.6, 1))),
      ],
    })
    expect(outcome.status).toBe('ready')
    if (outcome.status !== 'ready') return
    expect(outcome.detected.connectorId).toBe('connector-opds')
  })
})

describe('serverProbe — platform neutrality', () => {
  const SOURCE = readFileSync(join(process.cwd(), 'src/core/dispatch/server-prober.ts'), 'utf8')
  const codeLines = SOURCE.split('\n').filter((line) => {
    const trimmed = line.trim()
    return trimmed !== '' && !trimmed.startsWith('//') && !trimmed.startsWith('*')
  })

  it('imports only from @/core/contracts (no platform/app/plugin layers)', () => {
    expect(SOURCE).toMatch(/from '@\/core\/contracts'/)
    const importLines = codeLines.filter((line) => /\bimport\b/.test(line) && /\bfrom\b/.test(line))
    for (const line of importLines) {
      expect(line, line).not.toMatch(/@\/(platform|app|plugins)/)
      expect(line, line).not.toMatch(/@\/core\/(?!contracts)/)
    }
  })

  it('touches no browser-only global (window, document, fetch, localStorage)', () => {
    for (const line of codeLines) {
      expect(line, line).not.toMatch(/\bwindow\b/)
      expect(line, line).not.toMatch(/\bdocument\b/)
      expect(line, line).not.toMatch(/\bfetch\s*\(/)
      expect(line, line).not.toMatch(/\blocalStorage\b/)
    }
  })
})
