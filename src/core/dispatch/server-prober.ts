// Server Prober (core/dispatch) — the connector-agnostic detection layer behind "Add a source"
// (DESIGN §8.2 / §6.2). Given a URL it asks every installed connector's lightweight probe "is this
// your kind of server?", ranks the claims by confidence (ties broken toward the more SPECIALIZED
// connector, so a Komga server that also speaks OPDS is detected as Komga), and maps the result to
// the registry's three-state resolution — ready | installable | unsupported — plus an `unreachable`
// network outcome.
//
// Platform-neutral by construction: this module performs NO network or DOM access itself. Every
// request happens inside a `ConnectorProbeFn`, which reaches the host through the injected
// `HostBridge`. The future native (Kotlin) client re-expresses the same ranking logic over its own
// bridge (conformance) — an import-graph test guards that this file pulls in nothing from the
// platform, app, or plugin layers and touches no browser-only global.

import type { ConnectorCapabilities, HostBridge, PluginManifest } from '@/core/contracts'

/** A single connector's positive claim on a probed URL. */
export interface ConnectorProbeResult {
  /** The claiming connector's id (e.g. `connector-komga`). */
  connectorId: string
  /** The detected server kind (e.g. `komga`, `opds`). */
  kind: string
  /** 0..1 — how sure the connector is; the prober keeps the highest above {@link MIN_PROBE_CONFIDENCE}. */
  confidence: number
  /** Higher = more specialized; breaks confidence ties toward the specialist (Komga 2 > generic OPDS 1). */
  specificity: number
  /** What the detected server advertises — surfaced as capability chips without connecting/authing. */
  capabilities: ConnectorCapabilities
}

/**
 * Probe an arbitrary URL for one connector kind. The contract that lets the prober tell `unreachable`
 * from `unsupported`:
 * - REJECT (let the error propagate) when the server cannot be reached (transport/DNS failure) or the
 *   probe is cancelled — never swallow a network error into `null`.
 * - resolve `null` when the server RESPONDED but is not this connector's kind.
 * - resolve a {@link ConnectorProbeResult} when the connector positively identifies the server.
 * All I/O goes through {@link HostBridge.http}; the function performs no direct network or DOM access.
 */
export type ConnectorProbeFn = (
  url: string,
  host: HostBridge,
) => Promise<ConnectorProbeResult | null>

/** A connector the prober can consult: its manifest paired with its lightweight probe. */
export interface ProbeEntry {
  manifest: PluginManifest
  probe: ConnectorProbeFn
  /**
   * Marks a broad, best-effort probe that inspects whatever is at the pasted URL itself (rather than a
   * connector-specific path) — e.g. the bundled OPDS fallback, which sniffs the pasted URL's
   * `Content-Type` because a bare OPDS feed IS the pasted URL. Such a probe runs ONLY after every
   * non-fallback installed connector has had a chance to claim the URL, so it never fires an
   * exploratory request the detection didn't need. That matters because the request itself can be
   * user-visible noise: a server that scopes CORS to its API (e.g. Komga sends
   * `Access-Control-Allow-Origin` only on `/api/**`, never on `/`) turns a root-path probe into a red
   * console error even though a more specific installed connector already answered the detection.
   * Defaults to `false` — most connectors probe a dedicated, well-known endpoint and can run eagerly,
   * concurrently with every other non-fallback probe, exactly as before.
   */
  fallback?: boolean
}

/** The detected server a caller renders (name/id/capabilities) and then connects to. */
export interface DetectedServer {
  connectorId: string
  kind: string
  capabilities: ConnectorCapabilities
  manifest: PluginManifest
}

/**
 * The prober outcome — the registry's `Resolution` three states (carrying detection metadata rather
 * than a live instance, because the connector is built with credentials only at Connect) plus an
 * added `unreachable`. `installable` is a normal outcome (a cataloged-but-not-installed connector
 * claimed the URL), never an error.
 */
export type ProberOutcome =
  | { status: 'ready'; detected: DetectedServer }
  | { status: 'installable'; detected: DetectedServer }
  | { status: 'unsupported'; reason: string }
  | { status: 'unreachable'; reason: string }

export interface ServerProbeOptions {
  url: string
  host: HostBridge
  /** Installed connectors — a claim here resolves to `ready`. */
  installed: readonly ProbeEntry[]
  /** Cataloged-but-not-installed connectors — a claim here resolves to `installable` (a suggestion). */
  available?: readonly ProbeEntry[]
  /** Per-probe upper bound; a probe exceeding it is treated as unreachable for that connector. */
  timeoutMs?: number
  /** Minimum confidence for a claim to count toward detection. */
  minConfidence?: number
}

export const DEFAULT_PROBE_TIMEOUT_MS = 5000
export const MIN_PROBE_CONFIDENCE = 0.5

