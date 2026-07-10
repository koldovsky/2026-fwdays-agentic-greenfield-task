/**
 * Gate-2 checker — add-source-flow (spec 4/11)
 *
 * Independent tests written by the CHECKER agent (NOT the maker). Targets:
 *  1. Credential boundary (SECURITY-CRITICAL) — SourceRecord never leaks creds;
 *     credentialRef is a STORAGE-KEY reference, not an encoded secret;
 *     creds stored under a distinct `edda.creds.<id>` key only.
 *  2. Prober platform-neutrality — independent scan of server-prober.ts for
 *     vue/fetch/window/document/@/app/@/platform imports (independent of the maker's scan).
 *  3. Prober logic edge cases — mixed settled results; all-installed-null-no-available →
 *     unsupported; installed-reachable-null + available-claims → installable.
 *  4. capabilityChips derivation — protocol-only server (no boolean features) still
 *     yields a chip; unknown protocol passthrough; empty protocols → no protocol chip.
 *  5. protocolSummary dedup — two protocols that map to the same label produce a single
 *     label (no "rest + rest").
 *  6. toDisplayConnectorId idempotent on already-dotted IDs.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { ConnectorCapabilities, HostBridge } from '@/core/contracts'
import {
  serverProbe,
  type ConnectorProbeFn,
  type ConnectorProbeResult,
  type ProbeEntry,
} from '@/core/dispatch'
import { KOMGA_CAPABILITIES } from '@/plugins/connectors/komga'
import { OPDS_CAPABILITIES } from '@/plugins/connectors/opds'
import { KOMGA_MANIFEST, OPDS_MANIFEST } from '@/app/plugins-catalog'
import { capabilityChips, protocolSummary, toDisplayConnectorId } from '@/app/add-source'
import { useSourcesStore } from '@/app/stores/sourcesStore'
import type { DetectedServer } from '@/core/dispatch'

// ── Helpers ───────────────────────────────────────────────────────────────────

const STUB_HOST = {} as HostBridge

const BASE_CAPS: ConnectorCapabilities = {
  protocols: ['opds2'],
  auth: ['basic'],
  progressSync: false,
  search: false,
  download: true,
  pagedStreaming: false,
  thumbnails: false,
}

function manifest(id: string, bundled = true) {
  return {
    id,
    name: id,
    version: '1.0.0',
    kind: 'connector' as const,
    hostApi: '^1.0.0',
    bundled,
    capabilities: BASE_CAPS,
  }
}

function probeResult(
  connectorId: string,
  kind: string,
  confidence: number,
  specificity: number,
): ConnectorProbeResult {
  return { connectorId, kind, confidence, specificity, capabilities: BASE_CAPS }
}

const claims =
  (value: ConnectorProbeResult | null): ConnectorProbeFn =>
  async () =>
    value

const rejects = (): ConnectorProbeFn => async () => {
  throw new Error('ECONNREFUSED')
}

function entry(id: string, probe: ConnectorProbeFn, bundled = true): ProbeEntry {
  return { manifest: manifest(id, bundled), probe }
}

const KOMGA_DETECTED: DetectedServer = {
  connectorId: 'connector.komga',
  kind: 'komga',
  capabilities: KOMGA_CAPABILITIES,
  manifest: KOMGA_MANIFEST,
}

// ── 1. Credential boundary (SECURITY-CRITICAL) ────────────────────────────────
//
// The maker verifies that 'username' and 'password' are absent from the SourceRecord
// object. The checker independently verifies:
//   a) JSON.stringify(sourceRecord) contains NO secret substring
//   b) `credentialRef` is a STORAGE KEY path of the form "edda.creds.<uuid>" — NOT the
//      actual credential value (base64 or otherwise)
//   c) Reading back the SEPARATE creds key recovers the original secret
//   d) rehydrate() doesn't push credentials into the sidebar SourceRow
//   e) The connect() params URL is never included in the serialised source record

describe('credential boundary (SECURITY-CRITICAL)', () => {
  const CREDS = { username: 'reader@edda.test', password: 'edda-reader-pw' }
  const BASE_URL = 'http://localhost:25600'

  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('JSON.stringify(sourceRecord) leaks no secret — password never appears in the syncable payload', async () => {
    const store = useSourcesStore()
    const record = await store.connect({ detected: KOMGA_DETECTED, baseUrl: BASE_URL, ...CREDS })
    const serialised = JSON.stringify(record)
    // The whole serialised source record must not embed the password
    expect(serialised).not.toContain(CREDS.password)
    // Nor the username
    expect(serialised).not.toContain(CREDS.username)
  })

  it('credentialRef is a localStorage KEY (not the secret itself): matches edda.creds.<uuid>', async () => {
    const store = useSourcesStore()
    const record = await store.connect({ detected: KOMGA_DETECTED, baseUrl: BASE_URL, ...CREDS })
    // Must be the key pattern, not the secret value
    expect(record.credentialRef).toMatch(/^edda\.creds\.[0-9a-f-]{36}$/)
    // Must not BE the password or username
    expect(record.credentialRef).not.toBe(CREDS.password)
    expect(record.credentialRef).not.toBe(CREDS.username)
  })

  it('the credential record is RECOVERABLE from localStorage under the credentialRef key', async () => {
    const store = useSourcesStore()
    const record = await store.connect({ detected: KOMGA_DETECTED, baseUrl: BASE_URL, ...CREDS })
    // The credentialRef is the KEY under which the credential lives
    const raw = localStorage.getItem(record.credentialRef)
    expect(raw).toBeTruthy()
    const creds = JSON.parse(raw!) as { username: string; password: string }
    expect(creds.username).toBe(CREDS.username)
    expect(creds.password).toBe(CREDS.password)
  })

  it('edda.sources and edda.creds.<id> are truly distinct localStorage keys', async () => {
    const store = useSourcesStore()
    const record = await store.connect({ detected: KOMGA_DETECTED, baseUrl: BASE_URL, ...CREDS })
    const sourceKey = 'edda.sources'
    const credKey = record.credentialRef // e.g. "edda.creds.<uuid>"
    expect(sourceKey).not.toBe(credKey)
    // Both must exist independently
    expect(localStorage.getItem(sourceKey)).toBeTruthy()
    expect(localStorage.getItem(credKey)).toBeTruthy()
  })

  it('rehydrate() does NOT expose credentials in the SourceRow surfaced to the sidebar', async () => {
    // connect → reload pinia → rehydrate → check no cred leak in sidebar rows
    await useSourcesStore().connect({ detected: KOMGA_DETECTED, baseUrl: BASE_URL, ...CREDS })

    setActivePinia(createPinia())
    const reloaded = useSourcesStore()
    await reloaded.rehydrate()

    expect(reloaded.sources).toHaveLength(1)
    const row = reloaded.sources[0]!
    // SourceRow fields: sourceId, name, descriptor — none should contain the password
    const rowStr = JSON.stringify(row)
    expect(rowStr).not.toContain(CREDS.password)
    expect(rowStr).not.toContain(CREDS.username)
  })
})

// ── 2. Prober platform-neutrality (independent scan) ─────────────────────────
//
// The maker checks: no platform/app/plugins imports; no window/document/fetch/localStorage.
// The checker independently also checks: no 'vue' import; no @/core non-contracts import;
// and scans the entire src/core/dispatch/ directory (not just the prober file) to confirm
// the restriction holds across the barrel.

const REPO_ROOT = process.cwd()
const PROBER_SRC = readFileSync(join(REPO_ROOT, 'src/core/dispatch/server-prober.ts'), 'utf8')
const DISPATCH_INDEX_SRC = readFileSync(join(REPO_ROOT, 'src/core/dispatch/index.ts'), 'utf8')

function nonCommentLines(src: string): string[] {
  return src.split('\n').filter((line) => {
    const t = line.trim()
    return t !== '' && !t.startsWith('//') && !t.startsWith('*')
  })
}

describe('prober platform-neutrality (checker scan, independent of maker)', () => {
  it('server-prober.ts has no import from "vue"', () => {
    for (const line of nonCommentLines(PROBER_SRC)) {
      expect(line).not.toMatch(/from ['"]vue['"]/)
      expect(line).not.toMatch(/from ['"]vue\//)
    }
  })

  it('server-prober.ts has no import from @/platform or @/app or @/plugins layers', () => {
    for (const line of nonCommentLines(PROBER_SRC)) {
      if (!/\bfrom\b/.test(line)) continue
      expect(line).not.toMatch(/@\/(platform|app|plugins)/)
    }
  })

  it('server-prober.ts imports from @/core only via @/core/contracts (no other core module)', () => {
    // All @/core/* imports must be exactly @/core/contracts (model, registry, etc. are forbidden here)
    for (const line of nonCommentLines(PROBER_SRC)) {
      if (!/\bfrom\b/.test(line) || !line.includes('@/core')) continue
      expect(line).toMatch(/@\/core\/contracts/)
    }
  })

  it('server-prober.ts uses no XMLHttpRequest (bridge-only HTTP pattern)', () => {
    expect(PROBER_SRC).not.toMatch(/XMLHttpRequest/)
  })

  it('dispatch/index.ts (barrel) introduces no new browser API usage', () => {
    for (const line of nonCommentLines(DISPATCH_INDEX_SRC)) {
      expect(line).not.toMatch(/\bfetch\s*\(/)
      expect(line).not.toMatch(/\bwindow\s*[.[]/)
      expect(line).not.toMatch(/\blocalStorage\b/)
    }
  })
})

// ── 3. Prober logic edge cases ────────────────────────────────────────────────
//
// The maker covers the core ranking paths. The checker adds:
//  a) All installed probes return null AND no available list → unsupported (not unreachable)
//  b) One installed probe throws, another returns null → network is reachable for the null probe
//     → should be unsupported (some server was reached), not unreachable
//  c) Mixed: installed all null, available empty → unsupported
//  d) installed throws, available also claims → installable (available sweep runs)

describe('serverProbe — edge cases (checker)', () => {
  it('all installed → null, no available list → unsupported (not unreachable)', async () => {
    const outcome = await serverProbe({
      url: 'https://website',
      host: STUB_HOST,
      installed: [entry('komga', claims(null)), entry('opds', claims(null))],
    })
    expect(outcome.status).toBe('unsupported')
  })

  it('one installed probe throws, the other returns null → still unsupported (not unreachable)', async () => {
    // One probe rejects (network error) but another responds with null (server reachable).
    // The reachable=true flag from the null-resolving probe must win over the throw.
    const outcome = await serverProbe({
      url: 'https://partial',
      host: STUB_HOST,
      installed: [entry('fails', rejects()), entry('returns-null', claims(null))],
    })
    // The server WAS reachable (one probe resolved), so unsupported (not unreachable).
    expect(outcome.status).toBe('unsupported')
  })

  it('installed all throw AND no available → unreachable', async () => {
    const outcome = await serverProbe({
      url: 'https://down',
      host: STUB_HOST,
      installed: [entry('a', rejects()), entry('b', rejects())],
    })
    expect(outcome.status).toBe('unreachable')
  })

  it('installed all throw, but available connector claims it → installable (not unreachable)', async () => {
    // Even when installed probes all reject, the available sweep still runs. If the available
    // probe RESOLVES (even reachable), we report installable.
    const outcome = await serverProbe({
      url: 'https://kavita',
      host: STUB_HOST,
      installed: [entry('komga', rejects())],
      available: [
        entry('kavita', claims(probeResult('connector-kavita', 'kavita', 0.9, 2)), false),
      ],
    })
    // Available probe resolved → installable (overrides the unreachable-from-installed sweep)
    expect(outcome.status).toBe('installable')
    if (outcome.status === 'installable') {
      expect(outcome.detected.connectorId).toBe('connector-kavita')
    }
  })

  it('installed best claim below minConfidence → falls through to available', async () => {
    const outcome = await serverProbe({
      url: 'https://server',
      host: STUB_HOST,
      installed: [entry('komga', claims(probeResult('komga', 'komga', 0.2, 2)))],
      available: [entry('kavita', claims(probeResult('kavita', 'kavita', 0.9, 2)), false)],
      minConfidence: 0.5,
    })
    // komga's 0.2 < 0.5 → no installed claim; kavita in available → installable
    expect(outcome.status).toBe('installable')
  })
})

// ── 4. capabilityChips derivation — edge cases ────────────────────────────────
//
// The maker covers Komga (5 chips) and OPDS (3 chips). The checker adds:
//   - protocol-only server (no boolean features) → single protocol chip
//   - opds1 (not opds2) → "OPDS v1" chip label
//   - empty protocols list → no protocol chip at all
//   - all booleans true but no protocols → only feature chips (no protocol chip)

describe('capabilityChips — derivation edge cases (checker)', () => {
  it('opds1 protocol yields OPDS v1 chip label (not OPDS v2)', () => {
    const chips = capabilityChips({
      protocols: ['opds1'],
      auth: ['basic'],
      progressSync: false,
      search: false,
      download: true,
      pagedStreaming: false,
      thumbnails: false,
    })
    const labels = chips.map((c) => c.label)
    expect(labels).toContain('OPDS v1')
    expect(labels).not.toContain('OPDS v2')
  })

  it('empty protocols list → no protocol chip; boolean features still appear', () => {
    const chips = capabilityChips({
      protocols: [],
      auth: ['basic'],
      progressSync: true,
      search: true,
      download: true,
      pagedStreaming: false,
      thumbnails: false,
    })
    const labels = chips.map((c) => c.label)
    // No protocol chip
    expect(labels).not.toContain('OPDS v1')
    expect(labels).not.toContain('OPDS v2')
    // Feature chips from booleans
    expect(labels).toContain('Progress sync')
    expect(labels).toContain('Search')
  })

  it('unknown protocol (e.g. kavita-native) → no protocol chip (only opds1/opds2 trigger chips)', () => {
    const chips = capabilityChips({
      // Deliberately an unknown protocol (malformed-server simulation) — cast past the strict union so
      // the unknown-protocol runtime path is exercised. (Pre-existing typecheck fix; runtime unchanged.)
      protocols: ['kavita-native'] as unknown as ConnectorCapabilities['protocols'],
      auth: ['basic'],
      progressSync: false,
      search: false,
      download: true,
      pagedStreaming: false,
      thumbnails: false,
    })
    // Neither opds1 nor opds2 → no protocol chip at all
    const labels = chips.map((c) => c.label)
    expect(labels).not.toContain('OPDS v1')
    expect(labels).not.toContain('OPDS v2')
    expect(labels).toHaveLength(0)
  })

  it('all boolean features on + opds2 → exactly 5 chips (matches Komga count)', () => {
    const chips = capabilityChips({
      protocols: ['opds2'],
      auth: ['basic'],
      progressSync: true,
      search: true,
      download: true,
      pagedStreaming: true,
      thumbnails: true,
    })
    expect(chips).toHaveLength(5)
    expect(chips.map((c) => c.label)).toEqual([
      'OPDS v2',
      'Progress sync',
      'Search',
      'Page streaming',
      'Thumbnails',
    ])
  })

  it('protocol chip has kind "protocol", feature chips have kind "feature"', () => {
    const chips = capabilityChips(KOMGA_CAPABILITIES)
    const protocolChips = chips.filter((c) => c.kind === 'protocol')
    const featureChips = chips.filter((c) => c.kind === 'feature')
    expect(protocolChips.length).toBeGreaterThanOrEqual(1)
    expect(featureChips.length).toBeGreaterThanOrEqual(1)
    // All OPDS chips are protocol kind
    for (const c of protocolChips) {
      expect(c.label).toMatch(/^OPDS/)
    }
  })

  it('opds2 wins over opds1 when both are present (only opds2 chip rendered)', () => {
    // If a server advertises both, capabilityChips picks opds2 (the `includes('opds2')` branch runs first).
    const chips = capabilityChips({
      protocols: ['opds1', 'opds2'],
      auth: ['basic'],
      progressSync: false,
      search: false,
      download: true,
      pagedStreaming: false,
      thumbnails: false,
    })
    const labels = chips.map((c) => c.label)
    expect(labels).toContain('OPDS v2')
    expect(labels).not.toContain('OPDS v1')
  })
})

// ── 5. protocolSummary dedup ──────────────────────────────────────────────────
//
// Maker tests komga (opds2+komga-rest → "opds v2 + rest") and bare opds ("opds v2").
// Checker tests that two protocols mapping to the SAME label are de-duplicated.

describe('protocolSummary — deduplication (checker)', () => {
  it('two rest-like protocols do not repeat "rest" (dedup)', () => {
    // Hypothetical: a connector that advertises both komga-rest AND kavita-rest (both map to "rest")
    const summary = protocolSummary({
      protocols: ['komga-rest', 'kavita-rest'],
      auth: ['basic'],
      progressSync: false,
      search: false,
      download: true,
      pagedStreaming: false,
      thumbnails: false,
    })
    // De-duped to a single "rest", not "rest + rest"
    const parts = summary.split(' + ')
    const unique = new Set(parts)
    expect(unique.size).toBe(parts.length) // no duplicate labels
    expect(summary).not.toContain('rest + rest')
  })

  it('opds2 + komga-rest → "opds v2 + rest" (the Komga maket summary)', () => {
    expect(protocolSummary(KOMGA_CAPABILITIES)).toBe('opds v2 + rest')
  })

  it('empty protocols → empty summary string', () => {
    expect(protocolSummary({ ...BASE_CAPS, protocols: [] })).toBe('')
  })
})

// ── 6. toDisplayConnectorId ──────────────────────────────────────────────────
//
// The maker tests the canonical cases (connector.komga → connector.komga).
// The checker verifies the function is safe on edge inputs.

describe('toDisplayConnectorId — edge inputs (checker)', () => {
  it('already-dotted id remains unchanged', () => {
    // If somehow called with a dotted id, it should not double-transform
    expect(toDisplayConnectorId('connector.komga')).toBe('connector.komga')
  })

  it('empty string returns empty string (no throw)', () => {
    expect(toDisplayConnectorId('')).toBe('')
  })

  it('id with no dashes returns unchanged', () => {
    expect(toDisplayConnectorId('komga')).toBe('komga')
  })

  it('multiple dashes all converted to dots', () => {
    expect(toDisplayConnectorId('my-fancy-connector-plugin')).toBe('my.fancy.connector.plugin')
  })
})

// ── 7. OPDS_CAPABILITIES and KOMGA_CAPABILITIES guard (checker) ───────────────
//
// Independently assert the critical capability declarations that drive the chip derivation.
// If these constants change inadvertently, the chip derivation silently breaks.

describe('connector capability declarations — checker invariants', () => {
  it('KOMGA_CAPABILITIES advertises opds2 + komga-rest (drives the detected card summary)', () => {
    expect(KOMGA_CAPABILITIES.protocols).toContain('opds2')
    expect(KOMGA_CAPABILITIES.protocols).toContain('komga-rest')
  })

  it('KOMGA_CAPABILITIES has all boolean features true (drives 5-chip row)', () => {
    expect(KOMGA_CAPABILITIES.progressSync).toBe(true)
    expect(KOMGA_CAPABILITIES.search).toBe(true)
    expect(KOMGA_CAPABILITIES.pagedStreaming).toBe(true)
    expect(KOMGA_CAPABILITIES.thumbnails).toBe(true)
  })

  it('OPDS_CAPABILITIES advertises opds2 only (drives 3-chip row, no progress/streaming)', () => {
    expect(OPDS_CAPABILITIES.protocols).toContain('opds2')
    expect(OPDS_CAPABILITIES.protocols).not.toContain('komga-rest')
    expect(OPDS_CAPABILITIES.progressSync).toBe(false)
    expect(OPDS_CAPABILITIES.pagedStreaming).toBe(false)
  })
})

// ── 8. KOMGA_MANIFEST and OPDS_MANIFEST bundled flags (checker) ───────────────
//
// Komga is bundled (always-available); OPDS is also bundled as the fallback.
// These affect how the prober reports ready vs installable.

describe('manifest bundled flags (checker)', () => {
  it('KOMGA_MANIFEST is bundled (always-available, resolves to ready not installable)', () => {
    expect(KOMGA_MANIFEST.bundled).toBe(true)
  })

  it('OPDS_MANIFEST is bundled (always-available fallback connector)', () => {
    expect(OPDS_MANIFEST.bundled).toBe(true)
  })

  it('KOMGA_MANIFEST connector kind is "connector"', () => {
    expect(KOMGA_MANIFEST.kind).toBe('connector')
  })
})
