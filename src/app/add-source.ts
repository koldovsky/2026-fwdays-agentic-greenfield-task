// "Add a source" orchestration + presentation helpers (app layer). Bridges the platform-neutral
// server prober (core/dispatch) to the web app: it assembles a HostBridge, runs the prober over the
// bundled detection layer, and derives the maket's capability chips / protocol summary from the
// detected connector's capabilities (doc/web/05). Kept out of the .vue component so the derivation is
// pure and unit-testable, and so the component can mock probing without a network.

import type { ConnectorCapabilities } from '@/core/contracts'
import type { ProberOutcome } from '@/core/dispatch'
import { serverProbe } from '@/core/dispatch'
import { createWebPluginBridge } from '@/platform/web'
import { appRegistry } from '@/app/app-registry'
import { installedProbeEntries } from '@/app/plugins-catalog'

/** A capability rendered as a chip. `protocol` chips are neutral + monospace ("OPDS v2"); `feature`
 *  chips are the green-check capability pills ("Progress sync", "Search", …). */
export interface CapabilityChip {
  label: string
  kind: 'protocol' | 'feature'
}

/** Human protocol-summary fragments for the detected card ("opds v2 + rest"). */
const PROTOCOL_SUMMARY_LABELS: Readonly<Record<string, string>> = {
  opds1: 'opds v1',
  opds2: 'opds v2',
  'komga-rest': 'rest',
  'kavita-rest': 'rest',
}

/**
 * The maket renders plugin ids dot-separated (`connector.komga`); the runtime id is dash-separated
 * (`connector-komga`, the change-3 convention). Display-only transform — the runtime id is unchanged.
 */
export function toDisplayConnectorId(connectorId: string): string {
  return connectorId.replace(/-/g, '.')
}

/** The detected card's protocol summary, e.g. `['opds2','komga-rest']` → "opds v2 + rest". */
export function protocolSummary(capabilities: ConnectorCapabilities): string {
  const labels = capabilities.protocols.map(
    (protocol) => PROTOCOL_SUMMARY_LABELS[protocol] ?? protocol,
  )
  // De-dupe while preserving order (komga-rest + kavita-rest would both map to "rest").
  return [...new Set(labels)].join(' + ')
}

/**
 * Derive the CAPABILITIES chip row from what the detected connector advertises (NOT hard-coded). One
 * interop-protocol chip (native REST is implied and shown in the card's summary) followed by the
 * boolean feature chips. For Komga this yields exactly the maket's five chips; a bare OPDS feed yields
 * fewer (doc/web/05).
 */
export function capabilityChips(capabilities: ConnectorCapabilities): CapabilityChip[] {
  const chips: CapabilityChip[] = []
  if (capabilities.protocols.includes('opds2')) chips.push({ label: 'OPDS v2', kind: 'protocol' })
  else if (capabilities.protocols.includes('opds1'))
    chips.push({ label: 'OPDS v1', kind: 'protocol' })
  if (capabilities.progressSync) chips.push({ label: 'Progress sync', kind: 'feature' })
  if (capabilities.search) chips.push({ label: 'Search', kind: 'feature' })
  if (capabilities.pagedStreaming) chips.push({ label: 'Page streaming', kind: 'feature' })
  if (capabilities.thumbnails) chips.push({ label: 'Thumbnails', kind: 'feature' })
  return chips
}

const PROBER_BRIDGE_ID = 'server-prober'

/**
 * Probe a pasted URL for a known server kind. Assembles a first-party detection HostBridge (any-origin
 * network — the user types arbitrary URLs; CORS stays a host concern) and runs the prober over the
 * registry's installed connectors. All HTTP happens inside the connectors' probes via the bridge.
 */
export async function probeServer(url: string): Promise<ProberOutcome> {
  const host = createWebPluginBridge(PROBER_BRIDGE_ID, { permissions: { network: ['*'] } })
  return serverProbe({ url, host, installed: installedProbeEntries(appRegistry()) })
}