const UNREACHABLE_REASON =
  'Could not reach this address. Check the URL is correct and that the server allows this app origin (CORS).'
const UNSUPPORTED_REASON =
  'This address is reachable but is not a recognized library server or OPDS feed.'

interface Claim {
  entry: ProbeEntry
  result: ConnectorProbeResult
}

interface ProbeSweep {
  claims: Claim[]
  /** True when at least one probe RESPONDED (even with `null`) — i.e. the server was reachable. */
  reachable: boolean
}

/** Race a probe against a timeout so a slow/hostile URL never hangs the modal. setTimeout/clearTimeout
 *  are platform-neutral globals (no DOM, no fetch), so this stays re-expressible on the native client. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Probe timed out after ${ms}ms`)), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timer)
        reject(error instanceof Error ? error : new Error(String(error)))
      },
    )
  })
}

async function sweep(
  entries: readonly ProbeEntry[],
  url: string,
  host: HostBridge,
  timeoutMs: number,
): Promise<ProbeSweep> {
  const settled = await Promise.allSettled(
    entries.map((entry) => withTimeout(entry.probe(url, host), timeoutMs)),
  )
  const claims: Claim[] = []
  let reachable = false
  settled.forEach((outcome, index) => {
    if (outcome.status !== 'fulfilled') return // rejected = transport error / timeout = not reachable
    reachable = true // a response (even `null`) proves the server is reachable
    const entry = entries[index]
    if (outcome.value && entry) claims.push({ entry, result: outcome.value })
  })
  return { claims, reachable }
}

/** Highest confidence above the threshold wins; confidence ties break toward higher specificity. The
 *  prober never decides detection by connector ORDER alone (spec: confidence-ranked, specificity-broken). */
function pickBest(claims: readonly Claim[], minConfidence: number): Claim | undefined {
  return [...claims]
    .filter((claim) => claim.result.confidence >= minConfidence)
    .sort(
      (a, b) =>
        b.result.confidence - a.result.confidence || b.result.specificity - a.result.specificity,
    )[0]
}

function detect(claim: Claim): DetectedServer {
  return {
    connectorId: claim.result.connectorId,
    kind: claim.result.kind,
    capabilities: claim.result.capabilities,
    manifest: claim.entry.manifest,
  }
}

/**
 * Detect what kind of server (if any) lives at `url`. Probes every non-fallback installed connector
 * concurrently (confidence-ranked, specificity-broken — see {@link pickBest}) and returns the best
 * claim as `ready`. Only when NONE of them claims the URL does it sweep the installed connectors
 * marked {@link ProbeEntry.fallback} — broad, best-effort probes that inspect the pasted URL itself and
 * so should not fire until every dedicated-endpoint connector has had its say (see {@link ProbeEntry}).
 * If installed (eager or fallback) still finds nothing, it consults the available catalog for an
 * `installable` suggestion; otherwise reports `unsupported` (reachable but unrecognized) or
 * `unreachable` (no probe could reach the server). Probing the available catalog never loads a
 * connector's heavy chunk — only its lightweight bundled probe runs — so a suggestion costs nothing.
 */
export async function serverProbe(options: ServerProbeOptions): Promise<ProberOutcome> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_PROBE_TIMEOUT_MS
  const minConfidence = options.minConfidence ?? MIN_PROBE_CONFIDENCE

  const eagerEntries = options.installed.filter((entry) => !entry.fallback)
  const fallbackEntries = options.installed.filter((entry) => entry.fallback)

  const eagerSweep = await sweep(eagerEntries, options.url, options.host, timeoutMs)
  let reachable = eagerSweep.reachable
  let installedClaims = eagerSweep.claims

  // Only run the broad/fallback probes (e.g. the generic OPDS content-sniff of the raw pasted URL)
  // when no dedicated-endpoint connector already claimed it above the threshold — this is what keeps a
  // successful Komga connect from ever firing the doomed, CORS-less root-path request.
  if (!pickBest(installedClaims, minConfidence) && fallbackEntries.length > 0) {
    const fallbackSweep = await sweep(fallbackEntries, options.url, options.host, timeoutMs)
    reachable = reachable || fallbackSweep.reachable
    installedClaims = [...installedClaims, ...fallbackSweep.claims]
  }

  const installedBest = pickBest(installedClaims, minConfidence)
  if (installedBest) return { status: 'ready', detected: detect(installedBest) }

  const available = options.available ?? []
  if (available.length > 0) {
    const availableSweep = await sweep(available, options.url, options.host, timeoutMs)
    reachable = reachable || availableSweep.reachable
    const availableBest = pickBest(availableSweep.claims, minConfidence)
    if (availableBest) return { status: 'installable', detected: detect(availableBest) }
  }

  return reachable
    ? { status: 'unsupported', reason: UNSUPPORTED_REASON }
    : { status: 'unreachable', reason: UNREACHABLE_REASON }
}
